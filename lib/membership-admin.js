import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { cleanText } from "@/lib/security";

const makeId = (prefix) => `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
const PLAN_FEATURE_KEYS = Object.freeze([
  "profileViews",
  "interests",
  "messages",
  "advancedSearch",
  "priority",
  "viewContact"
]);

function integer(value, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function boolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function slugify(value) {
  return cleanText(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeFeatures(features = {}) {
  const normalized = {};
  for (const key of PLAN_FEATURE_KEYS) {
    const raw = features?.[key];
    if (typeof raw === "boolean") normalized[key] = { enabled: raw, numericLimit: null };
    else if (raw !== undefined && raw !== null && raw !== "") {
      const limit = integer(raw, { min: 0, max: 1_000_000 });
      normalized[key] = { enabled: limit > 0, numericLimit: limit };
    }
  }
  return normalized;
}

export function normalizePlanInput(input = {}, current = null) {
  const name = cleanText(input.name, 100);
  if (!name) throw new Error("Plan name is required.");
  const requestedId = cleanText(input.id, 64);
  const slug = slugify(input.slug || requestedId || name);
  if (!slug) throw new Error("Enter a valid plan ID or name.");
  const priceRupees = Number(input.price ?? 0);
  if (!Number.isFinite(priceRupees) || priceRupees < 0 || priceRupees > 10_000_000) throw new Error("Enter a valid plan price.");
  const durationDays = integer(input.durationDays, { min: 0, max: 3650 });
  const displayOrder = integer(input.displayOrder, { min: 0, max: 10_000, fallback: current?.displayOrder || 0 });
  return {
    id: current?.id || requestedId || slug,
    slug,
    name,
    description: cleanText(input.description, 2000) || null,
    pricePaise: Math.round(priceRupees * 100),
    durationDays,
    active: boolean(input.active, current?.active ?? true),
    displayOrder,
    badge: cleanText(input.badge, 60) || null,
    features: normalizeFeatures(input.features || {})
  };
}

export function normalizeCouponInput(input = {}, current = null) {
  const code = cleanText(input.code, 40).toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  if (!code) throw new Error("Coupon code is required.");
  const discountType = input.discountType === "fixed" ? "fixed" : "percentage";
  const discountValue = integer(input.discountValue, { min: 1, max: discountType === "percentage" ? 100 : 10_000_000 });
  if (!discountValue) throw new Error("Discount value must be greater than zero.");
  const startsAt = input.startAt ? new Date(input.startAt) : null;
  const endsAt = input.endAt ? new Date(input.endAt) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) throw new Error("Coupon start date is invalid.");
  if (endsAt && Number.isNaN(endsAt.getTime())) throw new Error("Coupon end date is invalid.");
  if (startsAt && endsAt && endsAt <= startsAt) throw new Error("Coupon end date must be after its start date.");
  const planIds = Array.isArray(input.applicablePlanIds)
    ? [...new Set(input.applicablePlanIds.map((id) => cleanText(id, 64)).filter(Boolean))]
    : [];
  return {
    id: current?.id || cleanText(input.id, 64) || makeId("coupon"),
    code,
    discountType,
    discountValue,
    startsAt,
    endsAt,
    maxUses: integer(input.maxUses, { min: 0, max: 10_000_000 }),
    usesPerUser: integer(input.usesPerUser, { min: 1, max: 100, fallback: 1 }),
    active: boolean(input.active, current?.active ?? true),
    planIds
  };
}

export async function saveMembershipPlan(input, actorUserId, auditData) {
  const requestedId = cleanText(input?.id, 64);
  const current = requestedId ? await prisma.membershipPlan.findUnique({ where: { id: requestedId }, include: { features: true } }) : null;
  const value = normalizePlanInput(input, current);

  return prisma.$transaction(async (tx) => {
    const duplicateSlug = await tx.membershipPlan.findUnique({ where: { slug: value.slug } });
    if (duplicateSlug && duplicateSlug.id !== value.id) throw new Error("Another plan already uses this ID or slug.");

    const plan = await tx.membershipPlan.upsert({
      where: { id: value.id },
      create: {
        id: value.id,
        slug: value.slug,
        name: value.name,
        description: value.description,
        pricePaise: value.pricePaise,
        durationDays: value.durationDays,
        active: value.active,
        displayOrder: value.displayOrder,
        badge: value.badge
      },
      update: {
        slug: value.slug,
        name: value.name,
        description: value.description,
        pricePaise: value.pricePaise,
        durationDays: value.durationDays,
        active: value.active,
        displayOrder: value.displayOrder,
        badge: value.badge
      }
    });

    for (const [permissionKey, feature] of Object.entries(value.features)) {
      await tx.planFeature.upsert({
        where: { planId_permissionKey: { planId: plan.id, permissionKey } },
        create: { id: makeId("feature"), planId: plan.id, permissionKey, enabled: feature.enabled, numericLimit: feature.numericLimit },
        update: { enabled: feature.enabled, numericLimit: feature.numericLimit }
      });
    }

    await tx.adminAuditLog.create({
      data: auditData({
        actorUserId,
        action: current ? "membership_plan.updated" : "membership_plan.created",
        entityType: "MembershipPlan",
        entityId: plan.id,
        metadata: { name: plan.name, pricePaise: plan.pricePaise, durationDays: plan.durationDays, active: plan.active }
      })
    });

    return tx.membershipPlan.findUnique({ where: { id: plan.id }, include: { features: true } });
  });
}

export async function saveCoupon(input, actorUserId, auditData) {
  const requestedId = cleanText(input?.id, 64);
  const current = requestedId ? await prisma.coupon.findUnique({ where: { id: requestedId } }) : null;
  const value = normalizeCouponInput(input, current);

  return prisma.$transaction(async (tx) => {
    const duplicateCode = await tx.coupon.findUnique({ where: { code: value.code } });
    if (duplicateCode && duplicateCode.id !== value.id) throw new Error("This coupon code already exists.");

    if (value.planIds.length) {
      const count = await tx.membershipPlan.count({ where: { id: { in: value.planIds } } });
      if (count !== value.planIds.length) throw new Error("One or more selected membership plans no longer exist.");
    }

    const coupon = await tx.coupon.upsert({
      where: { id: value.id },
      create: {
        id: value.id,
        code: value.code,
        discountType: value.discountType,
        discountValue: value.discountValue,
        startsAt: value.startsAt,
        endsAt: value.endsAt,
        maxUses: value.maxUses,
        usesPerUser: value.usesPerUser,
        active: value.active
      },
      update: {
        code: value.code,
        discountType: value.discountType,
        discountValue: value.discountValue,
        startsAt: value.startsAt,
        endsAt: value.endsAt,
        maxUses: value.maxUses,
        usesPerUser: value.usesPerUser,
        active: value.active
      }
    });

    await tx.couponPlan.deleteMany({ where: { couponId: coupon.id } });
    if (value.planIds.length) {
      await tx.couponPlan.createMany({ data: value.planIds.map((planId) => ({ couponId: coupon.id, planId })) });
    }

    await tx.adminAuditLog.create({
      data: auditData({
        actorUserId,
        action: current ? "coupon.updated" : "coupon.created",
        entityType: "Coupon",
        entityId: coupon.id,
        metadata: { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue, active: coupon.active, planIds: value.planIds }
      })
    });

    return tx.coupon.findUnique({ where: { id: coupon.id }, include: { plans: true, _count: { select: { redemptions: true } } } });
  });
}

export async function deleteCoupon(couponId, actorUserId, auditData) {
  const id = cleanText(couponId, 64);
  if (!id) throw new Error("Coupon ID is required.");
  return prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.findUnique({ where: { id }, include: { _count: { select: { redemptions: true } } } });
    if (!coupon) throw new Error("Coupon not found.");
    if (coupon._count.redemptions > 0) {
      const disabled = await tx.coupon.update({ where: { id }, data: { active: false } });
      await tx.adminAuditLog.create({ data: auditData({ actorUserId, action: "coupon.disabled", entityType: "Coupon", entityId: id, metadata: { reason: "Coupon has redemption history and cannot be deleted." } }) });
      return { deleted: false, disabled: true, coupon: disabled };
    }
    await tx.coupon.delete({ where: { id } });
    await tx.adminAuditLog.create({ data: auditData({ actorUserId, action: "coupon.deleted", entityType: "Coupon", entityId: id, metadata: { code: coupon.code } }) });
    return { deleted: true, disabled: false };
  });
}

export function serializePlan(plan) {
  return {
    ...plan,
    createdAt: plan.createdAt?.toISOString?.() || plan.createdAt,
    updatedAt: plan.updatedAt?.toISOString?.() || plan.updatedAt,
    price: Number(plan.pricePaise || 0) / 100,
    features: Object.fromEntries((plan.features || []).map((feature) => [feature.permissionKey, feature.numericLimit ?? feature.enabled]))
  };
}

export function serializeCoupon(coupon) {
  return {
    ...coupon,
    startsAt: coupon.startsAt?.toISOString?.() || null,
    endsAt: coupon.endsAt?.toISOString?.() || null,
    createdAt: coupon.createdAt?.toISOString?.() || coupon.createdAt,
    updatedAt: coupon.updatedAt?.toISOString?.() || coupon.updatedAt,
    startAt: coupon.startsAt?.toISOString?.() || null,
    endAt: coupon.endsAt?.toISOString?.() || null,
    applicablePlanIds: (coupon.plans || []).map((item) => item.planId),
    usageCount: coupon._count?.redemptions || 0
  };
}
