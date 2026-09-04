import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ADMIN_PERMISSIONS, isAdminAuthorizationError } from "@/lib/admin-auth";
import { mangalsaathIdForProfile, normalizeMangalsaathId } from "@/lib/mangalsaath-id";

function fail(error) {
  if (isAdminAuthorizationError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Mangal ID AI profile lookup error", error);
  return NextResponse.json({ error: "Unable to find the AI profile." }, { status: 500 });
}

function assertSuperAdmin(admin) {
  if (String(admin?.role || "").toLowerCase() !== "super_admin") {
    return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  }
  return null;
}

function serialize(profile) {
  return {
    ...profile,
    mangalsaathId: mangalsaathIdForProfile(profile.id),
    dateOfBirth: profile.dateOfBirth?.toISOString().slice(0, 10) || "",
    demoVisibleFrom: profile.demoVisibleFrom?.toISOString() || null,
    demoVisibleUntil: profile.demoVisibleUntil?.toISOString() || null,
    createdAt: profile.createdAt?.toISOString(),
    updatedAt: profile.updatedAt?.toISOString(),
  };
}

export async function GET(request) {
  try {
    const { user: admin } = await requireAdmin(request, {
      permission: ADMIN_PERMISSIONS.DEMO_PROFILES_READ,
      requireDualOtp: true,
    });
    const denied = assertSuperAdmin(admin);
    if (denied) return denied;

    const url = new URL(request.url);
    const requestedId = normalizeMangalsaathId(url.searchParams.get("id"));
    if (!requestedId) {
      return NextResponse.json({ error: "Enter a valid Mangal ID in Mangalxxxxxx format." }, { status: 400 });
    }

    const ids = await prisma.memberProfile.findMany({
      where: { isDemoProfile: true },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    const matched = ids.find((item) => mangalsaathIdForProfile(item.id) === requestedId);
    if (!matched) {
      return NextResponse.json({ error: "No AI profile found for this Mangal ID." }, { status: 404 });
    }

    const profile = await prisma.memberProfile.findUnique({
      where: { id: matched.id },
      include: { user: true },
    });
    if (!profile?.isDemoProfile) {
      return NextResponse.json({ error: "AI profile not found." }, { status: 404 });
    }

    return NextResponse.json(
      { profile: serialize(profile) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}
