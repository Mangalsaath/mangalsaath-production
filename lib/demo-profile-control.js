import { prisma } from "@/lib/prisma";

export const DEMO_PROFILE_SETTING_KEY = "demoProfileControl";

export const DEFAULT_DEMO_PROFILE_CONTROL = Object.freeze({
  enabled: false,
  defaultDurationMinutes: 60,
  allowDiscovery: true,
  allowDirectProfileView: true,
  allowInterests: false,
  allowMessages: false,
  labelForAdmins: "Synthetic demo profile",
});

function asBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function boundedMinutes(value, fallback = 60) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(10080, Math.max(1, Math.round(number)));
}

export function normalizeDemoProfileControl(value = {}) {
  return {
    enabled: asBoolean(value.enabled, DEFAULT_DEMO_PROFILE_CONTROL.enabled),
    defaultDurationMinutes: boundedMinutes(value.defaultDurationMinutes, DEFAULT_DEMO_PROFILE_CONTROL.defaultDurationMinutes),
    allowDiscovery: asBoolean(value.allowDiscovery, DEFAULT_DEMO_PROFILE_CONTROL.allowDiscovery),
    allowDirectProfileView: asBoolean(value.allowDirectProfileView, DEFAULT_DEMO_PROFILE_CONTROL.allowDirectProfileView),
    allowInterests: asBoolean(value.allowInterests, DEFAULT_DEMO_PROFILE_CONTROL.allowInterests),
    allowMessages: asBoolean(value.allowMessages, DEFAULT_DEMO_PROFILE_CONTROL.allowMessages),
    labelForAdmins: String(value.labelForAdmins || DEFAULT_DEMO_PROFILE_CONTROL.labelForAdmins).trim().slice(0, 80),
  };
}

export async function getDemoProfileControl() {
  const row = await prisma.businessSetting.findUnique({ where: { key: DEMO_PROFILE_SETTING_KEY } });
  return normalizeDemoProfileControl(row?.value || {});
}

export async function saveDemoProfileControl(value) {
  const normalized = normalizeDemoProfileControl(value);
  return prisma.businessSetting.upsert({
    where: { key: DEMO_PROFILE_SETTING_KEY },
    create: { id: `setting_${DEMO_PROFILE_SETTING_KEY}`, key: DEMO_PROFILE_SETTING_KEY, category: "demo", value: normalized, isSecret: false },
    update: { value: normalized, category: "demo" },
  });
}

export function demoVisibilityWindow({ enabled = true, durationMinutes = 60, startsAt = new Date() } = {}) {
  const start = startsAt instanceof Date ? startsAt : new Date(startsAt);
  const safeStart = Number.isNaN(start.getTime()) ? new Date() : start;
  const expiresAt = new Date(safeStart.getTime() + boundedMinutes(durationMinutes) * 60_000);
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
  if (!settings.enabled) return false;
  if (interaction === "interest") return settings.allowInterests;
  if (interaction === "message") return settings.allowMessages;
  if (interaction === "detail") return settings.allowDirectProfileView;
  return settings.allowDiscovery;
}
