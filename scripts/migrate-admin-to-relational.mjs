import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const id = (prefix, value) => `${prefix}_${crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 24)}`;
const dateOrNull = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : null;
const integer = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.round(Number(value)) : fallback;

function settingCategory(key) {
  if (/otp|session|superAdmin/i.test(key)) return "security";
  if (/upi|qr|payment/i.test(key)) return "payment";
  if (/email|mobile|whatsapp/i.test(key)) return "contact";
  return "business";
}

function pricePaise(plan) {
  // Legacy prices are stored in rupees.
  return Math.max(0, integer(Number(plan?.price || 0) * 100));
}

async function main() {
  const state = await prisma.applicationState.findUnique({ where: { id: 1 } });
  if (!state) throw new Error("ApplicationState row 1 was not found.");
  const db = state.payload || {};
  const settings = db.settings && typeof db.settings === "object" ? db.settings : {};
  const plans = Array.isArray(db.plans) ? db.plans : [];
  const coupons = Array.isArray(db.coupons) ? db.coupons : [];
  const transactions = Array.isArray(db.transactions) ? db.transactions : [];
  const offers = Array.isArray(db.homepageOffers) ? db.homepageOffers : [];
  const logs = Array.isArray(db.adminAuditLogs) ? db.adminAuditLogs : [];

  await prisma.$transaction(async (tx) => {
    for (const [key, value] of Object.entries(settings)) {
      await tx.businessSetting.upsert({
        where: { key },
        create: { id: id("setting", key), key, category: settingCategory(key), value, isSecret: false },
        update: { category: settingCategory(key), value, revision: { increment: 1 } }
      });
    }

    for (const plan of plans) {
      const planId = String(plan.id || id("plan", plan.name || crypto.randomUUID())).slice(0, 64);
      const slug = String(plan.id || plan.name || planId).toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 80);
      await tx.membershipPlan.upsert({
        where: { id: planId },
        create: {
          id: planId, slug, name: String(plan.name || slug).slice(0, 100), description: plan.description || null,
          pricePaise: pricePaise(plan), durationDays: Math.max(0, integer(plan.durationDays)), active: plan.active !== false,
          displayOrder: integer(plan.displayOrder), badge: plan.badge ? String(plan.badge).slice(0, 60) : null
        },
        update: {
          slug, name: String(plan.name || slug).slice(0, 100), description: plan.description || null,
          pricePaise: pricePaise(plan), durationDays: Math.max(0, integer(plan.durationDays)), active: plan.active !== false,
          displayOrder: integer(plan.displayOrder), badge: plan.badge ? String(plan.badge).slice(0, 60) : null
        }
      });
      for (const [permissionKey, raw] of Object.entries(plan.features || {})) {
        const numeric = typeof raw === "number" ? integer(raw) : null;
        await tx.planFeature.upsert({
          where: { planId_permissionKey: { planId, permissionKey } },
          create: { id: id("feature", `${planId}:${permissionKey}`), planId, permissionKey, enabled: raw === true || (numeric !== null && numeric !== 0), numericLimit: numeric },
          update: { enabled: raw === true || (numeric !== null && numeric !== 0), numericLimit: numeric }
        });
      }
    }

    for (const coupon of coupons) {
      const couponId = String(coupon.id || id("coupon", coupon.code)).slice(0, 64);
      const code = String(coupon.code || couponId).toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
      await tx.coupon.upsert({
        where: { id: couponId },
        create: {
          id: couponId, code, discountType: coupon.discountType === "fixed" ? "fixed" : "percentage",
          discountValue: Math.max(1, integer(coupon.discountValue, 1)), startsAt: dateOrNull(coupon.startAt), endsAt: dateOrNull(coupon.endAt),
          maxUses: Math.max(0, integer(coupon.maxUses)), usesPerUser: Math.max(1, integer(coupon.usesPerUser, 1)), active: coupon.active !== false
        },
        update: {
          code, discountType: coupon.discountType === "fixed" ? "fixed" : "percentage",
          discountValue: Math.max(1, integer(coupon.discountValue, 1)), startsAt: dateOrNull(coupon.startAt), endsAt: dateOrNull(coupon.endAt),
          maxUses: Math.max(0, integer(coupon.maxUses)), usesPerUser: Math.max(1, integer(coupon.usesPerUser, 1)), active: coupon.active !== false
        }
      });
      await tx.couponPlan.deleteMany({ where: { couponId } });
      for (const planId of Array.isArray(coupon.applicablePlanIds) ? coupon.applicablePlanIds : []) {
        if (await tx.membershipPlan.findUnique({ where: { id: String(planId) }, select: { id: true } })) {
          await tx.couponPlan.create({ data: { couponId, planId: String(planId) } });
        }
      }
    }

    for (const transaction of transactions) {
      const transactionId = String(transaction.id || id("payment", JSON.stringify(transaction))).slice(0, 64);
      const amountRupees = Number(transaction.amount ?? transaction.finalAmount ?? 0);
      const discountRupees = Number(transaction.discountAmount ?? transaction.discount ?? 0);
      const planId = transaction.planId && await tx.membershipPlan.findUnique({ where: { id: String(transaction.planId) }, select: { id: true } }) ? String(transaction.planId) : null;
      await tx.paymentTransaction.upsert({
        where: { id: transactionId },
        create: {
          id: transactionId, userId: transaction.userId ? String(transaction.userId).slice(0, 64) : null, planId,
          gateway: String(transaction.gateway || transaction.method || "manual").slice(0, 40),
          gatewayOrderId: transaction.orderId ? String(transaction.orderId).slice(0, 191) : null,
          gatewayPaymentId: transaction.paymentId ? String(transaction.paymentId).slice(0, 191) : null,
          amountPaise: Math.max(0, integer(amountRupees * 100)), discountPaise: Math.max(0, integer(discountRupees * 100)),
          status: String(transaction.status || "pending").toLowerCase().slice(0, 30), verificationMetadata: { legacy: true, utr: transaction.utr || null }
        },
        update: { status: String(transaction.status || "pending").toLowerCase().slice(0, 30) }
      });
    }

    for (const offer of offers) {
      const sectionKey = `offer:${String(offer.id || id("offer", offer.title)).slice(0, 80)}`;
      await tx.homepageSection.upsert({
        where: { sectionKey },
        create: { id: String(offer.id || id("section", sectionKey)).slice(0, 64), sectionKey, content: offer, active: offer.active !== false, displayOrder: integer(offer.priority) },
        update: { content: offer, active: offer.active !== false, displayOrder: integer(offer.priority), revision: { increment: 1 } }
      });
    }

    for (const log of logs) {
      const logId = String(log.id || id("aal", JSON.stringify(log))).slice(0, 64);
      await tx.adminAuditLog.upsert({
        where: { id: logId },
        create: { id: logId, actorUserId: log.adminUserId || null, action: String(log.action || "legacy_action").slice(0, 120), metadata: { legacyDetails: log.details || null }, createdAt: dateOrNull(log.createdAt) || new Date() },
        update: {}
      });
    }
  }, { timeout: 120000 });

  console.log(JSON.stringify({ settings: Object.keys(settings).length, plans: plans.length, coupons: coupons.length, transactions: transactions.length, homepageOffers: offers.length, auditLogs: logs.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
