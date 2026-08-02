import crypto from "crypto";
import { hashOtp } from "@/lib/security";
import { uid } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";
import { isSuperAdminRole } from "@/lib/roles";

export function isSuperAdmin(user, settings = {}) {
  if (!user || !isSuperAdminRole(user.role)) return false;
  const configuredEmail = String(settings.superAdminEmail || "").trim().toLowerCase();
  const configuredMobile = String(settings.superAdminMobile || "").replace(/\D/g, "").slice(-10);
  const userEmail = String(user.email || "").trim().toLowerCase();
  const userMobile = String(user.mobile || "").replace(/\D/g, "").slice(-10);
  // When dedicated contacts are configured, bind Super Admin identity to them.
  if (configuredEmail || configuredMobile) {
    return (!configuredEmail || configuredEmail === userEmail) && (!configuredMobile || configuredMobile === userMobile);
  }
  // Backward-compatible bootstrap: the first/only admin is treated as Super Admin.
  return true;
}

export function resolveSuperAdminContacts(user, settings = {}) {
  const email = String(settings.superAdminEmail || user?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Super Admin email is not configured.");
  return { email };
}

export function maskEmail(email) {
  const [name, domain] = String(email).split("@");
  if (!domain) return "configured email";
  return `${name.slice(0, 2)}${"*".repeat(Math.max(2, name.length - 2))}@${domain}`;
}
export async function createAndDeliverAdminChallenge(db, user, settingsOverride = null) {
  const settings = settingsOverride || db.settings || {};
  const { email } = resolveSuperAdminContacts(user, settings);
  const now = Date.now();
  const ttlMinutes = Math.min(15, Math.max(2, Number(settings.adminOtpExpiryMinutes || 5)));
  const emailOtp = String(crypto.randomInt(100000, 1000000));
  const emailSalt = crypto.randomBytes(16).toString("hex");
  const id = uid("admin2fa");

  const emailResult = await sendOtpEmail({
    email,
    otp: emailOtp,
    purpose: "MangalSaath Super Admin login",
    expiresInMinutes: ttlMinutes
  });

  db.adminAuthChallenges = (db.adminAuthChallenges || []).filter((item) => new Date(item.expiresAt).getTime() > now && item.userId !== user.id);
  db.adminAuthChallenges.push({
    id, userId: user.id,
    emailOtpHash: hashOtp(emailOtp, emailSalt), emailSalt,
    attempts: 0, createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMinutes * 60_000).toISOString()
  });
  return {
    challengeId: id,
    expiresInMinutes: ttlMinutes,
    emailMasked: maskEmail(email),
    demoEmailOtp: emailResult.mode === "development" ? emailOtp : undefined
  };
}
