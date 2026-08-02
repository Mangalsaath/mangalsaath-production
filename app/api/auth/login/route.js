import { NextResponse } from "next/server";
import { readDb, writeDb, verifyPassword, createSession, uid } from "@/lib/db";
import {
  normalizeIndianMobile,
  rateLimit,
  rateLimitResponse,
  safeIdentifierKey,
  allowDemoOtp,
} from "@/lib/security";
import { createAndDeliverAdminChallenge, isSuperAdmin } from "@/lib/admin-otp";
import {
  relationalAuthEnabled,
  findRelationalUser,
  toAppUser,
  updateRelationalUser,
} from "@/lib/relational-auth";
import {
  adminSecurityQuestion,
  verifyAdminSecurityAnswer,
} from "@/lib/admin-security";
import { getSystemSettings } from "@/lib/settings-service";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MS = 15 * 60_000;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const identifier = String(body.identifier || body.email || "").trim();
  const password = String(body.password || "");
  const securityAnswer = String(body.securityAnswer || "");
  const limited = rateLimit(request, {
    key: `login:${safeIdentifierKey(identifier)}`,
    limit: 10,
    windowMs: 15 * 60_000,
  });
  if (!limited.allowed)
    return rateLimitResponse(
      limited,
      "Too many login attempts. Please try again later.",
    );
  if (!identifier || !password || password.length > 128)
    return NextResponse.json(
      { error: "Invalid email/mobile number or password." },
      { status: 401 },
    );

  const email = identifier.toLowerCase();
  const mobile = normalizeIndianMobile(identifier);
  const db = await readDb();
  const settings = await getSystemSettings();
  const relationalUser = relationalAuthEnabled()
    ? await findRelationalUser(identifier)
    : null;
  const user = relationalUser
    ? toAppUser(relationalUser)
    : db.users.find(
        (item) =>
          item.email?.toLowerCase() === email ||
          item.username?.toLowerCase() === email ||
          (mobile && normalizeIndianMobile(item.mobile) === mobile),
      );
  const now = Date.now();

  if (user?.lockedUntil && new Date(user.lockedUntil).getTime() > now) {
    return NextResponse.json(
      {
        error:
          "Account is temporarily locked. Please try again later or reset your password.",
      },
      { status: 423, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!user || !verifyPassword(password, user.passwordHash)) {
    if (user) {
      user.failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;
      user.lastFailedLoginAt = new Date().toISOString();
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(now + LOCK_MS).toISOString();
        user.failedLoginAttempts = 0;
      }
      db.activities.unshift({
        id: uid("a"),
        type: "login_failed",
        userId: user.id,
        description: "Failed login attempt",
        createdAt: new Date().toISOString(),
      });
      if (relationalUser)
        await updateRelationalUser(user.id, {
          failedLoginAttempts: user.failedLoginAttempts,
          lockedUntil: user.lockedUntil ? new Date(user.lockedUntil) : null,
        });
      await writeDb(db);
    }
    return NextResponse.json(
      { error: "Invalid email/mobile number or password." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (
    user.status &&
    !["active", "approved"].includes(String(user.status).toLowerCase())
  ) {
    return NextResponse.json(
      {
        error: "This account is not currently active. Please contact support.",
      },
      { status: 403 },
    );
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  if (relationalUser)
    await updateRelationalUser(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

  if (isSuperAdmin(user, settings)) {
    // Keep the Super Admin challenge invisible to ordinary members. The client
    // only reveals the security-answer field after valid admin credentials have
    // already been supplied.
    if (!securityAnswer) {
      return NextResponse.json(
        {
          requiresAdminSecurityAnswer: true,
          securityQuestion: adminSecurityQuestion(),
          message:
            "Super Admin credentials accepted. Enter your security answer to continue.",
        },
        {
          status: 202,
          headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
        },
      );
    }
    if (!verifyAdminSecurityAnswer(securityAnswer)) {
      db.activities.unshift({
        id: uid("a"),
        type: "admin_security_answer_failed",
        userId: user.id,
        description: "Incorrect Super Admin security answer",
        createdAt: new Date().toISOString(),
      });
      await writeDb(db);
      return NextResponse.json(
        { error: `Incorrect security answer for: ${adminSecurityQuestion()}` },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    try {
      const challenge = await createAndDeliverAdminChallenge(db, user, settings);
      db.activities.unshift({
        id: uid("a"),
        type: "admin_2fa_requested",
        userId: user.id,
        description:
          "Super Admin password and security answer accepted; email OTP requested",
        createdAt: new Date().toISOString(),
      });
      await writeDb(db);
      const payload = {
        requiresAdminEmailOtp: true,
        challengeId: challenge.challengeId,
        expiresInMinutes: challenge.expiresInMinutes,
        emailMasked: challenge.emailMasked,
        message:
          "Enter the OTP sent to the configured Super Admin email address.",
      };
      if (allowDemoOtp()) payload.demoEmailOtp = challenge.demoEmailOtp;
      return NextResponse.json(payload, {
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
    } catch (error) {
      db.activities.unshift({
        id: uid("a"),
        type: "admin_2fa_delivery_failed",
        userId: user.id,
        description: String(error.message || "OTP delivery failed").slice(
          0,
          180,
        ),
        createdAt: new Date().toISOString(),
      });
      await writeDb(db);
      return NextResponse.json(
        { error: error.message || "Unable to deliver Super Admin OTPs." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  user.lastLoginAt = new Date().toISOString();
  db.activities.unshift({
    id: uid("a"),
    type: "login",
    userId: user.id,
    description: "Successful login",
    createdAt: new Date().toISOString(),
  });
  await writeDb(db);
  const token = await createSession(user.id, request);
  const { passwordHash, failedLoginAttempts, lockedUntil, ...safe } = user;
  return NextResponse.json(
    { token, user: safe },
    { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
  );
}
