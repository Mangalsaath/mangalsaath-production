import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/db";
import { getSystemSettings } from "@/lib/settings-service";
import { isAdminRole } from "@/lib/roles";
import { mangalNumberFromId, normalizeMangalsaathId, mangalsaathIdForProfile } from "@/lib/mangalsaath-id";

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

export async function GET(request) {
  try {
    const auth = await requirePrimarySuperAdmin(request);
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const requestedId = normalizeMangalsaathId(url.searchParams.get("id"));
    const mangalNumber = mangalNumberFromId(requestedId);
    if (!requestedId || !mangalNumber) {
      return NextResponse.json(
        { error: "Enter a valid Mangal ID, for example MANGAL1001 or MANGAL10001." },
        { status: 400 },
      );
    }

    const profile = await prisma.memberProfile.findFirst({
      where: { mangalNumber },
      include: { user: true },
    });
    if (!profile) {
      return NextResponse.json({ error: "No profile found for this Mangal ID." }, { status: 404 });
    }

    return NextResponse.json(
      {
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
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Universal Mangal ID admin lookup error", error);
    return NextResponse.json({ error: "Unable to find this Mangal ID." }, { status: 500 });
  }
}
