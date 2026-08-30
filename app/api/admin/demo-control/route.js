import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ADMIN_PERMISSIONS, isAdminAuthorizationError } from "@/lib/admin-auth";
import { appendAdminAudit } from "@/lib/admin-audit";
import { rateLimit } from "@/lib/security";
import {
  getDemoProfileControl,
  hashDemoAccessCode,
  saveDemoProfileControl,
} from "@/lib/demo-profile-control";

function fail(error) {
  if (isAdminAuthorizationError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Demo control API error", error);
  return NextResponse.json({ error: "Unable to complete the demo control request." }, { status: 500 });
}

async function requireSuperAdmin(request, permission) {
  const result = await requireAdmin(request, { permission, requireDualOtp: true });
  if (String(result.user.role || "").toLowerCase() !== "super_admin") {
    throw Object.assign(new Error("Super Admin access required."), {
      status: 403,
      name: "AdminAuthorizationError",
    });
  }
  return result;
}

function parseDate(value, fallback = null) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function boundedMinutes(value, fallback = 60) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(10080, Math.max(1, Math.round(n)));
}

async function summary() {
  const now = new Date();
  const [control, total, activeNow, scheduled, expired] = await Promise.all([
    getDemoProfileControl(),
    prisma.memberProfile.count({ where: { isDemoProfile: true } }),
    prisma.memberProfile.count({
      where: {
        isDemoProfile: true,
        demoVisible: true,
        OR: [{ demoVisibleFrom: null }, { demoVisibleFrom: { lte: now } }],
        AND: [{ OR: [{ demoVisibleUntil: null }, { demoVisibleUntil: { gt: now } }] }],
      },
    }),
    prisma.memberProfile.count({
      where: { isDemoProfile: true, demoVisible: true, demoVisibleFrom: { gt: now } },
    }),
    prisma.memberProfile.count({
      where: { isDemoProfile: true, demoVisibleUntil: { lte: now } },
    }),
  ]);

  const nextStart = await prisma.memberProfile.findFirst({
    where: { isDemoProfile: true, demoVisible: true, demoVisibleFrom: { gt: now } },
    orderBy: { demoVisibleFrom: "asc" },
    select: { demoVisibleFrom: true },
  });
  const nextEnd = await prisma.memberProfile.findFirst({
    where: { isDemoProfile: true, demoVisible: true, demoVisibleUntil: { gt: now } },
    orderBy: { demoVisibleUntil: "asc" },
    select: { demoVisibleUntil: true },
  });

  return {
    control: {
      ...control,
      accessCodeHash: control.accessCodeHash ? "configured" : "",
    },
    counts: {
      total,
      activeNow,
      scheduled,
      expired,
      hidden: Math.max(0, total - activeNow - scheduled),
    },
    nextStart: nextStart?.demoVisibleFrom?.toISOString() || null,
    nextEnd: nextEnd?.demoVisibleUntil?.toISOString() || null,
    serverTime: now.toISOString(),
  };
}

export async function GET(request) {
  try {
    await requireSuperAdmin(request, ADMIN_PERMISSIONS.DEMO_PROFILES_READ);
    return NextResponse.json(await summary(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request) {
  const limited = rateLimit(request, {
    key: "admin-demo-control",
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many demo control actions. Please wait." },
      { status: 429 },
    );
  }

  try {
    const { user: admin } = await requireSuperAdmin(
      request,
      ADMIN_PERMISSIONS.DEMO_PROFILES_WRITE,
    );
    const body = await request.json();
    const action = String(body.action || "").trim().slice(0, 50);
    const now = new Date();

    if (action === "enable-now-all") {
      const control = await getDemoProfileControl();
      if (control.viewerAccessRequired && !control.accessCodeHash) {
        return NextResponse.json(
          { error: "Set a demo access code before enabling the controlled live demo." },
          { status: 400 },
        );
      }
      const minutes = boundedMinutes(body.durationMinutes, control.defaultDurationMinutes);
      const endsAt = new Date(now.getTime() + minutes * 60_000);
      const result = await prisma.memberProfile.updateMany({
        where: { isDemoProfile: true },
        data: { demoVisible: true, demoVisibleFrom: now, demoVisibleUntil: endsAt },
      });
      await saveDemoProfileControl({
        ...control,
        enabled: true,
        defaultDurationMinutes: minutes,
      });
      await appendAdminAudit({
        actorUserId: admin.id,
        action: "demo.bulk.enabled",
        entityType: "MemberProfile",
        metadata: { count: result.count, startsAt: now, endsAt, minutes },
        request,
      });
      return NextResponse.json({
        message: `${result.count} demo profiles enabled until ${endsAt.toISOString()}.`,
        ...(await summary()),
      });
    }

    if (action === "schedule-all") {
      const startsAt = parseDate(body.startsAt);
      const endsAt = parseDate(body.endsAt);
      if (!startsAt || !endsAt || endsAt <= startsAt) {
        return NextResponse.json(
          { error: "Choose a valid start and end time." },
          { status: 400 },
        );
      }
      if (endsAt <= now) {
        return NextResponse.json(
          { error: "The end time must be in the future." },
          { status: 400 },
        );
      }
      const control = await getDemoProfileControl();
      if (control.viewerAccessRequired && !control.accessCodeHash) {
        return NextResponse.json(
          { error: "Set a demo access code before scheduling the controlled live demo." },
          { status: 400 },
        );
      }
      const result = await prisma.memberProfile.updateMany({
        where: { isDemoProfile: true },
        data: { demoVisible: true, demoVisibleFrom: startsAt, demoVisibleUntil: endsAt },
      });
      await saveDemoProfileControl({ ...control, enabled: true });
      await appendAdminAudit({
        actorUserId: admin.id,
        action: "demo.bulk.scheduled",
        entityType: "MemberProfile",
        metadata: { count: result.count, startsAt, endsAt },
        request,
      });
      return NextResponse.json({
        message: `${result.count} demo profiles scheduled.`,
        ...(await summary()),
      });
    }

    if (action === "extend-all") {
      const minutes = boundedMinutes(body.durationMinutes, 60);
      const profiles = await prisma.memberProfile.findMany({
        where: { isDemoProfile: true, demoVisible: true },
        select: { id: true, demoVisibleUntil: true },
      });
      await prisma.$transaction(
        profiles.map((profile) => {
          const base =
            profile.demoVisibleUntil && profile.demoVisibleUntil > now
              ? profile.demoVisibleUntil
              : now;
          return prisma.memberProfile.update({
            where: { id: profile.id },
            data: {
              demoVisible: true,
              demoVisibleUntil: new Date(base.getTime() + minutes * 60_000),
            },
          });
        }),
      );
      await appendAdminAudit({
        actorUserId: admin.id,
        action: "demo.bulk.extended",
        entityType: "MemberProfile",
        metadata: { count: profiles.length, minutes },
        request,
      });
      return NextResponse.json({
        message: `${profiles.length} visible/scheduled demo profiles extended by ${minutes} minutes.`,
        ...(await summary()),
      });
    }

    if (action === "disable-all" || action === "emergency-lockdown") {
      const control = await getDemoProfileControl();
      const result = await prisma.memberProfile.updateMany({
        where: { isDemoProfile: true },
        data: { demoVisible: false, demoVisibleUntil: now },
      });
      await saveDemoProfileControl({
        ...control,
        enabled: false,
        allowInterests: false,
        allowMessages: false,
        accessVersion: `${Date.now()}`,
      });
      await appendAdminAudit({
        actorUserId: admin.id,
        action:
          action === "emergency-lockdown"
            ? "demo.emergency.lockdown"
            : "demo.bulk.disabled",
        entityType: "MemberProfile",
        metadata: { count: result.count },
        request,
      });
      return NextResponse.json({
        message: `${result.count} demo profiles hidden immediately and viewer sessions revoked.`,
        ...(await summary()),
      });
    }

    if (action === "save-control") {
      const current = await getDemoProfileControl();
      const next = {
        ...current,
        defaultDurationMinutes:
          body.defaultDurationMinutes ?? current.defaultDurationMinutes,
        allowDiscovery: body.allowDiscovery ?? current.allowDiscovery,
        allowDirectProfileView:
          body.allowDirectProfileView ?? current.allowDirectProfileView,
        allowInterests: body.allowInterests ?? current.allowInterests,
        allowMessages: body.allowMessages ?? current.allowMessages,
        viewerAccessRequired:
          body.viewerAccessRequired ?? current.viewerAccessRequired,
        viewerSessionMinutes:
          body.viewerSessionMinutes ?? current.viewerSessionMinutes,
      };

      if (body.accessCode !== undefined && String(body.accessCode).trim()) {
        const hashed = hashDemoAccessCode(body.accessCode);
        if (!hashed) {
          return NextResponse.json(
            { error: "Demo access code must be between 6 and 64 characters." },
            { status: 400 },
          );
        }
        next.accessCodeHash = hashed;
        next.accessVersion = `${Date.now()}`;
      }

      const saved = await saveDemoProfileControl(next);
      await appendAdminAudit({
        actorUserId: admin.id,
        action: "demo.control.updated",
        entityType: "BusinessSetting",
        entityId: saved.id,
        metadata: {
          ...saved.value,
          accessCodeHash: saved.value?.accessCodeHash ? "configured" : "",
        },
        request,
      });
      return NextResponse.json({
        message: "Demo controls saved.",
        ...(await summary()),
      });
    }

    return NextResponse.json(
      { error: "Invalid demo control action." },
      { status: 400 },
    );
  } catch (error) {
    return fail(error);
  }
}
