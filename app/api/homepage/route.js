import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getVisibleOffers } from "@/lib/offers";
import { prisma } from "@/lib/prisma";
import { useRelationalAdmin } from "@/lib/admin-core";

async function relationalHomepageData(now) {
  const [sections, coupons] = await Promise.all([
    prisma.homepageSection.findMany({
      where: { sectionKey: { startsWith: "offer:" } },
      orderBy: [{ displayOrder: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.coupon.findMany({ include: { plans: true } }),
  ]);

  const offerDb = {
    homepageOffers: sections.map((section) => ({
      ...(section.content || {}),
      id: section.id,
      active: section.active,
      priority: section.displayOrder,
      status: "approved",
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
    })),
    coupons: coupons.map((coupon) => ({
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      startAt: coupon.startsAt,
      endAt: coupon.endsAt,
      active: coupon.active,
      applicablePlanIds: coupon.plans.map((item) => item.planId),
    })),
  };

  return getVisibleOffers(offerDb, now);
}

export async function GET() {
  const db = await readDb();
  const now = new Date();
  const offers = useRelationalAdmin()
    ? await relationalHomepageData(now)
    : getVisibleOffers(db, now);

  return NextResponse.json(
    { offers, primaryOffer: offers[0] || null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
