import crypto from "node:crypto";

function digest(value) {
  const secret = String(process.env.APP_SECRET || "");
  return crypto.createHmac("sha256", secret).update(String(value || "").trim().toLowerCase()).digest();
}

export function adminSecurityQuestion() {
  return String(process.env.ADMIN_SECURITY_QUESTION || "Enter your private Super Admin security answer").trim();
}

export function verifyAdminSecurityAnswer(answer) {
  const expected = String(process.env.ADMIN_SECURITY_ANSWER || "").trim();
  if (!expected) throw new Error("Super Admin security answer is not configured.");
  const actualDigest = digest(answer);
  const expectedDigest = digest(expected);
  return actualDigest.length === expectedDigest.length && crypto.timingSafeEqual(actualDigest, expectedDigest);
}
