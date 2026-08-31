import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/db";
import { getSystemSettings } from "@/lib/settings-service";
import { isAdminRole } from "@/lib/roles";
import { appendAdminAudit } from "@/lib/admin-audit";
import { getDemoProfileControl, saveDemoProfileControl } from "@/lib/demo-profile-control";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function requirePrimarySuperAdmin(request) {
  const result = await getSession(request);
  if (!result?.user) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  if (!isAdminRole(result.user.role) || result.session?.adminDualOtpVerified !== true) {
    return { error: NextResponse.json({ error: "Super Admin verification required." }, { status: 403 }) };
  }

  const settings = await getSystemSettings({ fresh: true });
  const allowedEmails = new Set(
    [settings.superAdminEmail, process.env.ADMIN_EMAIL]
      .map(normalizeEmail)
      .filter(Boolean),
  );
  const userEmail = normalizeEmail(result.user.email);
  if (!userEmail || !allowedEmails.has(userEmail)) {
    return { error: NextResponse.json({ error: "Primary Super Admin access required." }, { status: 403 }) };
  }
  return result;
}

async function visibilitySummary() {
  const now = new Date();
  const control = await getDemoProfileControl();
  const [actualTotal, aiTotal, aiVisibleNow] = await Promise.all([
    prisma.memberProfile.count({ where: { isDemoProfile: false } }),
    prisma.memberProfile.count({ where: { isDemoProfile: true } }),
    prisma.memberProfile.count({
      where: {
        isDemoProfile: true,
        demoVisible: true,
        OR: [{ demoVisibleFrom: null }, { demoVisibleFrom: { lte: now } }],
        AND: [{ OR: [{ demoVisibleUntil: null }, { demoVisibleUntil: { gt: now } }] }],
      },
    }),
  ]);
  return {
    actualTotal,
    aiTotal,
    aiVisibleNow,
    enabled: control.enabled === true && aiVisibleNow > 0,
    expiresAt: null,
    showPublicLabel: control.showPublicLabel === true,
    publicLabel: control.publicLabel,
  };
}

export async function GET(request) {
  const auth = await requirePrimarySuperAdmin(request);
  if (auth.error) return auth.error;
  return NextResponse.json(await visibilitySummary(), {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request) {
  const auth = await requirePrimarySuperAdmin(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const action = String(body.action || "").trim().toLowerCase();
    const now = new Date();

    if (action === "enable") {
      const result = await prisma.memberProfile.updateMany({
        where: { isDemoProfile: true },
        data: { demoVisible: true, demoVisibleFrom: now, demoVisibleUntil: null },
      });
      const control = await getDemoProfileControl();
      await saveDemoProfileControl({
        ...control,
        enabled: true,
        allowDiscovery: true,
      });
      await appendAdminAudit({
        actorUserId: auth.user.id,
        action: "demo.quick_visibility.enabled_manual",
        entityType: "MemberProfile",
        metadata: { count: result.count, mode: "manual_until_disabled" },
        request,
      });
      return NextResponse.json({ message: `${result.count} AI profiles enabled until manually disabled.`, ...(await visibilitySummary()) });
    }

    if (action === "disable") {
      const result = await prisma.memberProfile.updateMany({
        where: { isDemoProfile: true },
        data: { demoVisible: false, demoVisibleUntil: null },
      });
      const control = await getDemoProfileControl();
      await saveDemoProfileControl({
        ...control,
        enabled: false,
        allowInterests: false,
        allowMessages: false,
        accessVersion: `${Date.now()}`,
      });
      await appendAdminAudit({
        actorUserId: auth.user.id,
        action: "demo.quick_visibility.disabled_manual",
        entityType: "MemberProfile",
        metadata: { count: result.count, mode: "manual" },
        request,
      });
      return NextResponse.json({ message: "AI profile visibility disabled by Super Admin.", ...(await visibilitySummary()) });
    }

    if (action === "set-public-label") {
      const showPublicLabel = body.showPublicLabel === true;
      const control = await getDemoProfileControl();
      await saveDemoProfileControl({ ...control, showPublicLabel });
      await appendAdminAudit({
        actorUserId: auth.user.id,
        action: showPublicLabel ? "demo.public_label.enabled" : "demo.public_label.disabled",
        entityType: "BusinessSetting",
        metadata: { showPublicLabel },
        request,
      });
      return NextResponse.json({
        message: showPublicLabel ? "Public AI profile label enabled." : "Public AI profile label disabled.",
        ...(await visibilitySummary()),
      });
    }

    return NextResponse.json({ error: "Invalid visibility action." }, { status: 400 });
  } catch (error) {
    console.error("Admin demo visibility error", error);
    return NextResponse.json({ error: "Unable to update AI profile visibility." }, { status: 500 });
  }
}
