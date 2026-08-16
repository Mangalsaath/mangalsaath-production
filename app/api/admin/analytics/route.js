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

async function communityCounts(db) {
  if (useRelationalAdmin()) {
    const [registeredMembers, verifiedProfiles, premiumMembers] =
      await Promise.all([
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
    return { registeredMembers, verifiedProfiles, premiumMembers };
  }

  return {
    registeredMembers: (db.users || []).filter(
      (user) => !isAdminRole(user.role),
    ).length,
    verifiedProfiles: (db.profiles || []).filter(
      (profile) => profile.trustedProfile || profile.verified,
    ).length,
    premiumMembers: (db.users || []).filter(
      (user) =>
        !isAdminRole(user.role) &&
        !["free", ""].includes(
          String(user.membershipPlanId || "free").toLowerCase(),
        ),
    ).length,
  };
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
    const today = new Date().toISOString().slice(0, 10);
    const currentIpHash = hashAnalyticsIp(getRequestIp(request));

    return NextResponse.json(
      {
        uniqueVisitors: Number(analytics.uniqueVisitors || 0),
        registeredMembers: counts.registeredMembers,
        verifiedProfiles: counts.verifiedProfiles,
        premiumMembers: counts.premiumMembers,
        todayVisitors: Number(
          analytics.daily?.[today]?.uniqueVisitors || 0,
        ),
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
