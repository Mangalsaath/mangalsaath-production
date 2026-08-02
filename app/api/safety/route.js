import { NextResponse } from "next/server";
import { getUser, readDb, writeDb, uid, isDatabaseWriteConflict } from "@/lib/db";
import { sanitizeReport } from "@/lib/safety";

const categories = new Set(["fake-profile", "harassment", "inappropriate-content", "fraud", "spam", "other"]);
const now = () => new Date().toISOString();

function conflict() {
  return NextResponse.json({ error: "Your data changed in another request. Please retry." }, { status: 409 });
}

export async function GET(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readDb();
  const blocked = (db.blocks || []).filter((item) => item.blockerUserId === user.id && item.active !== false).map((item) => {
    const profile = db.profiles.find((p) => p.userId === item.blockedUserId);
    return { id: item.id, userId: item.blockedUserId, profileId: profile?.id || null, name: profile?.name || "Member", createdAt: item.createdAt };
  });
  const reports = (db.reports || []).filter((item) => item.reporterUserId === user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(sanitizeReport);
  return NextResponse.json({ blocked, reports }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const db = await readDb();
  const targetProfile = db.profiles.find((p) => p.id === body.profileId);
  if (!targetProfile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  if (targetProfile.userId === user.id) return NextResponse.json({ error: "You cannot perform this action on your own profile." }, { status: 400 });
  db.blocks = db.blocks || [];
  db.reports = db.reports || [];

  if (body.action === "block") {
    const existing = db.blocks.find((item) => item.blockerUserId === user.id && item.blockedUserId === targetProfile.userId);
    if (existing) { existing.active = true; existing.updatedAt = now(); }
    else db.blocks.push({ id: uid("block"), blockerUserId: user.id, blockedUserId: targetProfile.userId, active: true, createdAt: now(), updatedAt: now() });
    db.interests = (db.interests || []).map((interest) => ((interest.fromUserId === user.id && interest.toUserId === targetProfile.userId) || (interest.fromUserId === targetProfile.userId && interest.toUserId === user.id)) && ["Pending", "Accepted"].includes(interest.status) ? { ...interest, status: "Blocked", updatedAt: now() } : interest);
    db.notifications = (db.notifications || []).filter((notification) => !(notification.userId === user.id && notification.profileId === targetProfile.id));
    try { await writeDb(db); } catch (error) { if (isDatabaseWriteConflict(error)) return conflict(); throw error; }
    return NextResponse.json({ message: "Member blocked. They can no longer contact or discover you." });
  }

  if (body.action === "report") {
    const category = String(body.category || "").trim();
    const details = String(body.details || "").trim().slice(0, 1000);
    if (!categories.has(category)) return NextResponse.json({ error: "Please select a valid report category." }, { status: 400 });
    if (details.length < 10) return NextResponse.json({ error: "Please provide at least 10 characters of detail." }, { status: 400 });
    const duplicate = db.reports.find((item) => item.reporterUserId === user.id && item.targetUserId === targetProfile.userId && item.status === "open");
    if (duplicate) return NextResponse.json({ error: "You already have an open report for this member." }, { status: 409 });
    const report = { id: uid("report"), reporterUserId: user.id, targetUserId: targetProfile.userId, targetProfileId: targetProfile.id, category, details, status: "open", createdAt: now(), reviewedAt: null, reviewedBy: null, resolutionNote: "" };
    db.reports.unshift(report);
    db.adminAuditLogs = db.adminAuditLogs || [];
    db.adminAuditLogs.unshift({ id: uid("aal"), actorUserId: user.id, action: "member_report_submitted", targetUserId: targetProfile.userId, targetProfileId: targetProfile.id, createdAt: report.createdAt });
    try { await writeDb(db); } catch (error) { if (isDatabaseWriteConflict(error)) return conflict(); throw error; }
    return NextResponse.json({ report: sanitizeReport(report), message: "Report submitted for administrator review." }, { status: 201 });
  }
  return NextResponse.json({ error: "Invalid safety action." }, { status: 400 });
}

export async function DELETE(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profileId = new URL(request.url).searchParams.get("profileId");
  const db = await readDb();
  const targetProfile = db.profiles.find((p) => p.id === profileId);
  if (!targetProfile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  const block = (db.blocks || []).find((item) => item.blockerUserId === user.id && item.blockedUserId === targetProfile.userId && item.active !== false);
  if (!block) return NextResponse.json({ error: "This member is not blocked." }, { status: 404 });
  block.active = false; block.updatedAt = now();
  try { await writeDb(db); } catch (error) { if (isDatabaseWriteConflict(error)) return conflict(); throw error; }
  return NextResponse.json({ message: "Member unblocked." });
}
