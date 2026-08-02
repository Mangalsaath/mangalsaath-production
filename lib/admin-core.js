import { config } from "@/lib/config";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { invalidateSystemSettingsCache } from "@/lib/settings-service";

export const ADMIN_STORAGE_MODE = config.storage.admin;
export const useRelationalAdmin = () => ADMIN_STORAGE_MODE !== "legacy";

const id = (prefix) => `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
const iso = (value) => value instanceof Date ? value.toISOString() : value || null;

export function publicAdminUser(user) {
  if (!user) return null;
  const { passwordHash, failedLoginAttempts, lockedUntil, ...safe } = user;
  return {
    ...safe,
    createdAt: iso(safe.createdAt),
    updatedAt: iso(safe.updatedAt),
    profile: user.profile ? {
      ...user.profile,
      dateOfBirth: iso(user.profile.dateOfBirth),
      createdAt: iso(user.profile.createdAt),
      updatedAt: iso(user.profile.updatedAt)
    } : null
  };
}

export async function getRelationalAdminDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [
    usersCount, profilesCount, interestsCount, messagesCount, verifiedCount,
    pendingVerification, pendingApprovals, pendingMobileVerification, approvedMembers, suspendedMembers,
    trustedProfiles, newToday, interestsToday, messagesToday,
    premiumMembers, openReports, revenue, users, verificationQueue, reports,
    interests, messages, plans, transactions, auditLogs, memberNotes
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.memberProfile.count(),
    prisma.interestRecord.count(),
    prisma.messageRecord.count(),
    prisma.memberProfile.count({ where: { verified: true } }),
    prisma.memberProfile.count({ where: { verificationStatus: "requested" } }),
    prisma.user.count({ where: { role: "member", approvalStatus: "pending" } }),
    prisma.user.count({ where: { role: "member", mobileVerificationStatus: "pending" } }),
    prisma.user.count({ where: { role: "member", approvalStatus: "approved" } }),
    prisma.user.count({ where: { role: "member", status: "suspended" } }),
    prisma.memberProfile.count({ where: { trustedProfile: true } }),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.interestRecord.count({ where: { createdAt: { gte: today } } }),
    prisma.messageRecord.count({ where: { createdAt: { gte: today } } }),
    prisma.user.count({ where: { NOT: { membershipPlanId: "free" }, status: "active" } }),
    prisma.reportRecord.count({ where: { status: "open" } }),
    prisma.paymentTransaction.aggregate({ where: { status: { in: ["paid", "success", "approved"] } }, _sum: { amountPaise: true } }),
    prisma.user.findMany({ include: { profile: true, adminNotes: { orderBy: { createdAt: "desc" }, take: 10 } }, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.user.findMany({
      where: {
        role: "member",
        OR: [
          { mobileVerificationStatus: "pending" },
          { mobileVerificationStatus: "rejected" },
          { profile: { is: { verificationStatus: { not: "not-requested" } } } },
        ],
      },
      include: { profile: true }, orderBy: { profile: { updatedAt: "desc" } }, take: 200
    }),
    prisma.reportRecord.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.interestRecord.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.messageRecord.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.membershipPlan.findMany({ include: { features: true }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.paymentTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.adminMemberNote.findMany({ orderBy: { createdAt: "desc" }, take: 200 })
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  return {
    storageMode: "relational",
    stats: {
      users: usersCount, profiles: profilesCount, interests: interestsCount, messages: messagesCount,
      verified: verifiedCount, pendingVerification, pendingApprovals, pendingMobileVerification,
      approvedMembers, suspendedMembers,
      needsInformation: users.filter((u) => u.profile?.verificationStatus === "needs-information").length,
      rejectedVerification: users.filter((u) => u.profile?.verificationStatus === "rejected").length,
      trustedProfiles, newToday, interestsToday, messagesToday, premiumMembers, openReports,
      revenue: Math.round(Number(revenue._sum.amountPaise || 0) / 100)
    },
    users: users.map(publicAdminUser),
    verificationQueue: verificationQueue.map(publicAdminUser),
    verificationAudits: auditLogs.filter((a) => a.action.startsWith("profile.verification") || a.action.startsWith("member.mobile") || a.action.startsWith("member.note")).map(serializeAudit),
    memberNotes: memberNotes.map(serializeRecord),
    reports: reports.map(serializeRecord),
    blocks: [],
    activities: auditLogs.map(serializeAudit),
    interests: interests.map(serializeRecord),
    messages: messages.map(serializeRecord),
    plans: plans.map((plan) => ({
      ...serializeRecord(plan),
      price: Number(plan.pricePaise || 0) / 100,
      features: Object.fromEntries(plan.features.map((f) => [f.permissionKey, f.numericLimit ?? f.enabled]))
    })),
    subscriptions: [],
    transactions: transactions.map((transaction) => {
      const member = transaction.userId ? userMap.get(transaction.userId) : null;
      return {
        ...serializeRecord(transaction),
        amount: Number(transaction.amountPaise || 0) / 100,
        username: member?.username || member?.email || "",
        memberName: member ? `${member.firstName} ${member.lastName}`.trim() : "",
        memberEmail: member?.email || "",
        memberMobile: member?.mobile || ""
      };
    })
  };
}

export function serializeRecord(record) {
  if (!record) return record;
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]));
}

export function serializeAudit(record) {
  return {
    id: record.id,
    actorUserId: record.actorUserId,
    action: record.action,
    type: record.action,
    description: record.metadata?.description || record.metadata?.note || record.action.replaceAll(".", " "),
    note: record.metadata?.note || record.metadata?.reason || "",
    entityType: record.entityType,
    entityId: record.entityId,
    createdAt: iso(record.createdAt)
  };
}

export async function readRelationalSettings() {
  const rows = await prisma.businessSetting.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] });
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function writeRelationalSettings(values, actorUserId, auditBuilder) {
  const entries = Object.entries(values);
  await prisma.$transaction(async (tx) => {
    for (const [key, value] of entries) {
      await tx.businessSetting.upsert({
        where: { key },
        create: { id: id("setting"), key, category: categoryForSetting(key), value },
        update: { value, category: categoryForSetting(key), revision: { increment: 1 } }
      });
    }
    if (auditBuilder) await tx.adminAuditLog.create({ data: auditBuilder({ actorUserId, action: "settings.updated", entityType: "BusinessSetting", metadata: { keys: entries.map(([key]) => key) } }) });
  });
  invalidateSystemSettingsCache();
  return readRelationalSettings();
}

function categoryForSetting(key) {
  if (/otp|session|superAdmin|maintenance|registration/i.test(key)) return "security";
  if (/upi|qr|payment|razorpay/i.test(key)) return "payment";
  if (/email|mobile|whatsapp|phone/i.test(key)) return "contact";
  if (/seo|social|footer|about|privacy|terms/i.test(key)) return "content";
  return "business";
}
