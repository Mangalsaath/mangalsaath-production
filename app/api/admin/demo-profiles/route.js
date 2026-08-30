import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uid } from "@/lib/db";
import { requireAdmin, ADMIN_PERMISSIONS, isAdminAuthorizationError } from "@/lib/admin-auth";
import { appendAdminAudit } from "@/lib/admin-audit";
import { cleanText, rateLimit } from "@/lib/security";
import { demoVisibilityWindow, getDemoProfileControl, saveDemoProfileControl } from "@/lib/demo-profile-control";

function fail(error) {
  if (isAdminAuthorizationError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("Demo profile admin API error", error);
  return NextResponse.json({ error: "Unable to complete the demo profile request." }, { status: 500 });
}

function serialize(profile) {
  return { ...profile, dateOfBirth: profile.dateOfBirth?.toISOString().slice(0, 10), demoVisibleFrom: profile.demoVisibleFrom?.toISOString() || null, demoVisibleUntil: profile.demoVisibleUntil?.toISOString() || null, createdAt: profile.createdAt?.toISOString(), updatedAt: profile.updatedAt?.toISOString() };
}

export async function GET(request) {
  try {
    await requireAdmin(request, { permission: ADMIN_PERMISSIONS.DEMO_PROFILES_READ, requireDualOtp: true });
    const [control, profiles] = await Promise.all([
      getDemoProfileControl(),
      prisma.memberProfile.findMany({ where: { isDemoProfile: true }, include: { user: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
    ]);
    return NextResponse.json({ control, profiles: profiles.map(serialize) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return fail(error); }
}

export async function POST(request) {
  const limited = rateLimit(request, { key: "admin-demo-profiles", limit: 30, windowMs: 60_000 });
  if (!limited.allowed) return NextResponse.json({ error: "Too many demo profile actions. Please wait." }, { status: 429 });
  try {
    const { user: admin } = await requireAdmin(request, { permission: ADMIN_PERMISSIONS.DEMO_PROFILES_WRITE, requireDualOtp: true });
    if (String(admin.role).toLowerCase() !== "super_admin") return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
    const body = await request.json();
    const action = cleanText(body.action, 50);

    if (action === "save-control") {
      const saved = await saveDemoProfileControl(body.control || {});
      await appendAdminAudit({ actorUserId: admin.id, action: "demo.control.updated", entityType: "BusinessSetting", entityId: saved.id, metadata: saved.value, request });
      return NextResponse.json({ message: "Demo profile controls updated.", control: saved.value });
    }

    if (action === "create") {
      const control = await getDemoProfileControl();
      const firstName = cleanText(body.firstName, 80);
      const lastName = cleanText(body.lastName, 80);
      if (!firstName || !lastName) return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
      const userId = uid("demo_user");
      const profileId = uid("demo_profile");
      const window = demoVisibilityWindow({ enabled: body.visible !== false, durationMinutes: body.durationMinutes || control.defaultDurationMinutes });
      const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const created = await prisma.$transaction(async (tx) => {
        await tx.user.create({ data: { id: userId, username: `demo_${unique}`, firstName, lastName, email: `demo_${unique}@example.invalid`, mobile: `demo_${unique}`.slice(0, 20), passwordHash: "!synthetic-demo-no-login!", role: "member", status: "active", emailVerified: true, verified: true, approvalStatus: "approved", approvedBy: admin.id, approvedAt: new Date() } });
        return tx.memberProfile.create({ data: { id: profileId, userId, name: `${firstName} ${lastName}`, gender: cleanText(body.gender, 30) || null, age: Number(body.age) || 25, maritalStatus: cleanText(body.maritalStatus, 60) || "Never Married", height: Number(body.height) || 165, religion: cleanText(body.religion, 80) || null, caste: cleanText(body.caste, 100) || null, education: cleanText(body.education, 180) || null, profession: cleanText(body.profession, 180) || null, country: cleanText(body.country, 100) || "India", state: cleanText(body.state, 120) || null, city: cleanText(body.city, 120) || null, about: cleanText(body.about, 2000) || "Synthetic demonstration profile created for controlled platform testing.", photoModerationStatus: "approved", verified: true, verificationStatus: "approved", trustedProfile: true, isDemoProfile: true, demoVisible: window.enabled, demoVisibleFrom: window.startsAt, demoVisibleUntil: window.expiresAt, demoCreatedBy: admin.id, demoLabel: cleanText(body.demoLabel, 80) || control.labelForAdmins } }, include: { user: true } });
      });
      await appendAdminAudit({ actorUserId: admin.id, action: "demo.profile.created", entityType: "MemberProfile", entityId: created.id, metadata: { visibleUntil: created.demoVisibleUntil, synthetic: true }, request });
      return NextResponse.json({ message: "Synthetic demo profile created.", profile: serialize(created) }, { status: 201 });
    }

    const profileId = cleanText(body.profileId, 64);
    const profile = profileId ? await prisma.memberProfile.findUnique({ where: { id: profileId } }) : null;
    if (!profile?.isDemoProfile) return NextResponse.json({ error: "Demo profile not found." }, { status: 404 });

    if (action === "show") {
      const control = await getDemoProfileControl();
      const window = demoVisibilityWindow({ durationMinutes: body.durationMinutes || control.defaultDurationMinutes });
      const updated = await prisma.memberProfile.update({ where: { id: profile.id }, data: { demoVisible: true, demoVisibleFrom: window.startsAt, demoVisibleUntil: window.expiresAt } });
      await appendAdminAudit({ actorUserId: admin.id, action: "demo.profile.shown", entityType: "MemberProfile", entityId: profile.id, metadata: { visibleUntil: window.expiresAt }, request });
      return NextResponse.json({ message: "Demo profile visibility enabled.", profile: serialize(updated) });
    }

    if (action === "hide") {
      const updated = await prisma.memberProfile.update({ where: { id: profile.id }, data: { demoVisible: false, demoVisibleUntil: new Date() } });
      await appendAdminAudit({ actorUserId: admin.id, action: "demo.profile.hidden", entityType: "MemberProfile", entityId: profile.id, request });
      return NextResponse.json({ message: "Demo profile hidden.", profile: serialize(updated) });
    }

    if (action === "delete") {
      await prisma.user.delete({ where: { id: profile.userId } });
      await appendAdminAudit({ actorUserId: admin.id, action: "demo.profile.deleted", entityType: "MemberProfile", entityId: profile.id, metadata: { synthetic: true }, request });
      return NextResponse.json({ message: "Synthetic demo profile deleted." });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) { return fail(error); }
}
