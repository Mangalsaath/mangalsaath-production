import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import {
  requireAdmin,
  ADMIN_PERMISSIONS,
  isAdminAuthorizationError,
} from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { useRelationalAdmin } from "@/lib/admin-core";
import { isAdminRole } from "@/lib/roles";
import {
  ensureAnalytics,
  excludeIpHash,
  getRequestIp,
  hashAnalyticsIp,
  isIpExcluded,
} from "@/lib/analytics";
import { foundingOfferStatus, FOUNDING_MEMBER_LIMIT } from "@/lib/founding-offer";

function handle(error) {
  if (isAdminAuthorizationError(error)) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  console.error("Admin analytics error", error);
  return NextResponse.json(
    { error: "Unable to load analytics." },
    { status: 500 },
  );
}

function isCompleteProfile(profile) {
  if (!profile) return false;
  return Boolean(
    profile.gender &&
      profile.dateOfBirth &&
      profile.maritalStatus &&
      profile.height &&
      profile.religion &&
      profile.education &&
      profile.profession &&
      profile.city &&
      String(profile.about || "").trim().length >= 40,
  );
}

async function communityCounts(db) {
  if (useRelationalAdmin()) {
    const [
      registeredMembers,
      profiles,
      verifiedProfiles,
      premiumMembers,
      interestsSent,
      paidRows,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "member" } }),
      prisma.memberProfile.findMany({
        select: {
          gender: true,
          dateOfBirth: true,
          maritalStatus: true,
          height: true,
          religion: true,
          education: true,
          profession: true,
          city: true,
          about: true,
        },
      }),
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
      prisma.interestRecord.count(),
      prisma.paymentTransaction.findMany({
        where: {
          userId: { not: null },
          amountPaise: { gt: 0 },
          status: { in: ["paid", "success", "approved"] },
        },
        select: { userId: true },
      }),
    ]);
    return {
      registeredMembers,
      completedProfiles: profiles.filter(isCompleteProfile).length,
      verifiedProfiles,
      interestsSent,
      premiumMembers,
      paidMembers: new Set(paidRows.map((row) => row.userId).filter(Boolean)).size,
    };
  }

  const memberIds = new Set(
    (db.users || [])
      .filter((user) => !isAdminRole(user.role))
      .map((user) => user.id),
  );
  const paidMembers = new Set(
    (db.transactions || [])
      .filter(
        (item) =>
          memberIds.has(item.userId) &&
          Number(item.amount || 0) > 0 &&
          ["paid", "success", "approved"].includes(String(item.status || "").toLowerCase()),
      )
      .map((item) => item.userId),
  );

  return {
    registeredMembers: memberIds.size,
    completedProfiles: (db.profiles || []).filter(
      (profile) => memberIds.has(profile.userId) && isCompleteProfile(profile),
    ).length,
    verifiedProfiles: (db.profiles || []).filter(
      (profile) => memberIds.has(profile.userId) && (profile.trustedProfile || profile.verified),
    ).length,
    interestsSent: (db.interests || []).filter((interest) => memberIds.has(interest.fromUserId)).length,
    premiumMembers: (db.users || []).filter(
      (user) =>
        !isAdminRole(user.role) &&
        !["free", ""].includes(
          String(user.membershipPlanId || "free").toLowerCase(),
        ),
    ).length,
    paidMembers: paidMembers.size,
  };
}

function percent(part, total) {
  if (!total) return 0;
  return Math.round((Number(part || 0) / Number(total || 1)) * 1000) / 10;
}

export async function GET(request) {
  try {
    await requireAdmin(request, {
      permission: ADMIN_PERMISSIONS.DASHBOARD_READ,
      requireDualOtp: true,
    });

    const db = await readDb();
    const analytics = ensureAnalytics(db);
    const counts = await communityCounts(db);
    const founding = await foundingOfferStatus(db);
    const today = new Date().toISOString().slice(0, 10);
    const currentIpHash = hashAnalyticsIp(getRequestIp(request));
    const uniqueVisitors = Number(analytics.uniqueVisitors || 0);

    return NextResponse.json(
      {
        uniqueVisitors,
        totalVisits: Number(analytics.totalVisits || 0),
        registeredMembers: counts.registeredMembers,
        completedProfiles: counts.completedProfiles,
        verifiedProfiles: counts.verifiedProfiles,
        interestsSent: counts.interestsSent,
        premiumMembers: counts.premiumMembers,
        paidMembers: counts.paidMembers,
        todayVisitors: Number(analytics.daily?.[today]?.uniqueVisitors || 0),
        conversion: {
          visitorToRegistration: percent(counts.registeredMembers, uniqueVisitors),
          registrationToProfile: percent(counts.completedProfiles, counts.registeredMembers),
          profileToVerified: percent(counts.verifiedProfiles, counts.completedProfiles),
          registrationToPremium: percent(counts.premiumMembers, counts.registeredMembers),
          registrationToPaid: percent(counts.paidMembers, counts.registeredMembers),
        },
        foundingOffer: {
          active: founding.active,
          limit: FOUNDING_MEMBER_LIMIT,
          remaining: founding.remaining,
          registeredMembers: founding.registeredMembers,
        },
        currentIpExcluded: isIpExcluded(db, currentIpHash),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handle(error);
  }
}

export async function POST(request) {
  try {
    await requireAdmin(request, {
      permission: ADMIN_PERMISSIONS.DASHBOARD_READ,
      requireDualOtp: true,
    });

    const body = await request.json().catch(() => ({}));
    if (body.action !== "exclude-current-ip") {
      return NextResponse.json(
        { error: "Invalid analytics action." },
        { status: 400 },
      );
    }

    const ipHash = hashAnalyticsIp(getRequestIp(request));
    if (!ipHash) {
      return NextResponse.json(
        { error: "Current IP address could not be determined." },
        { status: 400 },
      );
    }

    const db = await readDb();
    const changed = excludeIpHash(db, ipHash);
    if (changed) await writeDb(db);

    return NextResponse.json({
      ok: true,
      currentIpExcluded: true,
      message: changed
        ? "Current IP excluded from future visitor analytics."
        : "Current IP was already excluded.",
    });
  } catch (error) {
    return handle(error);
  }
}
