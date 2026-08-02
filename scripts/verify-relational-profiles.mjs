import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
try {
  const state = await prisma.applicationState.findUnique({ where: { id: 1 } });
  const legacy = Array.isArray(state?.payload?.profiles) ? state.payload.profiles : [];
  const relational = await prisma.memberProfile.findMany({ select: { id: true, userId: true, name: true, photos: true } });
  const ids = new Set(relational.map((profile) => profile.id));
  const userIds = new Set(relational.map((profile) => profile.userId));
  const missingProfileIds = legacy.filter((profile) => profile?.id && !ids.has(String(profile.id))).map((profile) => profile.id);
  const duplicateUserProfiles = relational.length - userIds.size;
  const invalidPhotos = relational.filter((profile) => profile.photos !== null && !Array.isArray(profile.photos)).map((profile) => profile.id);
  console.log(JSON.stringify({ legacyProfiles: legacy.length, relationalProfiles: relational.length, missingProfileIds, duplicateUserProfiles, invalidPhotos, ready: missingProfileIds.length === 0 && duplicateUserProfiles === 0 && invalidPhotos.length === 0 }, null, 2));
} finally {
  await prisma.$disconnect();
}
