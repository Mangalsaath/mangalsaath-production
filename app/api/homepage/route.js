import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getVisibleOffers } from "@/lib/offers";
import { prisma } from "@/lib/prisma";
import { useRelationalAdmin } from "@/lib/admin-core";
import { foundingOfferStatus, FOUNDING_MEMBER_LIMIT } from "@/lib/founding-offer";

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

function foundingOffer(status) {
  return {
    id: "offer_first_100",
    active: true,
    priority: -100,
    status: "approved",
    badge: "FOUNDING MEMBER OFFER",
    title: `First ${FOUNDING_MEMBER_LIMIT} Members — Premium Membership FREE`,
    subtitle: `${status.remaining} founding place${status.remaining === 1 ? "" : "s"} remaining. Registration is free and eligible founding members receive Premium membership automatically.`,
    discountType: "none",
    discountValue: 0,
    couponCode: "",
    buttonText: "View Founding Offer",
    buttonTarget: "membership",
    theme: "rose",
  };
}

export async function GET() {
  const db = await readDb();
  const now = new Date();
  const regularOffers = useRelationalAdmin()
    ? await relationalHomepageData(now)
    : getVisibleOffers(db, now);
  const founding = await foundingOfferStatus(db);
  const offers = founding.active
    ? [foundingOffer(founding)]
    : regularOffers;

  return NextResponse.json(
    {
      offers,
      primaryOffer: offers[0] || null,
      foundingOffer: {
        active: founding.active,
        limit: FOUNDING_MEMBER_LIMIT,
        remaining: founding.remaining,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
