import { NextResponse } from "next/server";
import { readDb, writeDb, getUser, getMembership, uid } from "@/lib/db";
import { cleanText, rateLimit } from "@/lib/security";
import { getActiveCoupons } from "@/lib/offers";
import { getPublicSiteSettings } from "@/lib/settings-service";
import { useRelationalAdmin } from "@/lib/admin-core";
import { prisma } from "@/lib/prisma";
import { loadActivePlan, quotePlan } from "@/lib/payment-engine";
import { ensureFoundingPremium, foundingOfferStatus, FOUNDING_MEMBER_LIMIT } from "@/lib/founding-offer";

const safePlan = (plan) => ({ ...plan });

async function publicPaymentConfig(db = null) {
  const settings = await getPublicSiteSettings();
  return {
    upiId: db?.settings?.upiId || settings.upiId,
    qrImage: db?.settings?.qrImage || settings.qrImage,
    paymentInstructions: db?.settings?.paymentInstructions || settings.paymentInstructions
  };
}

function parseScreenshot(value) {
  const screenshot = String(value || "");
  if (!screenshot) return { proofData: null, proofMime: null };
  const match = screenshot.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Payment screenshot must be JPG, PNG or WebP.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 1_048_576) throw new Error("Payment screenshot must not exceed 1 MB.");
  return { proofData: screenshot, proofMime: `image/${match[1]}` };
}

function couponFor(db, code, planId, userId) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return null;
  const now = new Date();
  const coupon = (db.coupons || []).find((item) => item.code === normalized && item.active !== false);
  if (!coupon) throw new Error("Invalid or inactive coupon code.");
  if (coupon.startAt && new Date(coupon.startAt) > now) throw new Error("This coupon is not active yet.");
  if (coupon.endAt && new Date(coupon.endAt) < now) throw new Error("This coupon has expired.");
  if (coupon.applicablePlanIds?.length && !coupon.applicablePlanIds.includes(planId)) throw new Error("This coupon is not valid for the selected plan.");
  const totalUses = (db.transactions || []).filter((item) => item.couponCode === normalized && ["pending", "paid"].includes(item.status)).length;
  if (coupon.maxUses > 0 && totalUses >= coupon.maxUses) throw new Error("This coupon has reached its usage limit.");
  const userUses = (db.transactions || []).filter((item) => item.userId === userId && item.couponCode === normalized && ["pending", "paid"].includes(item.status)).length;
  if (userUses >= (coupon.usesPerUser || 1)) throw new Error("This coupon has already been used or is pending review on this account.");
  return coupon;
}

function foundingPayload(status, grant = null) {
  return {
    active: status.active,
    limit: FOUNDING_MEMBER_LIMIT,
    remaining: status.remaining,
    eligible: grant?.eligible === true,
    granted: grant?.granted === true || grant?.alreadyGranted === true,
    planName: grant?.plan?.name || status.plan?.name || "Premium",
  };
}

export async function GET(request) {
  const user = await getUser(request);
  if (useRelationalAdmin()) {
    const plans = await prisma.membershipPlan.findMany({ where: { active: true }, include: { features: true }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] });
    const publicPlans = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: Number(plan.pricePaise || 0) / 100,
      durationDays: plan.durationDays,
      badge: plan.badge,
      features: Object.fromEntries(plan.features.map((feature) => [feature.permissionKey, feature.numericLimit ?? feature.enabled]))
    }));

    const foundingBefore = await foundingOfferStatus();
    if (!user) {
      const coupons = foundingBefore.active ? [] : await prisma.coupon.findMany({ where: { active: true }, include: { plans: true }, orderBy: { createdAt: "desc" } });
      const now = new Date();
      const publicCoupons = coupons.filter((coupon) => (!coupon.startsAt || coupon.startsAt <= now) && (!coupon.endsAt || coupon.endsAt >= now)).map((coupon) => ({
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        startAt: coupon.startsAt?.toISOString() || null,
        endAt: coupon.endsAt?.toISOString() || null,
        applicablePlanIds: coupon.plans.map((item) => item.planId)
      }));
      return NextResponse.json({ plans: publicPlans, coupons: publicCoupons, membership: null, transactions: [], paymentConfig: await publicPaymentConfig(), foundingOffer: foundingPayload(foundingBefore) }, { headers: { "Cache-Control": "no-store" } });
    }

    const grant = await ensureFoundingPremium(user);
    const now = new Date();
    const foundingAfter = await foundingOfferStatus();
    const coupons = foundingAfter.active ? [] : await prisma.coupon.findMany({ where: { active: true }, include: { plans: true }, orderBy: { createdAt: "desc" } });
    const publicCoupons = coupons.filter((coupon) => (!coupon.startsAt || coupon.startsAt <= now) && (!coupon.endsAt || coupon.endsAt >= now)).map((coupon) => ({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      startAt: coupon.startsAt?.toISOString() || null,
      endAt: coupon.endsAt?.toISOString() || null,
      applicablePlanIds: coupon.plans.map((item) => item.planId)
    }));
    const membership = await prisma.userMembership.findFirst({ where: { userId: user.id, status: "active", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, include: { plan: { include: { features: true } } }, orderBy: { createdAt: "desc" } });
    const transactions = await prisma.paymentTransaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
    return NextResponse.json({
      plans: publicPlans,
      coupons: publicCoupons,
      membership: membership ? { plan: publicPlans.find((plan) => plan.id === membership.planId) || null, subscription: { ...membership, proofData: undefined } } : null,
      transactions: transactions.map(({ proofData, verificationMetadata, ...transaction }) => ({ ...transaction, hasProof: Boolean(proofData), verificationMetadata: undefined })),
      paymentConfig: await publicPaymentConfig(),
      foundingOffer: foundingPayload(foundingAfter, grant)
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const db = await readDb();
  const plans = db.plans.filter((plan) => plan.active !== false).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map(safePlan);
  const foundingBefore = await foundingOfferStatus(db);
  if (!user) {
    const coupons = foundingBefore.active ? [] : getActiveCoupons(db).map((coupon) => ({ code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue, startAt: coupon.startAt, endAt: coupon.endAt, applicablePlanIds: coupon.applicablePlanIds || [] }));
    return NextResponse.json({ plans, coupons, membership: null, transactions: [], paymentConfig: await publicPaymentConfig(db), foundingOffer: foundingPayload(foundingBefore) }, { headers: { "Cache-Control": "no-store" } });
  }

  const grant = await ensureFoundingPremium(user, db);
  const foundingAfter = await foundingOfferStatus(db);
  const coupons = foundingAfter.active ? [] : getActiveCoupons(db).map((coupon) => ({ code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue, startAt: coupon.startAt, endAt: coupon.endAt, applicablePlanIds: coupon.applicablePlanIds || [] }));
  const membership = getMembership(db, user.id);
  await writeDb(db);
  return NextResponse.json({ plans, coupons, membership: { plan: membership.plan, subscription: membership.active || null, usage: membership.usage }, transactions: db.transactions.filter((item) => item.userId === user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), paymentConfig: await publicPaymentConfig(db), foundingOffer: foundingPayload(foundingAfter, grant) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  const limited = rateLimit(request, { key: "membership-payment", limit: 10, windowMs: 60_000 });
  if (!limited.allowed) return NextResponse.json({ error: "Too many payment submissions. Please wait and try again." }, { status: 429 });
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const planId = cleanText(body.planId, 64);
  const couponCode = cleanText(body.couponCode, 40);
  const utr = cleanText(body.utr, 20);
  if (!/^\d{8,20}$/.test(utr)) return NextResponse.json({ error: "Enter a valid 8–20 digit UTR/reference number." }, { status: 400 });

  let proof;
  try { proof = parseScreenshot(body.screenshot); }
  catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }); }

  if (useRelationalAdmin()) {
    try {
      const plan = await loadActivePlan(planId);
      if (!plan || plan.id === "free" || plan.pricePaise <= 0) return NextResponse.json({ error: "Please select a paid plan." }, { status: 400 });
      const quote = await quotePlan({ plan, userId: user.id, couponCode });
      const duplicateReference = await prisma.paymentTransaction.findUnique({ where: { manualReference: utr } });
      if (duplicateReference) return NextResponse.json({ error: "This UTR has already been submitted." }, { status: 409 });
      const existingPending = await prisma.paymentTransaction.findFirst({ where: { userId: user.id, planId: plan.id, gateway: "manual-upi", status: "pending" } });
      if (existingPending) return NextResponse.json({ error: "A payment for this plan is already pending review." }, { status: 409 });
      const transaction = await prisma.paymentTransaction.create({
        data: {
          id: uid("txn"),
          userId: user.id,
          planId: plan.id,
          gateway: "manual-upi",
          manualReference: utr,
          proofMime: proof.proofMime,
          proofData: proof.proofData,
          amountPaise: quote.amountPaise,
          discountPaise: quote.discountPaise,
          currency: "INR",
          status: "pending",
          verificationMetadata: { couponId: quote.coupon?.id || null, couponCode: quote.coupon?.code || null, submittedAt: new Date().toISOString() }
        }
      });
      const { proofData, verificationMetadata, ...safeTransaction } = transaction;
      return NextResponse.json({ message: "Payment submitted successfully. Membership will activate after administrator verification.", transaction: { ...safeTransaction, hasProof: Boolean(proofData) } });
    } catch (error) {
      if (error?.code === "P2002") return NextResponse.json({ error: "This UTR has already been submitted." }, { status: 409 });
      return NextResponse.json({ error: error.message || "Unable to submit payment." }, { status: 400 });
    }
  }

  const db = await readDb();
  const plan = db.plans.find((item) => item.id === planId && item.active !== false);
  if (!plan || plan.id === "free") return NextResponse.json({ error: "Please select a paid plan." }, { status: 400 });
  const normalizedCoupon = couponCode.trim().toUpperCase();
  let discountAmount = 0;
  try {
    const coupon = couponFor(db, normalizedCoupon, plan.id, user.id);
    if (coupon) discountAmount = coupon.discountType === "fixed" ? Math.min(plan.price, coupon.discountValue) : Math.round(plan.price * (coupon.discountValue / 100));
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }); }
  if (db.transactions.some((item) => item.utr === utr && ["pending", "paid"].includes(item.status))) return NextResponse.json({ error: "This UTR has already been submitted." }, { status: 409 });
  if (db.transactions.some((item) => item.userId === user.id && item.planId === plan.id && item.status === "pending")) return NextResponse.json({ error: "A payment for this plan is already pending review." }, { status: 409 });
  const amount = Math.max(0, plan.price - discountAmount);
  const createdAt = new Date().toISOString();
  const transaction = { id: uid("txn"), userId: user.id, username: user.username || user.email, memberName: `${user.firstName || ""} ${user.lastName || ""}`.trim(), memberEmail: user.email || "", memberMobile: user.mobile || "", planId: plan.id, planName: plan.name, originalAmount: plan.price, discountAmount, amount, couponCode: discountAmount ? normalizedCoupon : null, currency: "INR", gateway: "manual-upi", status: "pending", utr, screenshot: proof.proofData, reference: `MS-${Date.now()}`, createdAt, updatedAt: createdAt };
  db.transactions.push(transaction);
  await writeDb(db);
  return NextResponse.json({ message: "Payment submitted successfully. Membership will activate after administrator verification.", transaction });
}
