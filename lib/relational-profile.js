import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { isMemberRole } from "@/lib/roles";
import { allocateMangalNumber } from "@/lib/mangalsaath-id";

export function relationalProfileEnabled() {
  return config.storage.profile !== "legacy";
}

export function toApplicationProfile(record) {
  if (!record) return null;
  const { user, ...profile } = record;
  return {
    ...profile,
    dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString().slice(0, 10) : "",
    createdAt: profile.createdAt?.toISOString?.() || profile.createdAt,
    updatedAt: profile.updatedAt?.toISOString?.() || profile.updatedAt,
    photos: Array.isArray(profile.photos) ? profile.photos : [],
    firstName: user?.firstName || "",
    lastName: user?.lastName || ""
  };
}

export function toApplicationUser(user) {
  if (!user) return null;
  return {
    ...user,
    createdAt: user.createdAt?.toISOString?.() || user.createdAt,
    updatedAt: user.updatedAt?.toISOString?.() || user.updatedAt,
    lockedUntil: user.lockedUntil?.toISOString?.() || user.lockedUntil,
    termsAcceptedAt: user.termsAcceptedAt?.toISOString?.() || user.termsAcceptedAt,
    passwordChangedAt: user.passwordChangedAt?.toISOString?.() || user.passwordChangedAt
  };
}

export async function findProfileById(id) {
  const record = await prisma.memberProfile.findUnique({ where: { id }, include: { user: true } });
  return record ? { profile: toApplicationProfile(record), user: toApplicationUser(record.user) } : null;
}

export async function findProfileByUserId(userId) {
  const record = await prisma.memberProfile.findUnique({ where: { userId }, include: { user: true } });
  return record ? { profile: toApplicationProfile(record), user: toApplicationUser(record.user) } : null;
}

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const nullable = (value) => value === undefined || value === null || String(value).trim() === "" ? null : String(value).trim();
const integer = (value, fallback = null) => Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback;

// Backward compatibility for members created before the relational profile cutover.
// This is intentionally create-only: existing relational profile data is never
// overwritten by a potentially stale compatibility/legacy record.
export async function ensureRelationalProfile(userId, legacyProfile = null) {
  const existing = await findProfileByUserId(userId);
  if (existing) return existing;

  const user = await prisma.user.findUnique({ where: { id: String(userId) } });
  if (!user || !isMemberRole(user.role)) return null;
  const source = legacyProfile && String(legacyProfile.userId) === String(userId) ? legacyProfile : {};
  const fullName = String(source.name || `${user.firstName || ""} ${user.lastName || ""}`).trim() || "Member";

  try {
    const record = await prisma.$transaction(async (tx) => {
      const mangalNumber = await allocateMangalNumber(tx, false);
      return tx.memberProfile.create({
        data: {
          id: source.id ? String(source.id) : `profile_${crypto.randomBytes(8).toString("hex")}`,
          mangalNumber,
          userId: user.id,
          name: fullName,
          gender: nullable(source.gender), dateOfBirth: asDate(source.dateOfBirth), placeOfBirth: nullable(source.placeOfBirth), timeOfBirth: nullable(source.timeOfBirth), age: integer(source.age),
          maritalStatus: nullable(source.maritalStatus), height: integer(source.height), religion: nullable(source.religion),
          caste: nullable(source.caste), subCaste: nullable(source.subCaste), gotra: nullable(source.gotra),
          education: nullable(source.education), profession: nullable(source.profession || user.profession), annualCtc: nullable(source.annualCtc),
          brothersMarried: integer(source.brothersMarried, 0), brothersUnmarried: integer(source.brothersUnmarried, 0),
          sistersMarried: integer(source.sistersMarried, 0), sistersUnmarried: integer(source.sistersUnmarried, 0),
          country: nullable(source.country) || "India", state: nullable(source.state), city: nullable(source.city || user.city), about: nullable(source.about),
          partnerAgeMin: integer(source.partnerAgeMin, 18), partnerAgeMax: integer(source.partnerAgeMax, 60),
          partnerReligion: nullable(source.partnerReligion), partnerCaste: nullable(source.partnerCaste), partnerLocation: nullable(source.partnerLocation),
          partnerMaritalStatus: nullable(source.partnerMaritalStatus), partnerEducation: nullable(source.partnerEducation), partnerProfession: nullable(source.partnerProfession),
          photos: Array.isArray(source.photos) ? source.photos : [], primaryPhoto: nullable(source.primaryPhoto),
          primaryPhotoData: nullable(source.primaryPhotoData), photoModerationStatus: nullable(source.photoModerationStatus) || "not-submitted",
          photoModerationNote: nullable(source.photoModerationNote), score: integer(source.score, 0), verified: source.verified === true,
          verificationStatus: String(source.verificationStatus || "not-requested"), trustedProfile: source.trustedProfile === true,
          initials: nullable(source.initials) || fullName.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase(),
          createdAt: asDate(source.createdAt) || new Date()
        },
        include: { user: true }
      });
    });
    return { profile: toApplicationProfile(record), user: toApplicationUser(record.user) };
  } catch (error) {
    // Two simultaneous dashboard requests may race to repair the same profile.
    if (error?.code === "P2002") return findProfileByUserId(userId);
    throw error;
  }
}

export async function updateRelationalProfile(userId, values) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.memberProfile.findUnique({ where: { userId }, include: { user: true } });
    if (!existing) return null;
    const profile = await tx.memberProfile.update({
      where: { userId },
      data: values.profile,
      include: { user: true }
    });
    if (values.user) {
      const user = await tx.user.update({ where: { id: userId }, data: values.user });
      profile.user = user;
    }
    return { profile: toApplicationProfile(profile), user: toApplicationUser(profile.user) };
  });
}
