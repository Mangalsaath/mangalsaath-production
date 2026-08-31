import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const DEMO_PROFILE_SETTING_KEY = "demoProfileControl";
export const DEMO_ACCESS_COOKIE = "ms_demo_access";

export const DEFAULT_DEMO_PROFILE_CONTROL = Object.freeze({
  enabled: false,
  defaultDurationMinutes: 60,
  allowDiscovery: true,
  allowDirectProfileView: true,
  allowInterests: true,
  allowMessages: true,
  viewerAccessRequired: false,
  viewerSessionMinutes: 120,
  accessCodeHash: "",
  accessVersion: "v1",
  labelForAdmins: "Synthetic demo profile",
  showPublicLabel: false,
  publicLabel: "AI-assisted profile",
});

function appSecret() {
  const secret = process.env.APP_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("APP_SECRET must contain at least 32 characters in production.");
  }
  return secret || "mangalsaath-development-only-secret";
}

function asBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function boundedMinutes(value, fallback = 60, max = 10080) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(1, Math.round(number)));
}

function safeEqualHex(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
  } catch {
    return false;
  }
}

export function normalizeDemoProfileControl(value = {}) {
  return {
    enabled: asBoolean(value.enabled, DEFAULT_DEMO_PROFILE_CONTROL.enabled),
    defaultDurationMinutes: boundedMinutes(
      value.defaultDurationMinutes,
      DEFAULT_DEMO_PROFILE_CONTROL.defaultDurationMinutes,
    ),
    // v6.10.1: enabled AI profiles behave like normal member profiles.
    // Legacy flags are retained in the stored shape for backward compatibility,
    // but can no longer restrict discovery, details, interests or messages.
    allowDiscovery: true,
    allowDirectProfileView: true,
    allowInterests: true,
    allowMessages: true,
    viewerAccessRequired: false,
    viewerSessionMinutes: boundedMinutes(
      value.viewerSessionMinutes,
      DEFAULT_DEMO_PROFILE_CONTROL.viewerSessionMinutes,
      1440,
    ),
    accessCodeHash: String(value.accessCodeHash || "").slice(0, 128),
    accessVersion: String(value.accessVersion || DEFAULT_DEMO_PROFILE_CONTROL.accessVersion)
      .trim()
      .slice(0, 64),
    labelForAdmins: String(value.labelForAdmins || DEFAULT_DEMO_PROFILE_CONTROL.labelForAdmins)
      .trim()
      .slice(0, 80),
    showPublicLabel: asBoolean(value.showPublicLabel, DEFAULT_DEMO_PROFILE_CONTROL.showPublicLabel),
    publicLabel: String(value.publicLabel || DEFAULT_DEMO_PROFILE_CONTROL.publicLabel)
      .trim()
      .slice(0, 80),
  };
}

export async function getDemoProfileControl() {
  const row = await prisma.businessSetting.findUnique({
    where: { key: DEMO_PROFILE_SETTING_KEY },
  });
  return normalizeDemoProfileControl(row?.value || {});
}

export async function saveDemoProfileControl(value) {
  const current = await getDemoProfileControl();
  const normalized = normalizeDemoProfileControl({ ...current, ...value });
  return prisma.businessSetting.upsert({
    where: { key: DEMO_PROFILE_SETTING_KEY },
    create: {
      id: `setting_${DEMO_PROFILE_SETTING_KEY}`,
      key: DEMO_PROFILE_SETTING_KEY,
      category: "demo",
      value: normalized,
      isSecret: true,
    },
    update: { value: normalized, category: "demo", isSecret: true },
  });
}

export function hashDemoAccessCode(code) {
  const normalized = String(code || "").trim();
  if (normalized.length < 6 || normalized.length > 64) return "";
  return crypto.createHmac("sha256", appSecret()).update(`demo-code:${normalized}`).digest("hex");
}

export function verifyDemoAccessCode(code, control) {
  const settings = normalizeDemoProfileControl(control);
  if (!settings.accessCodeHash) return false;
  const actual = hashDemoAccessCode(code);
  return safeEqualHex(actual, settings.accessCodeHash);
}

function signDemoPayload(payload) {
  return crypto.createHmac("sha256", appSecret()).update(payload).digest("base64url");
}

export function createDemoAccessToken(control, now = new Date()) {
  const settings = normalizeDemoProfileControl(control);
  const issuedAt = now instanceof Date ? now : new Date(now);
  const expiresAt = new Date(
    issuedAt.getTime() + settings.viewerSessionMinutes * 60_000,
  );
  const payload = Buffer.from(
    JSON.stringify({
      v: settings.accessVersion,
      iat: issuedAt.getTime(),
      exp: expiresAt.getTime(),
    }),
  ).toString("base64url");
  return {
    token: `${payload}.${signDemoPayload(payload)}`,
    expiresAt,
  };
}

export function verifyDemoAccessToken(token, control, now = new Date()) {
  const settings = normalizeDemoProfileControl(control);
  if (!settings.viewerAccessRequired) return settings.enabled;
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return false;
  const expected = signDemoPayload(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const current = now instanceof Date ? now : new Date(now);
    return (
      settings.enabled &&
      parsed.v === settings.accessVersion &&
      Number(parsed.exp) > current.getTime()
    );
  } catch {
    return false;
  }
}

export function isAuthorizedDemoViewer(request, control) {
  const settings = normalizeDemoProfileControl(control);
  // No separate viewer gate for enabled AI profiles.
  return settings.enabled;
}

export function demoVisibilityWindow({
  enabled = true,
  durationMinutes = 60,
  startsAt = new Date(),
} = {}) {
  const start = startsAt instanceof Date ? startsAt : new Date(startsAt);
  const safeStart = Number.isNaN(start.getTime()) ? new Date() : start;
  const expiresAt = new Date(
    safeStart.getTime() + boundedMinutes(durationMinutes) * 60_000,
  );
  return { enabled: Boolean(enabled), startsAt: safeStart, expiresAt };
}

export function isDemoProfileVisible(profile, now = new Date()) {
  if (!profile?.isDemoProfile) return true;
  if (!profile.demoVisible) return false;
  const current = now instanceof Date ? now : new Date(now);
  if (profile.demoVisibleFrom && current < new Date(profile.demoVisibleFrom)) return false;
  if (profile.demoVisibleUntil && current >= new Date(profile.demoVisibleUntil)) return false;
  return true;
}

export function demoProfileInteractionAllowed(profile, control, interaction) {
  if (!profile?.isDemoProfile) return true;
  if (!isDemoProfileVisible(profile)) return false;
  const settings = normalizeDemoProfileControl(control);
  // Once Super Admin enables AI profiles, they use the same member-facing
  // discovery, detail, interest and messaging flows as normal profiles.
  return settings.enabled;
}
