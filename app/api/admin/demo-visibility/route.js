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
  const [total, visibleNow, nextExpiry] = await Promise.all([
    prisma.memberProfile.count({ where: { isDemoProfile: true } }),
    prisma.memberProfile.count({
      where: {
        isDemoProfile: true,
        demoVisible: true,
        OR: [{ demoVisibleFrom: null }, { demoVisibleFrom: { lte: now } }],
        AND: [{ OR: [{ demoVisibleUntil: null }, { demoVisibleUntil: { gt: now } }] }],
      },
    }),
    prisma.memberProfile.findFirst({
      where: { isDemoProfile: true, demoVisible: true, demoVisibleUntil: { gt: now } },
      orderBy: { demoVisibleUntil: "asc" },
      select: { demoVisibleUntil: true },
    }),
  ]);
  return {
    total,
    visibleNow,
    enabled: visibleNow > 0,
    expiresAt: nextExpiry?.demoVisibleUntil?.toISOString() || null,
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
      const minutes = Math.min(1440, Math.max(1, Number(body.durationMinutes || 60)));
      const expiresAt = new Date(now.getTime() + minutes * 60_000);
      const result = await prisma.memberProfile.updateMany({
        where: { isDemoProfile: true },
        data: { demoVisible: true, demoVisibleFrom: now, demoVisibleUntil: expiresAt },
      });
      const control = await getDemoProfileControl();
      await saveDemoProfileControl({
        ...control,
        enabled: true,
        allowDiscovery: true,
        defaultDurationMinutes: minutes,
      });
      await appendAdminAudit({
        actorUserId: auth.user.id,
        action: "demo.quick_visibility.enabled",
        entityType: "MemberProfile",
        metadata: { count: result.count, minutes, expiresAt },
        request,
      });
      return NextResponse.json({ message: `${result.count} AI/demo profiles enabled.`, ...(await visibilitySummary()) });
    }

    if (action === "disable") {
      const result = await prisma.memberProfile.updateMany({
        where: { isDemoProfile: true },
        data: { demoVisible: false, demoVisibleUntil: now },
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
        action: "demo.quick_visibility.disabled",
        entityType: "MemberProfile",
        metadata: { count: result.count },
        request,
      });
      return NextResponse.json({ message: `${result.count} AI/demo profiles hidden.`, ...(await visibilitySummary()) });
    }

    return NextResponse.json({ error: "Invalid visibility action." }, { status: 400 });
  } catch (error) {
    console.error("Admin demo visibility error", error);
    return NextResponse.json({ error: "Unable to update AI profile visibility." }, { status: 500 });
  }
}
