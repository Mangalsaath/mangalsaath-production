import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const state = await prisma.applicationState.findUnique({ where: { id: 1 } });
  if (!state) throw new Error("application_state row 1 was not found.");
  const db = state.payload && typeof state.payload === "object" ? state.payload : {};
  const expected = {
    users: Array.isArray(db.users) ? db.users.length : 0,
    profiles: Array.isArray(db.profiles) ? db.profiles.length : 0,
    sessions: Array.isArray(db.sessions) ? db.sessions.filter((s) => s?.id && s?.userId && (s?.tokenHash || s?.token)).length : 0,
    interests: Array.isArray(db.interests) ? db.interests.length : 0,
    messages: Array.isArray(db.messages) ? db.messages.length : 0,
    blocks: Array.isArray(db.blocks) ? db.blocks.length : 0,
    reports: Array.isArray(db.reports) ? db.reports.length : 0
  };
  const actual = {
    users: await prisma.user.count(), profiles: await prisma.memberProfile.count(), sessions: await prisma.sessionRecord.count(),
    interests: await prisma.interestRecord.count(), messages: await prisma.messageRecord.count(), blocks: await prisma.blockRecord.count(), reports: await prisma.reportRecord.count()
  };
  const differences = Object.fromEntries(Object.keys(expected).filter((key) => expected[key] !== actual[key]).map((key) => [key, { expected: expected[key], actual: actual[key] }]));
  const orphanProfiles = await prisma.memberProfile.count({ where: { user: null } }).catch(() => 0);
  const result = { ok: Object.keys(differences).length === 0 && orphanProfiles === 0, sourceVersion: state.version, expected, actual, differences, orphanProfiles };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 2;
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
