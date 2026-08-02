import { NextResponse } from "next/server";
import crypto from "crypto";
import { readDb, writeDb, hashPassword, uid } from "@/lib/db";
import { allowDemoOtp, hashOtp, normalizeIndianMobile, rateLimit, rateLimitResponse, validatePassword, verifyOtp } from "@/lib/security";
import { sendOtpEmail } from "@/lib/email";
import { relationalAuthEnabled, findRelationalUser, findRelationalUserById, toAppUser, updateRelationalUser, revokeAllRelationalSessions } from "@/lib/relational-auth";

const TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const GENERIC_MESSAGE = "If an account matches those details, a recovery OTP has been sent.";

async function deliverOtp(user, otp) {
  if (!user?.email) throw new Error("No recovery email is configured for this account.");
  return sendOtpEmail({ email: user.email, otp, purpose: "MangalSaath password reset", expiresInMinutes: TTL_MS / 60_000 });
}

export async function POST(request) {
  const limited = rateLimit(request, { key: "password-reset", limit: 8, windowMs: 15 * 60_000 });
  if (!limited.allowed) return rateLimitResponse(limited, "Too many recovery attempts. Please try again later.");
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const action = String(body.action || "request");
  const db = await readDb();
  db.passwordResetChallenges = Array.isArray(db.passwordResetChallenges) ? db.passwordResetChallenges : [];
  const now = Date.now();
  db.passwordResetChallenges = db.passwordResetChallenges.filter((item) => new Date(item.expiresAt).getTime() > now);

  if (action === "request") {
    const identifier = String(body.identifier || "").trim();
    const email = identifier.toLowerCase();
    const mobile = normalizeIndianMobile(identifier);
    if (!identifier) return NextResponse.json({ error: "Enter your registered email address or mobile number." }, { status: 400 });
    const relationalUser = relationalAuthEnabled() ? await findRelationalUser(identifier) : null;
    const user = relationalUser ? toAppUser(relationalUser) : db.users.find((item) => item.email?.toLowerCase() === email || (mobile && normalizeIndianMobile(item.mobile) === mobile));
    if (!user) return NextResponse.json({ message: GENERIC_MESSAGE }, { headers: { "Cache-Control": "no-store" } });
    const otp = String(crypto.randomInt(100000, 1000000));
    const salt = crypto.randomBytes(16).toString("hex");
    const challengeId = uid("reset");
    db.passwordResetChallenges = db.passwordResetChallenges.filter((item) => item.userId !== user.id);
    db.passwordResetChallenges.push({ id: challengeId, userId: user.id, otpHash: hashOtp(otp, salt), salt, attempts: 0, expiresAt: new Date(now + TTL_MS).toISOString(), createdAt: new Date(now).toISOString() });
    let delivery;
    try { delivery = await deliverOtp(user, otp); } catch (error) { return NextResponse.json({ error: error.message }, { status: 502 }); }
    await writeDb(db);
    const payload = { message: GENERIC_MESSAGE, challengeId, expiresInSeconds: TTL_MS / 1000 };
    if (delivery.mode === "development" && allowDemoOtp()) payload.demoOtp = otp;
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  }

  if (action === "reset") {
    const challenge = db.passwordResetChallenges.find((item) => item.id === String(body.challengeId || ""));
    const otp = String(body.otp || "").replace(/\D/g, "");
    const password = String(body.password || "");
    if (!challenge) return NextResponse.json({ error: "Recovery session expired. Please request a new OTP." }, { status: 410 });
    if (challenge.attempts >= MAX_ATTEMPTS) return NextResponse.json({ error: "Too many incorrect OTP attempts. Start again." }, { status: 429 });
    challenge.attempts += 1;
    if (otp.length !== 6 || !verifyOtp(otp, challenge.salt, challenge.otpHash)) {
      await writeDb(db);
      return NextResponse.json({ error: "Incorrect recovery OTP." }, { status: 400 });
    }
    if (!validatePassword(password).valid) return NextResponse.json({ error: "Password must have 8–128 characters with uppercase, lowercase, number and special symbol." }, { status: 400 });
    const relationalUser = relationalAuthEnabled() ? await findRelationalUserById(challenge.userId) : null;
    const user = relationalUser ? toAppUser(relationalUser) : db.users.find((item) => item.id === challenge.userId);
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    user.passwordHash = hashPassword(password);
    if (relationalUser) {
      await updateRelationalUser(user.id, {
        passwordHash: user.passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordChangedAt: new Date(),
        mustChangePassword: false
      });
      await revokeAllRelationalSessions(user.id);
    }
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.mustChangePassword = false;
    user.updatedAt = new Date().toISOString();
    db.sessions = db.sessions.filter((session) => session.userId !== user.id);
    db.passwordResetChallenges = db.passwordResetChallenges.filter((item) => item.id !== challenge.id);
    db.activities.unshift({ id: uid("a"), type: "password_reset", userId: user.id, description: `${user.firstName} ${user.lastName} reset the account password`, createdAt: new Date().toISOString() });
    await writeDb(db);
    return NextResponse.json({ message: "Password reset successfully. Please log in with your new password." }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ error: "Unsupported recovery action." }, { status: 400 });
}
