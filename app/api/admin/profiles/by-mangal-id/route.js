import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ADMIN_PERMISSIONS, isAdminAuthorizationError } from "@/lib/admin-auth";
import { mangalNumberFromId, normalizeMangalsaathId, mangalsaathIdForProfile } from "@/lib/mangalsaath-id";

function fail(error) {
  if (isAdminAuthorizationError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Universal Mangal ID admin lookup error", error);
  return NextResponse.json({ error: "Unable to find this Mangal ID." }, { status: 500 });
}

function assertSuperAdmin(admin) {
  if (String(admin?.role || "").toLowerCase() !== "super_admin") {
    return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  }
  return null;
}

export async function GET(request) {
  try {
    const { user: admin } = await requireAdmin(request, {
      permission: ADMIN_PERMISSIONS.MEMBERS_READ,
      requireDualOtp: true,
    });
    const denied = assertSuperAdmin(admin);
    if (denied) return denied;

    const url = new URL(request.url);
    const requestedId = normalizeMangalsaathId(url.searchParams.get("id"));
    const mangalNumber = mangalNumberFromId(requestedId);
    if (!requestedId || !mangalNumber) {
      return NextResponse.json({ error: "Enter a valid Mangal ID, for example MANGAL1001 or MANGAL10001." }, { status: 400 });
    }

    const profile = await prisma.memberProfile.findFirst({
      where: { mangalNumber },
      include: { user: true },
    });
    if (!profile) {
      return NextResponse.json({ error: "No profile found for this Mangal ID." }, { status: 404 });
    }

    return NextResponse.json({
      type: profile.isDemoProfile ? "ai" : "real",
      mangalsaathId: mangalsaathIdForProfile(profile),
      profile: {
        id: profile.id,
        name: profile.name,
        city: profile.city,
        state: profile.state,
        religion: profile.religion,
        profession: profile.profession,
        verificationStatus: profile.verificationStatus,
        isDemoProfile: profile.isDemoProfile,
      },
      user: {
        id: profile.user.id,
        firstName: profile.user.firstName,
        lastName: profile.user.lastName,
        email: profile.user.email,
        mobile: profile.user.mobile,
        status: profile.user.status,
        approvalStatus: profile.user.approvalStatus,
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return fail(error);
  }
}
