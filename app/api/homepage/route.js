import { NextResponse } from "next/server";
import { isAdminRole } from "../../../lib/roles";
import { readDb } from "@/lib/db";
import { getVisibleOffers } from "@/lib/offers";
import { prisma } from "@/lib/prisma";
import { useRelationalAdmin } from "@/lib/admin-core";

async function relationalHomepageData(db, now) {
  const [sections, coupons, registeredMembers, verifiedProfiles, premiumMembers] =
    await Promise.all([
      prisma.homepageSection.findMany({
        where: { sectionKey: { startsWith: "offer:" } },
        orderBy: [{ displayOrder: "asc" }, { updatedAt: "desc" }],
      }),
      prisma.coupon.findMany({ include: { plans: true } }),
      prisma.user.count({ where: { role: "member" } }),
      prisma.memberProfile.count({
        where: { OR: [{ trustedProfile: true }, { verified: true }] },
      }),
      prisma.user.count({
        where: {
          role: "member",
          status: "active",
          NOT: { membershipPlanId: "free" },
        },
      }),
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

  return {
    offers: getVisibleOffers(offerDb, now),
    counts: { registeredMembers, verifiedProfiles, premiumMembers },
  };
}

export async function GET(){
  const db=await readDb();
  const now=new Date();
  const relational = useRelationalAdmin()
    ? await relationalHomepageData(db, now)
    : null;
  const offers=relational?.offers || getVisibleOffers(db,now);
  const today=now.toISOString().slice(0,10);
  const stats={
    totalVisitors:Number(db.analytics?.uniqueVisitors||0),
    totalVisits:Number(db.analytics?.totalVisits||0),
    todayVisitors:Number(db.analytics?.daily?.[today]?.uniqueVisitors||0),
    registeredMembers: relational?.counts.registeredMembers ??
      (db.users || []).filter((user) => !isAdminRole(user.role)).length,
    verifiedProfiles:relational?.counts.verifiedProfiles ?? (db.profiles||[]).filter(p=>p.trustedProfile||p.verified).length,
    premiumMembers:relational?.counts.premiumMembers ?? (db.users||[]).filter(u=>!["free",""].includes(String(u.membershipPlanId||"free").toLowerCase())).length
  };
  return NextResponse.json({offers,primaryOffer:offers[0]||null,stats},{headers:{"Cache-Control":"no-store"}});
}
