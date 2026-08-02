import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { cleanText, isEmail, rateLimit } from "@/lib/security";
import {
  requireAdmin,
  ADMIN_PERMISSIONS,
  isAdminAuthorizationError,
} from "@/lib/admin-auth";
import { buildAdminAuditData } from "@/lib/admin-audit";
import {
  readRelationalSettings,
  writeRelationalSettings,
  useRelationalAdmin,
  serializeRecord,
} from "@/lib/admin-core";
import { prisma } from "@/lib/prisma";
import {
  saveMembershipPlan,
  saveCoupon,
  deleteCoupon,
  serializePlan,
  serializeCoupon,
} from "@/lib/membership-admin";
import crypto from "crypto";

function cleanSettings(input, current) {
  const next = { ...current };
  const textFields = [
    "businessName",
    "businessAddress",
    "gstin",
    "pan",
    "supportEmail",
    "supportMobile",
    "whatsapp",
    "upiId",
    "paymentInstructions",
    "footerCopyright",
    "superAdminEmail",
    "superAdminMobile",
    "websiteUrl",
    "facebookUrl",
    "instagramUrl",
    "youtubeUrl",
    "seoTitle",
    "seoDescription",
  ];
  for (const field of textFields)
    if (field in input)
      next[field] = cleanText(
        input[field],
        field === "paymentInstructions" || field === "seoDescription"
          ? 500
          : 180,
      );
  if (next.supportEmail && !isEmail(next.supportEmail))
    throw new Error("Enter a valid support email.");
  if (next.superAdminEmail && !isEmail(next.superAdminEmail))
    throw new Error("Enter a valid Super Admin email.");
  for (const field of ["maintenanceMode", "registrationEnabled"])
    if (typeof input[field] === "boolean") next[field] = input[field];
  if ("adminOtpExpiryMinutes" in input)
    next.adminOtpExpiryMinutes = Math.min(
      15,
      Math.max(2, Number(input.adminOtpExpiryMinutes) || 5),
    );
  if ("adminSessionMinutes" in input)
    next.adminSessionMinutes = Math.min(
      120,
      Math.max(10, Number(input.adminSessionMinutes) || 30),
    );
  return next;
}

function planToLegacy(plan) {
  return serializePlan(plan);
}

function isSuperAdmin(user) {
  return ["admin", "super_admin"].includes(
    String(user?.role || "").toLowerCase(),
  );
}

export async function GET(request) {
  try {
    const { permissions } = await requireAdmin(request, {
      permission: ADMIN_PERMISSIONS.SETTINGS_READ,
      requireDualOtp: true,
    });
    if (!useRelationalAdmin()) {
      const db = await readDb();
      return NextResponse.json({
        settings: db.settings || {},
        plans: db.plans || [],
        coupons: db.coupons || [],
        homepageOffers: db.homepageOffers || [],
        analytics: db.analytics || {},
        auditLogs: (db.adminAuditLogs || []).slice(0, 100),
      });
    }
    const [settings, plans, coupons, homepageOffers, auditLogs] =
      await Promise.all([
        readRelationalSettings(),
        prisma.membershipPlan.findMany({
          include: { features: true },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        }),
        prisma.coupon.findMany({
          include: { plans: true, _count: { select: { redemptions: true } } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.homepageSection.findMany({
          where: { sectionKey: { startsWith: "offer:" } },
          orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        }),
        prisma.adminAuditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      ]);
    return NextResponse.json(
      {
        storageMode: "relational",
        settings,
        plans: permissions.has(ADMIN_PERMISSIONS.PLANS_READ)
          ? plans.map(planToLegacy)
          : [],
        coupons: permissions.has(ADMIN_PERMISSIONS.COUPONS_READ)
          ? coupons.map(serializeCoupon)
          : [],
        homepageOffers: permissions.has(ADMIN_PERMISSIONS.CONTENT_READ)
          ? homepageOffers.map((o) => ({
              ...o.content,
              id: o.id,
              active: o.active,
              priority: o.displayOrder,
            }))
          : [],
        analytics: {},
        auditLogs: permissions.has(ADMIN_PERMISSIONS.AUDIT_READ)
          ? auditLogs.map(serializeRecord)
          : [],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handle(error);
  }
}

export async function PATCH(request) {
  const limited = rateLimit(request, {
    key: "admin-settings",
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.allowed)
    return NextResponse.json(
      { error: "Too many changes. Please wait." },
      { status: 429 },
    );
  try {
    const { user: admin } = await requireAdmin(request, {
      permission: ADMIN_PERMISSIONS.SETTINGS_WRITE,
      requireDualOtp: true,
    });
    const body = await request.json();
    if (!useRelationalAdmin()) {
      const db = await readDb();
      const requestedValues = body.values || {};
      const protectedSecurityKeys = [
        "superAdminEmail",
        "superAdminMobile",
        "adminOtpExpiryMinutes",
        "adminSessionMinutes",
      ];
      if (
        protectedSecurityKeys.some((key) =>
          Object.prototype.hasOwnProperty.call(requestedValues, key),
        ) &&
        !isSuperAdmin(admin)
      ) {
        return NextResponse.json(
          {
            error:
              "Only the Super Admin can change Super Admin recovery and authentication settings.",
          },
          { status: 403 },
        );
      }
      db.settings = cleanSettings(requestedValues, db.settings || {});
      await writeDb(db);
      return NextResponse.json({
        message: "Saved successfully.",
        settings: db.settings,
      });
    }
    if (body.section === "plan") {
      await requireAdmin(request, {
        permission: ADMIN_PERMISSIONS.PLANS_WRITE,
        requireDualOtp: true,
      });
      const plan = await saveMembershipPlan(
        body.values || {},
        admin.id,
        buildAdminAuditData,
      );
      return NextResponse.json({
        message: "Membership plan saved successfully.",
        plan: serializePlan(plan),
      });
    }
    if (body.section === "coupon") {
      await requireAdmin(request, {
        permission: ADMIN_PERMISSIONS.COUPONS_WRITE,
        requireDualOtp: true,
      });
      const coupon = await saveCoupon(
        body.values || {},
        admin.id,
        buildAdminAuditData,
      );
      return NextResponse.json({
        message: "Coupon saved successfully.",
        coupon: serializeCoupon(coupon),
      });
    }
    if (body.section === "coupon-delete") {
      await requireAdmin(request, {
        permission: ADMIN_PERMISSIONS.COUPONS_WRITE,
        requireDualOtp: true,
      });
      const result = await deleteCoupon(
        body.values?.id,
        admin.id,
        buildAdminAuditData,
      );
      return NextResponse.json({
        message: result.disabled
          ? "Coupon had usage history, so it was safely disabled instead of deleted."
          : "Coupon deleted successfully.",
        ...result,
      });
    }
    if (body.section === "offer") {
      await requireAdmin(request, {
        permission: ADMIN_PERMISSIONS.CONTENT_WRITE,
        requireDualOtp: true,
      });
      const input = body.values || {};
      const title = cleanText(input.title, 120);
      if (!title)
        return NextResponse.json(
          { error: "Offer title is required." },
          { status: 400 },
        );
      const existing = input.id
        ? await prisma.homepageSection.findUnique({
            where: { id: cleanText(input.id, 64) },
          })
        : null;
      const id =
        existing?.id || `offer_${crypto.randomBytes(12).toString("hex")}`;
      const sectionKey = existing?.sectionKey || `offer:${id}`;
      const content = {
        title,
        subtitle: cleanText(input.subtitle || input.description, 300),
        couponCode: cleanText(input.couponCode, 40).toUpperCase(),
        ctaLabel: cleanText(input.ctaLabel, 80),
        ctaUrl: cleanText(input.ctaUrl, 240),
        discountType:
          input.discountType === "fixed"
            ? "fixed"
            : input.discountType === "percentage"
              ? "percentage"
              : "none",
        discountValue: Math.max(0, Number(input.discountValue) || 0),
      };
      const offer = await prisma.homepageSection.upsert({
        where: { id },
        create: {
          id,
          sectionKey,
          content,
          active: input.active !== false,
          displayOrder: Math.max(0, Number(input.priority) || 0),
        },
        update: {
          content,
          active: input.active !== false,
          displayOrder: Math.max(0, Number(input.priority) || 0),
          revision: { increment: 1 },
        },
      });
      await prisma.adminAuditLog.create({
        data: buildAdminAuditData({
          actorUserId: admin.id,
          action: existing
            ? "homepage_offer.updated"
            : "homepage_offer.created",
          entityType: "HomepageSection",
          entityId: offer.id,
          metadata: { title, active: offer.active },
        }),
      });
      return NextResponse.json({
        message: "Homepage offer saved successfully.",
        offer: serializeRecord(offer),
      });
    }
    if (body.section === "offer-delete") {
      await requireAdmin(request, {
        permission: ADMIN_PERMISSIONS.CONTENT_WRITE,
        requireDualOtp: true,
      });
      const id = cleanText(body.values?.id, 64);
      const offer = id
        ? await prisma.homepageSection.findUnique({ where: { id } })
        : null;
      if (!offer || !offer.sectionKey.startsWith("offer:"))
        return NextResponse.json(
          { error: "Homepage offer not found." },
          { status: 404 },
        );
      await prisma.homepageSection.delete({ where: { id } });
      await prisma.adminAuditLog.create({
        data: buildAdminAuditData({
          actorUserId: admin.id,
          action: "homepage_offer.deleted",
          entityType: "HomepageSection",
          entityId: id,
          metadata: {},
        }),
      });
      return NextResponse.json({
        message: "Homepage offer deleted successfully.",
      });
    }
    if (body.section !== "settings")
      return NextResponse.json(
        {
          error:
            "This release supports business settings, membership plans and coupons. Homepage content remains read-only.",
        },
        { status: 409 },
      );
    const current = await readRelationalSettings();
    const requestedValues = body.values || {};
    const protectedSecurityKeys = [
      "superAdminEmail",
      "superAdminMobile",
      "adminOtpExpiryMinutes",
      "adminSessionMinutes",
    ];
    if (
      protectedSecurityKeys.some((key) =>
        Object.prototype.hasOwnProperty.call(requestedValues, key),
      ) &&
      !isSuperAdmin(admin)
    ) {
      return NextResponse.json(
        {
          error:
            "Only the Super Admin can change Super Admin recovery and authentication settings.",
        },
        { status: 403 },
      );
    }
    const next = cleanSettings(requestedValues, current);
    const changed = Object.fromEntries(
      Object.entries(next).filter(
        ([key, value]) =>
          JSON.stringify(current[key]) !== JSON.stringify(value),
      ),
    );
    if (!Object.keys(changed).length)
      return NextResponse.json({
        message: "No changes to save.",
        settings: current,
      });
    const settings = await writeRelationalSettings(
      changed,
      admin.id,
      buildAdminAuditData,
    );
    return NextResponse.json({
      message: "Business settings saved successfully.",
      settings,
    });
  } catch (error) {
    return handle(error, 400);
  }
}

function handle(error, fallback = 500) {
  if (isAdminAuthorizationError(error))
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  console.error("Admin settings error", error);
  return NextResponse.json(
    { error: error.message || "Unable to save settings." },
    { status: fallback },
  );
}
