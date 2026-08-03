import { NextResponse } from "next/server";
import crypto from "crypto";
import { readDb, writeDb, uid, hashPassword, createSession } from "@/lib/db";
import { allowDemoOtp, cleanText, hashOtp, isEmail, normalizeIndianMobile, rateLimit, rateLimitResponse, validatePassword, verifyOtp } from "@/lib/security";
import { relationalAuthEnabled, relationalIdentityExists, createRelationalMember } from "@/lib/relational-auth";
import { sendOtpEmail } from "@/lib/email";
import { getSystemSettings } from "@/lib/settings-service";

const OTP_TTL_MS = 10 * 60_000;
const RESEND_COOLDOWN_MS = 60_000;
const MAX_OTP_ATTEMPTS = 5;

function publicUser(user) { const { passwordHash, failedLoginAttempts, lockedUntil, ...safe } = user; return safe; }

async function sendRegistrationOtp(email, otp) {
  return sendOtpEmail({
    email,
    otp,
    purpose: "MangalSaath member registration",
    expiresInMinutes: OTP_TTL_MS / 60_000
  });
}

export async function POST(request) {
  const limited = rateLimit(request, { key: "register", limit: 10, windowMs: 60 * 60_000 });
  if (!limited.allowed) return rateLimitResponse(limited, "Too many registration attempts. Please try again later.");
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const action = String(body.action || "request-otp");
  const db = await readDb();
  const settings = await getSystemSettings();
  if (settings.maintenanceMode === true || String(settings.maintenanceMode).toLowerCase() === "true") return NextResponse.json({ error: "Mangalsaath is temporarily under maintenance." }, { status: 503, headers: { "Retry-After": "300" } });
  if (settings.registrationEnabled === false || String(settings.registrationEnabled).toLowerCase() === "false") return NextResponse.json({ error: "New registrations are currently paused." }, { status: 403 });
  db.otpChallenges = Array.isArray(db.otpChallenges) ? db.otpChallenges : [];
  db.pendingRegistrations = Array.isArray(db.pendingRegistrations) ? db.pendingRegistrations : [];
  const now = Date.now();
  db.otpChallenges = db.otpChallenges.filter((item) => new Date(item.expiresAt).getTime() > now);
  db.pendingRegistrations = db.pendingRegistrations.filter((item) => new Date(item.expiresAt).getTime() > now);

  if (action === "request-otp") {
    const firstName = cleanText(body.firstName, 60);
    const lastName = cleanText(body.lastName, 60);
    const email = String(body.email || "").trim().toLowerCase();
    const mobile = normalizeIndianMobile(body.mobile);
    const password = String(body.password || "");
    const termsAccepted = body.termsAccepted === true;
    if (!termsAccepted) return NextResponse.json({ error: "Please accept the Terms and Privacy Policy." }, { status: 400 });
    if (!firstName || !lastName || !isEmail(email) || !mobile) return NextResponse.json({ error: "Enter your name, surname, valid email and Indian mobile number." }, { status: 400 });
    if (!validatePassword(password).valid) return NextResponse.json({ error: "Password must have 8–128 characters with uppercase, lowercase, number and special symbol." }, { status: 400 });
    if (relationalAuthEnabled() && await relationalIdentityExists(email, mobile)) return NextResponse.json({ error: "Email address or mobile number is already registered." }, { status: 409 });
    if (db.users.some((user) => user.email?.toLowerCase() === email)) return NextResponse.json({ error: "Email address is already registered." }, { status: 409 });
    if (db.users.some((user) => normalizeIndianMobile(user.mobile) === mobile)) return NextResponse.json({ error: "Mobile number is already registered." }, { status: 409 });
    const previous = db.otpChallenges.find((item) => item.mobile === mobile || item.email === email);
    if (previous && now - new Date(previous.createdAt).getTime() < RESEND_COOLDOWN_MS) {
      return NextResponse.json({ error: "Please wait 60 seconds before requesting another OTP." }, { status: 429, headers: { "Retry-After": "60" } });
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const challengeId = uid("otp");
    const salt = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(now + OTP_TTL_MS).toISOString();
    db.otpChallenges = db.otpChallenges.filter((item) => item.mobile !== mobile && item.email !== email);
    db.pendingRegistrations = db.pendingRegistrations.filter((item) => item.mobile !== mobile && item.email !== email);
    db.otpChallenges.push({ id: challengeId, mobile, email, otpHash: hashOtp(otp, salt), salt, attempts: 0, expiresAt, createdAt: new Date(now).toISOString() });
    db.pendingRegistrations.push({ challengeId, firstName, lastName, email, mobile, passwordHash: hashPassword(password), termsAcceptedAt: new Date(now).toISOString(), expiresAt, createdAt: new Date(now).toISOString() });
    let delivery;
    try { delivery = await sendRegistrationOtp(email, otp); } catch (error) { return NextResponse.json({ error: error.message }, { status: 502 }); }
    await writeDb(db);
    const payload = { message: `OTP sent to ${email.replace(/(^.).*(@.*$)/, "$1***$2")}.`, challengeId, expiresInSeconds: OTP_TTL_MS / 1000 };
    if (delivery.mode === "development" && allowDemoOtp()) payload.demoOtp = otp;
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  }

  if (action === "verify-otp") {
    const challengeId = String(body.challengeId || "");
    const otp = String(body.otp || "").replace(/\D/g, "");
    const challenge = db.otpChallenges.find((item) => item.id === challengeId);
    const pending = db.pendingRegistrations.find((item) => item.challengeId === challengeId);
    if (!challenge || !pending) return NextResponse.json({ error: "OTP session expired. Please request a new OTP." }, { status: 410 });
    if (challenge.attempts >= MAX_OTP_ATTEMPTS) return NextResponse.json({ error: "Too many incorrect OTP attempts. Please request a new OTP." }, { status: 429 });
    challenge.attempts += 1;
    if (otp.length !== 6 || !verifyOtp(otp, challenge.salt, challenge.otpHash)) {
      await writeDb(db);
      return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 400 });
    }
    if (relationalAuthEnabled() && await relationalIdentityExists(pending.email, pending.mobile)) return NextResponse.json({ error: "This email or mobile number is already registered." }, { status: 409 });
    if (db.users.some((user) => user.email?.toLowerCase() === pending.email || normalizeIndianMobile(user.mobile) === pending.mobile)) return NextResponse.json({ error: "This email or mobile number is already registered." }, { status: 409 });
    const firstName = cleanText(pending.firstName, 60);
    const lastName = cleanText(pending.lastName, 60);
    const fullName = `${firstName} ${lastName}`.trim();
    const userId = uid("u"), profileId = uid("p"), createdAt = new Date().toISOString();
    const user = { id: userId, firstName, lastName, email: pending.email, mobile: pending.mobile, passwordHash: pending.passwordHash, city: "", profession: "", membership: "Free", membershipPlanId: "free", mobileVerified: false, emailVerified: true, verified: false, role: "member", status: "active", profileId, failedLoginAttempts: 0, lockedUntil: null, termsAcceptedAt: pending.termsAcceptedAt, createdAt };
    const profile = { id: profileId, userId, name: fullName, gender: "", dateOfBirth: "", placeOfBirth: "", timeOfBirth: "", age: null, maritalStatus: "", height: "", religion: "", caste: "", subCaste: "", gotra: "", education: "", profession: "", country: "India", state: "", city: "", about: "", partnerAgeMin: 18, partnerAgeMax: 60, partnerReligion: "Open", partnerCaste: "Open", partnerLocation: "Open", partnerMaritalStatus: "Open", partnerEducation: "Open", partnerProfession: "Open", photos: [], primaryPhoto: "", score: 0, verified: false, verificationStatus: "not-requested", trustedProfile: false, initials: `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase(), createdAt };
    if (relationalAuthEnabled()) await createRelationalMember({ user, profile });
    // Compatibility mirror: non-authentication modules still read ApplicationState until their cutover.
    db.users.push(user);
    db.profiles.push(profile);
    db.activities.unshift({ id: uid("a"), type: "registration", userId, profileId, description: `${fullName} registered with email OTP verification; mobile pending manual verification`, createdAt });
    db.notifications.unshift({ id: uid("n"), userId, type: "welcome", title: "Welcome to Mangalsaath", message: "Your email is verified. Your mobile number is pending manual verification by the MangalSaath team.", read: false, createdAt });
    db.otpChallenges = db.otpChallenges.filter((item) => item.id !== challengeId);
    db.pendingRegistrations = db.pendingRegistrations.filter((item) => item.challengeId !== challengeId);
    await writeDb(db);
    const token = await createSession(user.id, request);
    return NextResponse.json({ token, user: publicUser(user), message: "Email verified and account created. Mobile verification is pending Admin review." }, { status: 201, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ error: "Unsupported registration action." }, { status: 400 });
}
