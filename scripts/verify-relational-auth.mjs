import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
try {
  const state = await prisma.applicationState.findUnique({ where: { id: 1 } });
  const legacyUsers = Array.isArray(state?.payload?.users) ? state.payload.users : [];
  const relationalUsers = await prisma.user.findMany({ select: { id: true, email: true, mobile: true } });
  const missing = legacyUsers.filter((u) => !relationalUsers.some((r) => r.id === u.id));
  const duplicateEmails = relationalUsers.length - new Set(relationalUsers.map((u) => u.email.toLowerCase())).size;
  const duplicateMobiles = relationalUsers.length - new Set(relationalUsers.map((u) => u.mobile)).size;
  console.log(JSON.stringify({ legacyUsers: legacyUsers.length, relationalUsers: relationalUsers.length, missingUserIds: missing.map((u) => u.id), duplicateEmails, duplicateMobiles, ready: missing.length === 0 && duplicateEmails === 0 && duplicateMobiles === 0 }, null, 2));
  if (missing.length || duplicateEmails || duplicateMobiles) process.exitCode = 1;
} finally { await prisma.$disconnect(); }
