import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const runId = `relmig_${crypto.randomBytes(8).toString("hex")}`;
const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const stringOrNull = (value) => value === undefined || value === null || value === "" ? null : String(value);
const intOrNull = (value) => Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : null;

async function main() {
  const state = await prisma.applicationState.findUnique({ where: { id: 1 } });
  if (!state) throw new Error("application_state row 1 does not exist. Run the application once or restore a backup first.");
  const db = state.payload && typeof state.payload === "object" ? state.payload : {};
  const users = Array.isArray(db.users) ? db.users : [];
  const profiles = Array.isArray(db.profiles) ? db.profiles : [];
  const sessions = Array.isArray(db.sessions) ? db.sessions : [];
  const interests = Array.isArray(db.interests) ? db.interests : [];
  const messages = Array.isArray(db.messages) ? db.messages : [];
  const blocks = Array.isArray(db.blocks) ? db.blocks : [];
  const reports = Array.isArray(db.reports) ? db.reports : [];
  const counts = { users: users.length, profiles: profiles.length, sessions: sessions.length, interests: interests.length, messages: messages.length, blocks: blocks.length, reports: reports.length };

  await prisma.relationalMigrationRun.create({ data: { id: runId, sourceVersion: state.version, status: "running", counts } });
  try {
    await prisma.$transaction(async (tx) => {
      for (const user of users) {
        if (!user?.id || !user?.email || !user?.mobile || !user?.passwordHash) continue;
        await tx.user.upsert({
          where: { id: String(user.id) },
          create: {
            id: String(user.id), username: stringOrNull(user.username), firstName: String(user.firstName || ""), lastName: String(user.lastName || ""),
            email: String(user.email).trim().toLowerCase(), mobile: String(user.mobile), passwordHash: String(user.passwordHash), role: String(user.role || "member"),
            status: String(user.status || "active"), city: stringOrNull(user.city), profession: stringOrNull(user.profession), membership: String(user.membership || "Free"),
            membershipPlanId: String(user.membershipPlanId || "free"), mobileVerified: user.mobileVerified === true, emailVerified: user.emailVerified === true,
            verified: user.verified === true, mustChangePassword: user.mustChangePassword === true, failedLoginAttempts: intOrNull(user.failedLoginAttempts) || 0,
            lockedUntil: asDate(user.lockedUntil), termsAcceptedAt: asDate(user.termsAcceptedAt), passwordChangedAt: asDate(user.passwordChangedAt), createdAt: asDate(user.createdAt) || new Date()
          },
          update: {
            username: stringOrNull(user.username), firstName: String(user.firstName || ""), lastName: String(user.lastName || ""), email: String(user.email).trim().toLowerCase(),
            mobile: String(user.mobile), passwordHash: String(user.passwordHash), role: String(user.role || "member"), status: String(user.status || "active"),
            city: stringOrNull(user.city), profession: stringOrNull(user.profession), membership: String(user.membership || "Free"), membershipPlanId: String(user.membershipPlanId || "free"),
            mobileVerified: user.mobileVerified === true, emailVerified: user.emailVerified === true, verified: user.verified === true, mustChangePassword: user.mustChangePassword === true,
            failedLoginAttempts: intOrNull(user.failedLoginAttempts) || 0, lockedUntil: asDate(user.lockedUntil), termsAcceptedAt: asDate(user.termsAcceptedAt), passwordChangedAt: asDate(user.passwordChangedAt)
          }
        });
      }

      const validUserIds = new Set(users.map((u) => String(u?.id || "")).filter(Boolean));
      for (const profile of profiles) {
        if (!profile?.id || !profile?.userId || !validUserIds.has(String(profile.userId))) continue;
        const data = {
          userId: String(profile.userId), name: String(profile.name || "Member"), gender: stringOrNull(profile.gender), dateOfBirth: asDate(profile.dateOfBirth), age: intOrNull(profile.age),
          maritalStatus: stringOrNull(profile.maritalStatus), height: intOrNull(profile.height), religion: stringOrNull(profile.religion), caste: stringOrNull(profile.caste),
          subCaste: stringOrNull(profile.subCaste), gotra: stringOrNull(profile.gotra), education: stringOrNull(profile.education), profession: stringOrNull(profile.profession),
          country: stringOrNull(profile.country), state: stringOrNull(profile.state), city: stringOrNull(profile.city), about: stringOrNull(profile.about),
          partnerAgeMin: intOrNull(profile.partnerAgeMin) || 18, partnerAgeMax: intOrNull(profile.partnerAgeMax) || 60, partnerReligion: stringOrNull(profile.partnerReligion),
          partnerCaste: stringOrNull(profile.partnerCaste), partnerLocation: stringOrNull(profile.partnerLocation), partnerMaritalStatus: stringOrNull(profile.partnerMaritalStatus),
          partnerEducation: stringOrNull(profile.partnerEducation), partnerProfession: stringOrNull(profile.partnerProfession), photos: Array.isArray(profile.photos) ? profile.photos : [],
          primaryPhoto: stringOrNull(profile.primaryPhoto), primaryPhotoData: stringOrNull(profile.primaryPhotoData), photoModerationStatus: stringOrNull(profile.photoModerationStatus),
          photoModerationNote: stringOrNull(profile.photoModerationNote), score: intOrNull(profile.score) || 0, verified: profile.verified === true,
          verificationStatus: String(profile.verificationStatus || "not-requested"), trustedProfile: profile.trustedProfile === true, initials: stringOrNull(profile.initials),
          createdAt: asDate(profile.createdAt) || new Date()
        };
        await tx.memberProfile.upsert({ where: { id: String(profile.id) }, create: { id: String(profile.id), ...data }, update: data });
      }

      for (const session of sessions) {
        if (!session?.id || !session?.userId || !validUserIds.has(String(session.userId))) continue;
        const tokenHash = session.tokenHash || (session.token ? crypto.createHash("sha256").update(String(session.token)).digest("hex") : null);
        if (!tokenHash) continue;
        const data = { userId: String(session.userId), tokenHash: String(tokenHash), ip: stringOrNull(session.ip), userAgent: stringOrNull(session.userAgent), adminDualOtpVerified: session.adminDualOtpVerified === true, createdAt: asDate(session.createdAt) || new Date(), lastSeenAt: asDate(session.lastSeenAt) || asDate(session.createdAt) || new Date(), expiresAt: asDate(session.expiresAt) || new Date(0) };
        await tx.sessionRecord.upsert({ where: { id: String(session.id) }, create: { id: String(session.id), ...data }, update: data });
      }

      for (const interest of interests) {
        if (!interest?.id || !validUserIds.has(String(interest.fromUserId)) || !validUserIds.has(String(interest.toUserId))) continue;
        const data = { fromUserId: String(interest.fromUserId), toUserId: String(interest.toUserId), profileId: stringOrNull(interest.profileId), status: String(interest.status || "Pending"), createdAt: asDate(interest.createdAt) || new Date(), updatedAt: asDate(interest.updatedAt) || asDate(interest.createdAt) || new Date() };
        await tx.interestRecord.upsert({ where: { id: String(interest.id) }, create: { id: String(interest.id), ...data }, update: data });
      }

      for (const message of messages) {
        if (!message?.id || !validUserIds.has(String(message.fromUserId)) || !validUserIds.has(String(message.toUserId))) continue;
        const data = { fromUserId: String(message.fromUserId), toUserId: String(message.toUserId), profileId: stringOrNull(message.profileId), text: String(message.text || ""), read: message.read === true, readAt: asDate(message.readAt), createdAt: asDate(message.createdAt) || new Date(), updatedAt: asDate(message.updatedAt) || asDate(message.createdAt) || new Date() };
        await tx.messageRecord.upsert({ where: { id: String(message.id) }, create: { id: String(message.id), ...data }, update: data });
      }

      for (const block of blocks) {
        if (!block?.id || !validUserIds.has(String(block.blockerUserId)) || !validUserIds.has(String(block.blockedUserId))) continue;
        const data = { blockerUserId: String(block.blockerUserId), blockedUserId: String(block.blockedUserId), active: block.active !== false, createdAt: asDate(block.createdAt) || new Date(), updatedAt: asDate(block.updatedAt) || asDate(block.createdAt) || new Date() };
        await tx.blockRecord.upsert({ where: { id: String(block.id) }, create: { id: String(block.id), ...data }, update: data });
      }

      for (const report of reports) {
        if (!report?.id || !validUserIds.has(String(report.reporterUserId)) || !validUserIds.has(String(report.targetUserId))) continue;
        const data = { reporterUserId: String(report.reporterUserId), targetUserId: String(report.targetUserId), targetProfileId: stringOrNull(report.targetProfileId), category: String(report.category || "other"), details: String(report.details || ""), status: String(report.status || "open"), reviewedAt: asDate(report.reviewedAt), reviewedBy: stringOrNull(report.reviewedBy), resolutionNote: stringOrNull(report.resolutionNote), createdAt: asDate(report.createdAt) || new Date() };
        await tx.reportRecord.upsert({ where: { id: String(report.id) }, create: { id: String(report.id), ...data }, update: data });
      }
    }, { timeout: 120000 });
    await prisma.relationalMigrationRun.update({ where: { id: runId }, data: { status: "completed", completedAt: new Date() } });
    console.log(JSON.stringify({ ok: true, runId, sourceVersion: state.version, counts }, null, 2));
  } catch (error) {
    await prisma.relationalMigrationRun.update({ where: { id: runId }, data: { status: "failed", completedAt: new Date(), errorMessage: String(error?.stack || error).slice(0, 10000) } }).catch(() => undefined);
    throw error;
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
