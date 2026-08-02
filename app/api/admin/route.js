import { NextResponse } from "next/server";
import { readDb, writeDb, getUser, uid } from "@/lib/db";
import { requireAdmin, ADMIN_PERMISSIONS, isAdminAuthorizationError } from "@/lib/admin-auth";
import { appendAdminAudit } from "@/lib/admin-audit";
import { getRelationalAdminDashboard, useRelationalAdmin, serializeRecord } from "@/lib/admin-core";
import { prisma } from "@/lib/prisma";
import { cleanText, rateLimit } from "@/lib/security";
import { isAdminRole } from "@/lib/roles";

function errorResponse(error) {
  if (isAdminAuthorizationError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("Admin API error", error);
  return NextResponse.json({ error: "Unable to complete the admin request." }, { status: 500 });
}

export async function GET(request) {
  try {
    const { permissions } = await requireAdmin(request, { permission: ADMIN_PERMISSIONS.DASHBOARD_READ, requireDualOtp: true });
    if (useRelationalAdmin()) {
      const dashboard = await getRelationalAdminDashboard();
      if (!permissions.has(ADMIN_PERMISSIONS.MEMBERS_READ)) {
        dashboard.users = [];
        dashboard.verificationQueue = [];
        dashboard.memberNotes = [];
      }
      if (!permissions.has(ADMIN_PERMISSIONS.REPORTS_READ)) dashboard.reports = [];
      if (!permissions.has(ADMIN_PERMISSIONS.PLANS_READ)) dashboard.plans = [];
      if (!permissions.has(ADMIN_PERMISSIONS.PAYMENTS_READ)) dashboard.transactions = [];
      if (!permissions.has(ADMIN_PERMISSIONS.AUDIT_READ)) {
        dashboard.activities = [];
        dashboard.verificationAudits = [];
      }
      return NextResponse.json(dashboard, { headers: { "Cache-Control": "no-store" } });
    }
    const user = await getUser(request); if (!user || !isAdminRole(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const db = await readDb();
    return NextResponse.json({ storageMode: "legacy", users: db.users || [], stats: {}, reports: db.reports || [], plans: db.plans || [], transactions: db.transactions || [] });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request) {
  const limited = rateLimit(request, { key: "admin-core", limit: 60, windowMs: 60_000 });
  if (!limited.allowed) return NextResponse.json({ error: "Too many admin actions. Please wait." }, { status: 429 });
  try {
    const { user: admin } = await requireAdmin(request, { permission: ADMIN_PERMISSIONS.DASHBOARD_READ, requireDualOtp: true });
    const body = await request.json();
    if (!useRelationalAdmin()) return legacyPost(request, admin, body);
    const action = cleanText(body.action, 60);
    const note = cleanText(body.note, 500);

    if (["resolve-report", "dismiss-report"].includes(action)) {
      await requireAdmin(request, { permission: ADMIN_PERMISSIONS.REPORTS_RESOLVE, requireDualOtp: true });
      if (!note) return NextResponse.json({ error: "A resolution note is required." }, { status: 400 });
      const report = await prisma.reportRecord.findUnique({ where: { id: cleanText(body.reportId, 64) } });
      if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
      const updated = await prisma.reportRecord.update({ where: { id: report.id }, data: { status: action === "resolve-report" ? "resolved" : "dismissed", reviewedAt: new Date(), reviewedBy: admin.id, resolutionNote: note } });
      await appendAdminAudit({ actorUserId: admin.id, action: `report.${action === "resolve-report" ? "resolved" : "dismissed"}`, entityType: "ReportRecord", entityId: report.id, metadata: { note, targetUserId: report.targetUserId }, request });
      return NextResponse.json({ message: action === "resolve-report" ? "Report resolved." : "Report dismissed.", report: serializeRecord(updated) });
    }

    if (["approve", "reject", "request-info"].includes(action)) {
      await requireAdmin(request, { permission: ADMIN_PERMISSIONS.MEMBERS_VERIFY, requireDualOtp: true });
      if (action !== "approve" && !note) return NextResponse.json({ error: "A reason is required for this action." }, { status: 400 });
      const profileId = cleanText(body.profileId, 64);
      const profile = await prisma.memberProfile.findUnique({ where: { id: profileId } });
      if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
      const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "needs-information";
      const updated = await prisma.$transaction(async (tx) => {
        const changed = await tx.memberProfile.update({ where: { id: profile.id }, data: { verified: action === "approve", trustedProfile: action === "approve", verificationStatus: status, photoModerationNote: note || null } });
        await tx.user.update({ where: { id: profile.userId }, data: { verified: action === "approve", approvalStatus: action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending", approvedBy: action === "approve" ? admin.id : null, approvedAt: action === "approve" ? new Date() : null, approvalReason: note || null } });
        return changed;
      });
      await appendAdminAudit({ actorUserId: admin.id, action: `profile.verification.${action}`, entityType: "MemberProfile", entityId: profile.id, metadata: { note, userId: profile.userId }, request });
      return NextResponse.json({ message: action === "approve" ? "Member approved. Mobile verification remains a separate admin action." : action === "reject" ? "Member rejected." : "More information requested.", profile: serializeRecord(updated) });
    }

    if (["verify-mobile", "reject-mobile", "reset-mobile-verification"].includes(action)) {
      await requireAdmin(request, { permission: ADMIN_PERMISSIONS.MEMBERS_VERIFY, requireDualOtp: true });
      const targetUserId = cleanText(body.userId, 64);
      if (!targetUserId || targetUserId === admin.id) return NextResponse.json({ error: "Invalid member." }, { status: 400 });
      if (action === "reject-mobile" && !note) return NextResponse.json({ error: "A reason is required when rejecting a mobile number." }, { status: 400 });
      const target = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!target || target.role !== "member") return NextResponse.json({ error: "Member not found." }, { status: 404 });
      const verified = action === "verify-mobile";
      const status = verified ? "verified" : action === "reject-mobile" ? "rejected" : "pending";
      const updated = await prisma.user.update({ where: { id: target.id }, data: { mobileVerified: verified, mobileVerificationStatus: status, mobileVerificationMethod: verified ? "manual" : null, mobileVerifiedBy: verified ? admin.id : null, mobileVerifiedAt: verified ? new Date() : null } });
      await appendAdminAudit({ actorUserId: admin.id, action: `member.mobile.${status}`, entityType: "User", entityId: target.id, metadata: { note, method: verified ? "manual" : null }, request });
      return NextResponse.json({ message: verified ? "Mobile number marked as manually verified." : status === "rejected" ? "Mobile number rejected." : "Mobile verification reset to pending.", user: serializeRecord(updated) });
    }

    if (action === "add-member-note") {
      await requireAdmin(request, { permission: ADMIN_PERMISSIONS.MEMBERS_UPDATE_STATUS, requireDualOtp: true });
      const targetUserId = cleanText(body.userId, 64);
      if (!targetUserId || targetUserId === admin.id || !note) return NextResponse.json({ error: "Member and note are required." }, { status: 400 });
      const target = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!target || target.role !== "member") return NextResponse.json({ error: "Member not found." }, { status: 404 });
      const saved = await prisma.adminMemberNote.create({ data: { id: uid("amn"), memberId: target.id, authorId: admin.id, note } });
      await appendAdminAudit({ actorUserId: admin.id, action: "member.note.added", entityType: "User", entityId: target.id, metadata: { note }, request });
      return NextResponse.json({ message: "Internal note saved.", note: serializeRecord(saved) });
    }

    if (["activate-member", "suspend-member"].includes(action)) {
      await requireAdmin(request, { permission: ADMIN_PERMISSIONS.MEMBERS_UPDATE_STATUS, requireDualOtp: true });
      const targetUserId = cleanText(body.userId, 64);
      if (!targetUserId || targetUserId === admin.id) return NextResponse.json({ error: "Invalid member." }, { status: 400 });
      const target = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!target) return NextResponse.json({ error: "Member not found." }, { status: 404 });
      const status = action === "activate-member" ? "active" : "suspended";
      const updated = await prisma.$transaction(async (tx) => {
        const member = await tx.user.update({ where: { id: target.id }, data: { status } });
        if (status === "suspended") await tx.sessionRecord.deleteMany({ where: { userId: target.id } });
        return member;
      });
      await appendAdminAudit({ actorUserId: admin.id, action: `member.${status}`, entityType: "User", entityId: target.id, metadata: { note }, request });
      return NextResponse.json({ message: status === "active" ? "Member activated." : "Member suspended and signed out.", user: serializeRecord(updated) });
    }

    if (["approve-photo", "reject-photo"].includes(action)) {
      await requireAdmin(request, { permission: ADMIN_PERMISSIONS.PHOTOS_MODERATE, requireDualOtp: true });
      const profileId = cleanText(body.profileId, 64);
      const photoIdentifier = cleanText(body.photoIdentifier || "primary", 120);
      if (action === "reject-photo" && !note) return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
      const profile = await prisma.memberProfile.findUnique({ where: { id: profileId } });
      if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
      const moderationStatus = action === "approve-photo" ? "approved" : "rejected";
      const event = await prisma.$transaction(async (tx) => {
        await tx.memberProfile.update({ where: { id: profile.id }, data: { photoModerationStatus: moderationStatus, photoModerationNote: note || null } });
        return tx.photoModerationEvent.create({ data: { id: uid("pme"), profileId: profile.id, photoIdentifier, moderatorUserId: admin.id, action: moderationStatus, reason: note || null } });
      });
      await appendAdminAudit({ actorUserId: admin.id, action: `photo.${moderationStatus}`, entityType: "MemberProfile", entityId: profile.id, metadata: { photoIdentifier, note }, request });
      return NextResponse.json({ message: `Photo ${moderationStatus}.`, event: serializeRecord(event) });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) { return errorResponse(error); }
}

async function legacyPost(request, admin, body) {
  const { profileId, action, note = "", reportId } = body;
  const db = await readDb();
  if (["resolve-report", "dismiss-report"].includes(action)) {
    const report = (db.reports || []).find((r) => r.id === reportId); if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    const clean = String(note || "").trim().slice(0, 500); if (!clean) return NextResponse.json({ error: "A resolution note is required." }, { status: 400 });
    report.status = action === "resolve-report" ? "resolved" : "dismissed"; report.reviewedAt = new Date().toISOString(); report.reviewedBy = admin.id; report.resolutionNote = clean;
    await writeDb(db); return NextResponse.json({ message: "Saved.", report });
  }
  const index = (db.profiles || []).findIndex((p) => p.id === profileId); if (index < 0) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  db.profiles[index].verificationStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "needs-information";
  db.profiles[index].verified = action === "approve";
  const member = (db.users || []).find((item) => item.id === db.profiles[index].userId);
  if (member) { member.verified = action === "approve"; member.approvalStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending"; }
  await writeDb(db); return NextResponse.json({ message: "Saved.", profile: db.profiles[index] });
}
