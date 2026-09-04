import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ADMIN_PERMISSIONS, isAdminAuthorizationError } from "@/lib/admin-auth";
import { appendAdminAudit } from "@/lib/admin-audit";
import { cleanText, rateLimit } from "@/lib/security";
import { mangalsaathIdForProfile, mangalNumberFromId, normalizeMangalsaathId } from "@/lib/mangalsaath-id";

function fail(error) {
  if (isAdminAuthorizationError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Mangal ID AI profile admin error", error);
  return NextResponse.json({ error: "Unable to complete the AI profile request." }, { status: 500 });
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
    mangalsaathId: mangalsaathIdForProfile(profile),
    dateOfBirth: profile.dateOfBirth?.toISOString().slice(0, 10) || "",
    demoVisibleFrom: profile.demoVisibleFrom?.toISOString() || null,
    demoVisibleUntil: profile.demoVisibleUntil?.toISOString() || null,
    createdAt: profile.createdAt?.toISOString(),
    updatedAt: profile.updatedAt?.toISOString(),
  };
}

function optionalText(value, max) {
  const cleaned = cleanText(value, max);
  return cleaned || null;
}

function optionalNumber(value, { min, max } = {}) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  if (min !== undefined && number < min) return min;
  if (max !== undefined && number > max) return max;
  return Math.round(number);
}

async function findAiProfileByMangalId(value) {
  const requestedId = normalizeMangalsaathId(value);
  const mangalNumber = mangalNumberFromId(requestedId);
  if (!requestedId || !mangalNumber) {
    return { error: "Enter a valid Mangal ID, for example MANGAL1001.", status: 400 };
  }

  const profile = await prisma.memberProfile.findFirst({
    where: { isDemoProfile: true, mangalNumber },
    include: { user: true },
  });
  if (!profile) return { error: "No AI profile found for this Mangal ID.", status: 404 };
  return { profile, requestedId };
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
    const found = await findAiProfileByMangalId(url.searchParams.get("id"));
    if (!found.profile) return NextResponse.json({ error: found.error }, { status: found.status });

    return NextResponse.json(
      { profile: serialize(found.profile) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request) {
  const limited = rateLimit(request, {
    key: "admin-demo-profile-by-mangal-id",
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many AI profile actions. Please wait." }, { status: 429 });
  }

  try {
    const { user: admin } = await requireAdmin(request, {
      permission: ADMIN_PERMISSIONS.DEMO_PROFILES_WRITE,
      requireDualOtp: true,
    });
    const denied = assertSuperAdmin(admin);
    if (denied) return denied;

    const body = await request.json();
    const found = await findAiProfileByMangalId(body.mangalsaathId);
    if (!found.profile) return NextResponse.json({ error: found.error }, { status: found.status });
    const profile = found.profile;

    const firstName = cleanText(body.firstName, 80) || profile.user.firstName;
    const lastName = cleanText(body.lastName, 80) || profile.user.lastName;
    const dateOfBirth = body.dateOfBirth ? new Date(`${cleanText(body.dateOfBirth, 10)}T00:00:00.000Z`) : null;
    if (dateOfBirth && Number.isNaN(dateOfBirth.getTime())) {
      return NextResponse.json({ error: "Invalid date of birth." }, { status: 400 });
    }

    const profileData = {
      name: `${firstName} ${lastName}`.trim(),
      gender: optionalText(body.gender, 30),
      dateOfBirth,
      placeOfBirth: optionalText(body.placeOfBirth, 180),
      timeOfBirth: optionalText(body.timeOfBirth, 5),
      age: optionalNumber(body.age, { min: 18, max: 100 }),
      maritalStatus: optionalText(body.maritalStatus, 60),
      height: optionalNumber(body.height, { min: 120, max: 230 }),
      religion: optionalText(body.religion, 80),
      caste: optionalText(body.caste, 100),
      subCaste: optionalText(body.subCaste, 100),
      gotra: optionalText(body.gotra, 100),
      education: optionalText(body.education, 180),
      profession: optionalText(body.profession, 180),
      annualCtc: optionalText(body.annualCtc, 100),
      brothersMarried: optionalNumber(body.brothersMarried, { min: 0, max: 20 }) ?? profile.brothersMarried,
      brothersUnmarried: optionalNumber(body.brothersUnmarried, { min: 0, max: 20 }) ?? profile.brothersUnmarried,
      sistersMarried: optionalNumber(body.sistersMarried, { min: 0, max: 20 }) ?? profile.sistersMarried,
      sistersUnmarried: optionalNumber(body.sistersUnmarried, { min: 0, max: 20 }) ?? profile.sistersUnmarried,
      country: optionalText(body.country, 100) || "India",
      state: optionalText(body.state, 120),
      city: optionalText(body.city, 120),
      about: optionalText(body.about, 2000),
      partnerAgeMin: optionalNumber(body.partnerAgeMin, { min: 18, max: 100 }) ?? profile.partnerAgeMin,
      partnerAgeMax: optionalNumber(body.partnerAgeMax, { min: 18, max: 100 }) ?? profile.partnerAgeMax,
      partnerReligion: optionalText(body.partnerReligion, 100),
      partnerCaste: optionalText(body.partnerCaste, 100),
      partnerLocation: optionalText(body.partnerLocation, 160),
      partnerMaritalStatus: optionalText(body.partnerMaritalStatus, 100),
      partnerEducation: optionalText(body.partnerEducation, 180),
      partnerProfession: optionalText(body.partnerProfession, 180),
    };

    const changedFields = Object.entries(profileData)
      .filter(([key, value]) => {
        const oldValue = profile[key];
        if (oldValue instanceof Date && value instanceof Date) return oldValue.getTime() !== value.getTime();
        return String(oldValue ?? "") !== String(value ?? "");
      })
      .map(([key]) => key);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: profile.userId },
        data: { firstName, lastName, city: profileData.city, profession: profileData.profession },
      });
      return tx.memberProfile.update({
        where: { id: profile.id },
        data: profileData,
        include: { user: true },
      });
    });

    await appendAdminAudit({
      actorUserId: admin.id,
      action: "demo.profile.edited_by_mangal_id",
      entityType: "MemberProfile",
      entityId: profile.id,
      metadata: {
        mangalsaathId: found.requestedId,
        changedFields,
        visibilityPreserved: {
          demoVisible: profile.demoVisible,
          demoVisibleFrom: profile.demoVisibleFrom,
          demoVisibleUntil: profile.demoVisibleUntil,
        },
      },
      request,
    });

    return NextResponse.json({
      message: `AI profile ${found.requestedId} updated. Mangal ID and visibility were preserved.`,
      profile: serialize(updated),
    });
  } catch (error) {
    return fail(error);
  }
}
