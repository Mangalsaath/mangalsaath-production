import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const GUARD_KEY = "mangalIdDualSeriesBackfillV1";
const AI_COUNTER_KEY = "mangalIdCounterAiV1";
const REAL_COUNTER_KEY = "mangalIdCounterRealV1";
const AI_FIRST = 1001;
const AI_LAST = 9999;
const REAL_FIRST = 10001;

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function byCreatedThenId(a, b) {
  const time = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  return time || String(a.id).localeCompare(String(b.id));
}

async function applyAssignments(assignments) {
  const chunkSize = 200;
  for (let start = 0; start < assignments.length; start += chunkSize) {
    const chunk = assignments.slice(start, start + chunkSize);
    if (!chunk.length) continue;
    const cases = chunk.map(({ id, number }) => `WHEN ${sqlString(id)} THEN ${number}`).join(" ");
    const ids = chunk.map(({ id }) => sqlString(id)).join(",");
    await prisma.$executeRawUnsafe(
      `UPDATE member_profiles SET mangalNumber = CASE id ${cases} ELSE mangalNumber END WHERE id IN (${ids})`,
    );
  }
}

async function upsertCounter(key, profileType, revision) {
  await prisma.businessSetting.upsert({
    where: { key },
    create: {
      id: `setting_${key}`,
      key,
      category: "system",
      value: {
        purpose: "Permanent Mangalsaath profile ID counter",
        profileType,
      },
      isSecret: false,
      revision,
    },
    update: {
      value: {
        purpose: "Permanent Mangalsaath profile ID counter",
        profileType,
      },
      revision,
    },
  });
}

async function main() {
  const guard = await prisma.businessSetting.findUnique({
    where: { key: GUARD_KEY },
    select: { id: true },
  });
  if (guard) {
    console.log("[Mangal ID] Dual-series backfill already completed; skipping.");
    return;
  }

  const profiles = await prisma.memberProfile.findMany({
    select: { id: true, isDemoProfile: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const aiProfiles = profiles.filter((item) => item.isDemoProfile === true);
  const realProfiles = profiles.filter((item) => item.isDemoProfile !== true).sort(byCreatedThenId);

  if (aiProfiles.length > AI_LAST - AI_FIRST + 1) {
    throw new Error("AI profile count exceeds the reserved MANGAL1001-MANGAL9999 range.");
  }

  const aiAssignments = [];
  const usedAiNumbers = new Set();
  const unnumberedAi = [];

  for (const profile of aiProfiles) {
    const match = /^demo_profile_(\d+)$/.exec(String(profile.id));
    const sequence = match ? Number(match[1]) : null;
    const preferred = Number.isInteger(sequence) ? 1000 + sequence : null;
    if (preferred && preferred >= AI_FIRST && preferred <= AI_LAST && !usedAiNumbers.has(preferred)) {
      aiAssignments.push({ id: profile.id, number: preferred });
      usedAiNumbers.add(preferred);
    } else {
      unnumberedAi.push(profile);
    }
  }

  let nextAi = AI_FIRST;
  for (const profile of unnumberedAi.sort(byCreatedThenId)) {
    while (usedAiNumbers.has(nextAi)) nextAi += 1;
    if (nextAi > AI_LAST) throw new Error("AI Mangal ID range exhausted during backfill.");
    aiAssignments.push({ id: profile.id, number: nextAi });
    usedAiNumbers.add(nextAi);
    nextAi += 1;
  }

  const realAssignments = realProfiles.map((profile, index) => ({
    id: profile.id,
    number: REAL_FIRST + index,
  }));

  // Move current auto-generated values out of both target ranges first. This keeps
  // the unique index valid while existing rows are reassigned in a handful of
  // bulk updates instead of hundreds of individual database calls.
  if (profiles.length) {
    await prisma.$executeRawUnsafe("UPDATE member_profiles SET mangalNumber = mangalNumber + 1000000");
    await applyAssignments(aiAssignments);
    await applyAssignments(realAssignments);
  }

  const maxAi = aiAssignments.reduce((max, item) => Math.max(max, item.number), 1000);
  const maxReal = realAssignments.reduce((max, item) => Math.max(max, item.number), 10000);
  await upsertCounter(AI_COUNTER_KEY, "ai", maxAi);
  await upsertCounter(REAL_COUNTER_KEY, "real", maxReal);

  await prisma.businessSetting.create({
    data: {
      id: `setting_${GUARD_KEY}`,
      key: GUARD_KEY,
      category: "system",
      value: {
        completedAt: new Date().toISOString(),
        aiProfiles: aiAssignments.length,
        realProfiles: realAssignments.length,
        aiRange: aiAssignments.length ? `MANGAL${Math.min(...aiAssignments.map((item) => item.number))}-MANGAL${maxAi}` : null,
        realRange: realAssignments.length ? `MANGAL${REAL_FIRST}-MANGAL${maxReal}` : null,
      },
      isSecret: false,
    },
  });

  console.log(`[Mangal ID] Assigned ${aiAssignments.length} AI profile IDs from MANGAL1001 and ${realAssignments.length} real profile IDs from MANGAL10001.`);
}

main()
  .catch((error) => {
    console.error("[Mangal ID] Dual-series backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
