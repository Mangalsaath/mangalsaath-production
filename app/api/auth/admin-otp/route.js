import { NextResponse } from "next/server";
import { readDb, writeDb, createSession, uid } from "@/lib/db";
import { rateLimit, rateLimitResponse, verifyOtp } from "@/lib/security";
import { relationalAuthEnabled, findRelationalUserById, toAppUser } from "@/lib/relational-auth";
import { isSuperAdminRole } from "@/lib/roles";

const MAX_ATTEMPTS = 5;

export async function POST(request) {
  const limited = rateLimit(request, { key: "admin-dual-otp", limit: 10, windowMs: 15 * 60_000 });
  if (!limited.allowed) return rateLimitResponse(limited, "Too many Super Admin OTP attempts. Please try again later.");
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const challengeId = String(body.challengeId || "").trim();
  const emailOtp = String(body.emailOtp || "").replace(/\D/g, "");
  const db = await readDb();
  const challenge = (db.adminAuthChallenges || []).find((item) => item.id === challengeId);
  const now = Date.now();
  if (!challenge || new Date(challenge.expiresAt).getTime() <= now) {
    db.adminAuthChallenges = (db.adminAuthChallenges || []).filter((item) => item.id !== challengeId && new Date(item.expiresAt).getTime() > now);
    await writeDb(db);
    return NextResponse.json({ error: "The Super Admin OTP challenge has expired. Please log in again." }, { status: 410, headers: { "Cache-Control": "no-store" } });
  }
  challenge.attempts = Number(challenge.attempts || 0) + 1;
const emailValid = emailOtp.length === 6 && verifyOtp(emailOtp, challenge.emailSalt, challenge.emailOtpHash);
  if (!emailValid) {
    if (challenge.attempts >= MAX_ATTEMPTS) db.adminAuthChallenges = db.adminAuthChallenges.filter((item) => item.id !== challenge.id);
    db.activities.unshift({ id: uid("a"), type: "admin_2fa_failed", userId: challenge.userId, description: "Invalid Super Admin email OTP attempt", createdAt: new Date().toISOString() });
    await writeDb(db);
    return NextResponse.json({ error: challenge.attempts >= MAX_ATTEMPTS ? "Too many invalid OTP attempts. Please log in again." : "The email OTP is incorrect." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const relationalUser = relationalAuthEnabled() ? await findRelationalUserById(challenge.userId) : null;
  const user = isSuperAdminRole(relationalUser?.role) ? toAppUser(relationalUser) : db.users.find((item) => item.id === challenge.userId && isSuperAdminRole(item.role));
  if (!user) return NextResponse.json({ error: "Super Admin account was not found." }, { status: 403 });
  db.adminAuthChallenges = db.adminAuthChallenges.filter((item) => item.id !== challenge.id);
  user.lastLoginAt = new Date().toISOString();
  db.activities.unshift({ id: uid("a"), type: "admin_2fa_success", userId: user.id, description: "Super Admin email OTP verified", createdAt: new Date().toISOString() });
  db.adminAuditLogs.unshift({ id: uid("aal"), adminUserId: user.id, action: "super_admin_login", details: "Password, security answer and email OTP verified.", createdAt: new Date().toISOString() });
  await writeDb(db);
  const token = await createSession(user.id, request, { adminDualOtpVerified: true });
  const { passwordHash, failedLoginAttempts, lockedUntil, ...safe } = user;
  return NextResponse.json({ token, user: safe, message: "Super Admin verification successful." }, { headers: { "Cache-Control": "no-store", "Pragma": "no-cache" } });
}
