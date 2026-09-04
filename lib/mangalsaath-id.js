const AI_MIN = 1001;
const AI_MAX = 9999;
const REAL_MIN = 10001;

export function mangalsaathIdForProfile(profileOrNumber) {
  const rawNumber = typeof profileOrNumber === "object"
    ? profileOrNumber?.mangalNumber
    : profileOrNumber;
  const number = Number(rawNumber);
  if (!Number.isInteger(number) || number < AI_MIN) return "";
  return `MANGAL${number}`;
}

export function isMangalsaathId(value) {
  const match = /^MANGAL(\d{4,})$/i.exec(String(value || "").trim());
  if (!match) return false;
  const number = Number(match[1]);
  return (number >= AI_MIN && number <= AI_MAX) || number >= REAL_MIN;
}

export function normalizeMangalsaathId(value) {
  const text = String(value || "").trim().toUpperCase();
  return isMangalsaathId(text) ? text : "";
}

export function mangalNumberFromId(value) {
  const normalized = normalizeMangalsaathId(value);
  if (!normalized) return null;
  const number = Number(normalized.slice(6));
  return Number.isInteger(number) ? number : null;
}

export function mangalIdType(value) {
  const number = mangalNumberFromId(value);
  if (!number) return null;
  if (number >= AI_MIN && number <= AI_MAX) return "ai";
  if (number >= REAL_MIN) return "real";
  return null;
}

export async function allocateMangalNumber(tx, isDemoProfile) {
  const isAi = isDemoProfile === true;
  const key = isAi ? "mangalIdCounterAiV1" : "mangalIdCounterRealV1";
  const base = isAi ? 1000 : 10000;

  await tx.businessSetting.upsert({
    where: { key },
    create: {
      id: `setting_${key}`,
      key,
      category: "system",
      value: {
        purpose: "Permanent Mangalsaath profile ID counter",
        profileType: isAi ? "ai" : "real",
      },
      isSecret: false,
      revision: base,
    },
    update: {},
  });

  await tx.$executeRawUnsafe(
    "UPDATE business_settings SET revision = LAST_INSERT_ID(revision + 1) WHERE `key` = ?",
    key,
  );
  const rows = await tx.$queryRawUnsafe("SELECT LAST_INSERT_ID() AS value");
  const next = Number(rows?.[0]?.value);
  if (!Number.isInteger(next) || next <= base) {
    throw new Error("Unable to allocate Mangalsaath ID number.");
  }
  if (isAi && next > AI_MAX) {
    throw new Error("AI Mangal ID range MANGAL1001-MANGAL9999 is exhausted.");
  }
  return next;
}

export function withMangalsaathId(profile) {
  if (!profile) return profile;
  return { ...profile, mangalsaathId: mangalsaathIdForProfile(profile) };
}
