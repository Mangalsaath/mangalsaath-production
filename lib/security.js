import crypto from "crypto";

const buckets = globalThis.__msRateBuckets || new Map();
globalThis.__msRateBuckets = buckets;

export function getClientIp(request) {
  return (request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "local")
    .split(",")[0].trim().slice(0, 100);
}

export function rateLimit(request, { key = "global", limit = 60, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const id = `${key}:${getClientIp(request)}`;
  const entry = buckets.get(id);
  if (!entry || entry.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs, retryAfterSeconds: 0 };
  }
  entry.count += 1;
  buckets.set(id, entry);
  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
  };
}

export function rateLimitResponse(result, message = "Too many requests. Please try again later.") {
  return Response.json({ error: message }, {
    status: 429,
    headers: { "Retry-After": String(result.retryAfterSeconds || 60), "Cache-Control": "no-store" }
  });
}

export function cleanText(value, max = 200) {
  return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").toLowerCase());
}

export function validatePassword(password) {
  const value = String(password || "");
  const checks = {
    minLength: value.length >= 8,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /\d/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value),
    maxLength: value.length <= 128
  };
  return { valid: Object.values(checks).every(Boolean), checks };
}

export function normalizeIndianMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return digits;
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) return digits.slice(2);
  return "";
}

function otpSecret() {
  const secret = process.env.APP_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("APP_SECRET must contain at least 32 characters in production.");
  }
  return secret || "mangalsaath-development-only-secret";
}

export function hashOtp(otp, salt) {
  return crypto.createHmac("sha256", otpSecret()).update(`${salt}:${String(otp)}`).digest("hex");
}

export function verifyOtp(otp, salt, expectedHash) {
  if (!expectedHash) return false;
  const actual = Buffer.from(hashOtp(otp, salt), "hex");
  const expected = Buffer.from(String(expectedHash), "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function safeIdentifierKey(value) {
  return crypto.createHash("sha256").update(String(value || "").trim().toLowerCase()).digest("hex").slice(0, 16);
}

export function allowDemoOtp() {
  return process.env.NODE_ENV !== "production" && process.env.ALLOW_DEMO_OTP === "true";
}
