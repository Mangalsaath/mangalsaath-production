import { config } from "@/lib/config";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizeIndianMobile } from "@/lib/security";
import { isAdminRole } from "@/lib/roles";

function uid(prefix) { return `${prefix}_${crypto.randomBytes(8).toString("hex")}`; }

export function relationalAuthEnabled() {
  return config.storage.auth === "relational";
}

export function toAppUser(user) {
  if (!user) return null;
  const { profile, ...record } = user;
  return {
    ...record,
    profileId: profile?.id || user.profileId || null,
    lockedUntil: user.lockedUntil?.toISOString?.() || user.lockedUntil || null,
    termsAcceptedAt: user.termsAcceptedAt?.toISOString?.() || user.termsAcceptedAt || null,
    passwordChangedAt: user.passwordChangedAt?.toISOString?.() || user.passwordChangedAt || null,
    createdAt: user.createdAt?.toISOString?.() || user.createdAt,
    updatedAt: user.updatedAt?.toISOString?.() || user.updatedAt
  };
}

export async function findRelationalUser(identifier) {
  const raw = String(identifier || "").trim();
  if (!raw) return null;
  const emailOrUsername = raw.toLowerCase();
  const mobile = normalizeIndianMobile(raw);
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: emailOrUsername },
        { username: emailOrUsername },
        ...(mobile ? [{ mobile }] : [])
      ]
    },
    include: { profile: { select: { id: true } } }
  });
}

export async function findRelationalUserById(id) {
  return prisma.user.findUnique({ where: { id: String(id) }, include: { profile: { select: { id: true } } } });
}

export async function relationalIdentityExists(email, mobile) {
  return prisma.user.findFirst({
    where: { OR: [{ email: String(email).toLowerCase() }, { mobile: normalizeIndianMobile(mobile) }] },
    select: { id: true }
  });
}

export async function updateRelationalUser(id, data) {
  const allowed = {};
  for (const key of ["passwordHash","failedLoginAttempts","lockedUntil","passwordChangedAt","status","lastLoginAt","emailVerified","mobileVerified","verified","mustChangePassword"]) {
    if (Object.prototype.hasOwnProperty.call(data, key)) allowed[key] = data[key];
  }
  // lastLoginAt is not yet a relational column; ignore until the profile cutover schema expansion.
  delete allowed.lastLoginAt;
  return prisma.user.update({ where: { id }, data: allowed });
}

export async function createRelationalMember({ user, profile }) {
  return prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobile: normalizeIndianMobile(user.mobile),
        passwordHash: user.passwordHash,
        role: user.role || "member",
        status: user.status || "active",
        membership: user.membership || "Free",
        membershipPlanId: user.membershipPlanId || "free",
        mobileVerified: user.mobileVerified === true,
        emailVerified: user.emailVerified === true,
        verified: user.verified === true,
        failedLoginAttempts: Number(user.failedLoginAttempts || 0),
        termsAcceptedAt: user.termsAcceptedAt ? new Date(user.termsAcceptedAt) : null
      }
    });
    await tx.memberProfile.create({
      data: {
        id: profile.id,
        userId: user.id,
        name: profile.name,
        gender: profile.gender || null,
        age: profile.age || null,
        maritalStatus: profile.maritalStatus || null,
        religion: profile.religion || null,
        caste: profile.caste || null,
        country: profile.country || "India",
        city: profile.city || null,
        about: profile.about || null,
        partnerAgeMin: Number(profile.partnerAgeMin || 18),
        partnerAgeMax: Number(profile.partnerAgeMax || 60),
        photos: profile.photos || [],
        primaryPhoto: profile.primaryPhoto || null,
        score: Number(profile.score || 0),
        verified: profile.verified === true,
        verificationStatus: profile.verificationStatus || "not-requested",
        trustedProfile: profile.trustedProfile === true,
        initials: profile.initials || null
      }
    });
    return createdUser;
  });
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function requestMeta(request) {
  return {
    ip: request ? ((request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "").split(",")[0].trim().slice(0, 100)) : "",
    userAgent: request ? String(request.headers.get("user-agent") || "").slice(0, 500) : ""
  };
}

export async function createRelationalSession(user, request = null, options = {}) {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  const minutes = isAdminRole(user.role) ? Number(options.adminSessionMinutes || 30) : 7 * 24 * 60;
  const meta = requestMeta(request);
  await prisma.$transaction(async (tx) => {
    const active = await tx.sessionRecord.findMany({
      where: { userId: user.id, expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      skip: 4,
      select: { id: true }
    });
    if (active.length) await tx.sessionRecord.deleteMany({ where: { id: { in: active.map((item) => item.id) } } });
    await tx.sessionRecord.create({
      data: {
        id: uid("session"), userId: user.id, tokenHash: tokenHash(token), ip: meta.ip,
        userAgent: meta.userAgent, adminDualOtpVerified: isAdminRole(user.role) ? options.adminDualOtpVerified === true : false,
        expiresAt: new Date(now.getTime() + minutes * 60_000)
      }
    });
  });
  return token;
}

export async function getRelationalSession(request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  const session = await prisma.sessionRecord.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: { include: { profile: { select: { id: true } } } } }
  });
  if (!session || session.expiresAt <= new Date()) return null;
  if (isAdminRole(session.user.role) && session.adminDualOtpVerified !== true) return null;
  // Touch at most once every five minutes to avoid a write on every request.
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60_000) {
    prisma.sessionRecord.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }
  return { session, user: toAppUser(session.user), token };
}

export async function revokeRelationalSession(request, allDevices = false) {
  const result = await getRelationalSession(request);
  if (!result?.user) return false;
  if (allDevices) await prisma.sessionRecord.deleteMany({ where: { userId: result.user.id } });
  else await prisma.sessionRecord.delete({ where: { id: result.session.id } }).catch(() => undefined);
  return true;
}

export async function revokeAllRelationalSessions(userId) {
  await prisma.sessionRecord.deleteMany({ where: { userId } });
}
