import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uid } from "@/lib/db";
import { requireAdmin, ADMIN_PERMISSIONS, isAdminAuthorizationError } from "@/lib/admin-auth";
import { appendAdminAudit } from "@/lib/admin-audit";
import { cleanText, rateLimit } from "@/lib/security";
import { demoVisibilityWindow, getDemoProfileControl, saveDemoProfileControl } from "@/lib/demo-profile-control";
import { mangalsaathIdForProfile } from "@/lib/mangalsaath-id";

function fail(error) {
  if (isAdminAuthorizationError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Demo profile admin API error", error);
  return NextResponse.json({ error: "Unable to complete the demo profile request." }, { status: 500 });
}

function serialize(profile) {
  return {
    ...profile,
    mangalsaathId: mangalsaathIdForProfile(profile.id),
    dateOfBirth: profile.dateOfBirth?.toISOString().slice(0, 10),
    demoVisibleFrom: profile.demoVisibleFrom?.toISOString() || null,
    demoVisibleUntil: profile.demoVisibleUntil?.toISOString() || null,
    createdAt: profile.createdAt?.toISOString(),
    updatedAt: profile.updatedAt?.toISOString(),
  };
}

function assertSuperAdmin(admin) {
  if (String(admin?.role || "").toLowerCase() !== "super_admin") {
    return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  }
  return null;
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

export async function GET(request) {
  try {
    const { user: admin } = await requireAdmin(request, {
      permission: ADMIN_PERMISSIONS.DEMO_PROFILES_READ,
      requireDualOtp: true,
    });
    const denied = assertSuperAdmin(admin);
    if (denied) return denied;

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || 100)));
    const search = cleanText(url.searchParams.get("search") || "", 120);
    const where = {
      isDemoProfile: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { city: { contains: search } },
              { state: { contains: search } },
              { religion: { contains: search } },
              { caste: { contains: search } },
              { education: { contains: search } },
              { profession: { contains: search } },
              { annualCtc: { contains: search } },
              { user: { firstName: { contains: search } } },
              { user: { lastName: { contains: search } } },
            ],
          }
        : {}),
    };

    const [control, total, profiles] = await Promise.all([
      getDemoProfileControl(),
      prisma.memberProfile.count({ where }),
      prisma.memberProfile.findMany({
        where,
        include: { user: true },
        orderBy: { id: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json(
      {
        control,
        profiles: profiles.map(serialize),
        pagination: {
          page,
          pageSize,
          total,
          pages: Math.max(1, Math.ceil(total / pageSize)),
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request) {
  const limited = rateLimit(request, {
    key: "admin-demo-profiles",
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many demo profile actions. Please wait." },
      { status: 429 },
    );
  }

  try {
    const { user: admin } = await requireAdmin(request, {
      permission: ADMIN_PERMISSIONS.DEMO_PROFILES_WRITE,
      requireDualOtp: true,
    });
    const denied = assertSuperAdmin(admin);
    if (denied) return denied;

    const body = await request.json();
    const action = cleanText(body.action, 50);

    if (action === "save-control") {
      const saved = await saveDemoProfileControl(body.control || {});
      await appendAdminAudit({
        actorUserId: admin.id,
        action: "demo.control.updated",
        entityType: "BusinessSetting",
        entityId: saved.id,
        metadata: saved.value,
        request,
      });
      return NextResponse.json({
        message: "Demo profile controls updated.",
        control: saved.value,
      });
    }

    if (action === "create") {
      const control = await getDemoProfileControl();
      const firstName = cleanText(body.firstName, 80);
      const lastName = cleanText(body.lastName, 80);
      if (!firstName || !lastName) {
        return NextResponse.json(
          { error: "First and last name are required." },
          { status: 400 },
        );
      }

      const userId = uid("demo_user");
      const profileId = uid("demo_profile");
      const window = demoVisibilityWindow({
        enabled: body.visible !== false,
        durationMinutes: body.durationMinutes || control.defaultDurationMinutes,
      });
      const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const created = await prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            id: userId,
            username: `demo_${unique}`,
            firstName,
            lastName,
            email: `demo_${unique}@example.invalid`,
            mobile: `demo_${unique}`.slice(0, 20),
            passwordHash: "!synthetic-demo-no-login!",
            role: "member",
            status: "active",
            emailVerified: true,
            verified: true,
            approvalStatus: "approved",
            approvedBy: admin.id,
            approvedAt: new Date(),
          },
        });

        return tx.memberProfile.create({
          data: {
            id: profileId,
            userId,
            name: `${firstName} ${lastName}`,
            gender: cleanText(body.gender, 30) || null,
            age: Number(body.age) || 25,
            maritalStatus: cleanText(body.maritalStatus, 60) || "Never Married",
            height: Number(body.height) || 165,
            religion: cleanText(body.religion, 80) || null,
            caste: cleanText(body.caste, 100) || null,
            education: cleanText(body.education, 180) || null,
            profession: cleanText(body.profession, 180) || null,
            country: cleanText(body.country, 100) || "India",
            state: cleanText(body.state, 120) || null,
            city: cleanText(body.city, 120) || null,
            about:
              cleanText(body.about, 2000) ||
              "Synthetic demonstration profile created for controlled platform testing.",
            photoModerationStatus: "approved",
            verified: true,
            verificationStatus: "approved",
            trustedProfile: true,
            isDemoProfile: true,
            demoVisible: window.enabled,
            demoVisibleFrom: window.startsAt,
            demoVisibleUntil: window.expiresAt,
            demoCreatedBy: admin.id,
            demoLabel: cleanText(body.demoLabel, 80) || control.labelForAdmins,
          },
          include: { user: true },
        });
      });

      await appendAdminAudit({
        actorUserId: admin.id,
        action: "demo.profile.created",
        entityType: "MemberProfile",
        entityId: created.id,
        metadata: { visibleUntil: created.demoVisibleUntil, synthetic: true },
        request,
      });
      return NextResponse.json(
        { message: "Synthetic demo profile created.", profile: serialize(created) },
        { status: 201 },
      );
    }

    const profileId = cleanText(body.profileId, 64);
    const profile = profileId
      ? await prisma.memberProfile.findUnique({ where: { id: profileId }, include: { user: true } })
      : null;
    if (!profile?.isDemoProfile) {
      return NextResponse.json({ error: "Demo profile not found." }, { status: 404 });
    }

    if (action === "edit") {
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
          data: {
            firstName,
            lastName,
            city: profileData.city,
            profession: profileData.profession,
          },
        });
        return tx.memberProfile.update({
          where: { id: profile.id },
          data: profileData,
          include: { user: true },
        });
      });

      await appendAdminAudit({
        actorUserId: admin.id,
        action: "demo.profile.edited",
        entityType: "MemberProfile",
        entityId: profile.id,
        metadata: {
          synthetic: true,
          changedFields,
          mangalsaathId: mangalsaathIdForProfile(profile.id),
          visibilityPreserved: {
            demoVisible: profile.demoVisible,
            demoVisibleFrom: profile.demoVisibleFrom,
            demoVisibleUntil: profile.demoVisibleUntil,
          },
        },
        request,
      });

      return NextResponse.json({
        message: "AI profile updated. Mangalsaath ID and visibility status were preserved.",
        profile: serialize(updated),
      });
    }

    if (action === "show") {
      const updated = await prisma.memberProfile.update({
        where: { id: profile.id },
        data: { demoVisible: true, demoVisibleFrom: new Date(), demoVisibleUntil: null },
      });
      await appendAdminAudit({
        actorUserId: admin.id,
        action: "demo.profile.shown_manual",
        entityType: "MemberProfile",
        entityId: profile.id,
        metadata: { mode: "manual_until_hidden" },
        request,
      });
      return NextResponse.json({
        message: "Demo profile visibility enabled until manually hidden.",
        profile: serialize(updated),
      });
    }

    if (action === "hide") {
      const updated = await prisma.memberProfile.update({
        where: { id: profile.id },
        data: { demoVisible: false, demoVisibleUntil: null },
      });
      await appendAdminAudit({
        actorUserId: admin.id,
        action: "demo.profile.hidden_manual",
        entityType: "MemberProfile",
        entityId: profile.id,
        request,
      });
      return NextResponse.json({
        message: "Demo profile hidden.",
        profile: serialize(updated),
      });
    }

    if (action === "delete") {
      await prisma.user.delete({ where: { id: profile.userId } });
      await appendAdminAudit({
        actorUserId: admin.id,
        action: "demo.profile.deleted",
        entityType: "MemberProfile",
        entityId: profile.id,
        metadata: { synthetic: true, mangalsaathId: mangalsaathIdForProfile(profile.id) },
        request,
      });
      return NextResponse.json({ message: "Synthetic demo profile deleted." });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    return fail(error);
  }
}
