import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { useRelationalAdmin } from "@/lib/admin-core";
import { isAdminRole } from "@/lib/roles";

export const FOUNDING_MEMBER_LIMIT = 100;
export const FOUNDING_PLAN_ID = "premium";

const id = (prefix) => `${prefix}_${crypto.randomBytes(10).toString("hex")}`;

function legacyMembers(db) {
  return (db?.users || [])
    .filter((user) => !isAdminRole(user.role))
    .sort((a, b) => {
      const time = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      return time || String(a.id || "").localeCompare(String(b.id || ""));
    });
}

export async function foundingOfferStatus(db = null) {
  if (useRelationalAdmin()) {
    const [registeredMembers, premiumPlan] = await Promise.all([
      prisma.user.count({ where: { role: "member" } }),
      prisma.membershipPlan.findFirst({
        where: { id: FOUNDING_PLAN_ID, active: true },
        select: { id: true, name: true, durationDays: true },
      }),
    ]);
    return {
      active: Boolean(premiumPlan) && registeredMembers < FOUNDING_MEMBER_LIMIT,
      registeredMembers,
      remaining: Math.max(0, FOUNDING_MEMBER_LIMIT - registeredMembers),
      plan: premiumPlan,
    };
  }

  const registeredMembers = legacyMembers(db).length;
  const premiumPlan = (db?.plans || []).find(
    (plan) => plan.id === FOUNDING_PLAN_ID && plan.active !== false,
  );
  return {
    active: Boolean(premiumPlan) && registeredMembers < FOUNDING_MEMBER_LIMIT,
    registeredMembers,
    remaining: Math.max(0, FOUNDING_MEMBER_LIMIT - registeredMembers),
    plan: premiumPlan || null,
  };
}

export async function ensureFoundingPremium(user, db = null) {
  if (!user || isAdminRole(user.role)) return { granted: false, eligible: false };

  if (useRelationalAdmin()) {
    const firstMembers = await prisma.user.findMany({
      where: { role: "member" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: FOUNDING_MEMBER_LIMIT,
      select: { id: true },
    });
    const eligible = firstMembers.some((member) => member.id === user.id);
    if (!eligible) return { granted: false, eligible: false };

    const premiumPlan = await prisma.membershipPlan.findFirst({
      where: { id: FOUNDING_PLAN_ID, active: true },
      select: { id: true, name: true, durationDays: true },
    });
    if (!premiumPlan) return { granted: false, eligible: true, reason: "premium-plan-unavailable" };

    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { membershipPlanId: true },
    });
    if (currentUser && !["", "free"].includes(String(currentUser.membershipPlanId || "free").toLowerCase())) {
      return { granted: false, eligible: true, alreadyPaid: true, plan: premiumPlan };
    }

    const existing = await prisma.userMembership.findFirst({
      where: {
        userId: user.id,
        planId: premiumPlan.id,
        status: "active",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
    });

    if (!existing) {
      const startsAt = new Date();
      const expiresAt = premiumPlan.durationDays > 0
        ? new Date(startsAt.getTime() + premiumPlan.durationDays * 24 * 60 * 60 * 1000)
        : null;
      await prisma.$transaction([
        prisma.userMembership.create({
          data: {
            id: id("founding"),
            userId: user.id,
            planId: premiumPlan.id,
            status: "active",
            startsAt,
            expiresAt,
          },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { membership: premiumPlan.name || "Premium", membershipPlanId: premiumPlan.id },
        }),
      ]);
      return { granted: true, eligible: true, plan: premiumPlan, expiresAt };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { membership: premiumPlan.name || "Premium", membershipPlanId: premiumPlan.id },
    });
    return { granted: false, eligible: true, alreadyGranted: true, plan: premiumPlan, expiresAt: existing.expiresAt };
  }

  const members = legacyMembers(db);
  const eligible = members.slice(0, FOUNDING_MEMBER_LIMIT).some((member) => member.id === user.id);
  if (!eligible) return { granted: false, eligible: false };
  if (!["", "free"].includes(String(user.membershipPlanId || "free").toLowerCase())) {
    return { granted: false, eligible: true, alreadyPaid: true };
  }

  const premiumPlan = (db?.plans || []).find(
    (plan) => plan.id === FOUNDING_PLAN_ID && plan.active !== false,
  );
  if (!premiumPlan) return { granted: false, eligible: true, reason: "premium-plan-unavailable" };

  db.subscriptions = Array.isArray(db.subscriptions) ? db.subscriptions : [];
  const existing = db.subscriptions.find(
    (subscription) =>
      subscription.userId === user.id &&
      subscription.planId === premiumPlan.id &&
      subscription.status === "active" &&
      (!subscription.expiresAt || new Date(subscription.expiresAt) > new Date()),
  );

  user.membership = premiumPlan.name || "Premium";
  user.membershipPlanId = premiumPlan.id;
  if (existing) return { granted: false, eligible: true, alreadyGranted: true, plan: premiumPlan };

  const startsAt = new Date();
  const expiresAt = premiumPlan.durationDays > 0
    ? new Date(startsAt.getTime() + premiumPlan.durationDays * 24 * 60 * 60 * 1000).toISOString()
    : null;
  db.subscriptions.push({
    id: id("founding"),
    userId: user.id,
    planId: premiumPlan.id,
    status: "active",
    startsAt: startsAt.toISOString(),
    createdAt: startsAt.toISOString(),
    expiresAt,
    source: "first-100-founding-offer",
  });
  return { granted: true, eligible: true, plan: premiumPlan, expiresAt };
}
