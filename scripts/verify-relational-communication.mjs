import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
try {
  const state = await prisma.applicationState.findUnique({ where: { id: 1 } });
  const legacy = state?.payload || {};
  const [interests, messages, orphanInterests, orphanMessages] = await Promise.all([
    prisma.interestRecord.count(), prisma.messageRecord.count(),
    prisma.interestRecord.count({ where: { OR: [{ sender: null }, { recipient: null }] } }).catch(() => 0),
    prisma.messageRecord.count({ where: { OR: [{ sender: null }, { recipient: null }] } }).catch(() => 0)
  ]);
  const expectedInterests = Array.isArray(legacy.interests) ? legacy.interests.length : 0;
  const expectedMessages = Array.isArray(legacy.messages) ? legacy.messages.length : 0;
  console.log(JSON.stringify({ expectedInterests, interests, expectedMessages, messages, orphanInterests, orphanMessages }, null, 2));
  if (interests < expectedInterests || messages < expectedMessages || orphanInterests || orphanMessages) process.exitCode = 1;
} finally { await prisma.$disconnect(); }
