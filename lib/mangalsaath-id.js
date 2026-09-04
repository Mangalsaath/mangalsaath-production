import crypto from "crypto";

const ID_LENGTH = 6;
const ID_SPACE = 36n ** BigInt(ID_LENGTH);

export function mangalsaathIdForProfile(profileOrId) {
  const rawId = typeof profileOrId === "object" ? profileOrId?.id : profileOrId;
  const value = String(rawId || "").trim();
  if (!value) return "";

  const digest = crypto.createHash("sha256").update(`mangalsaath-profile:${value}`).digest("hex");
  const numeric = BigInt(`0x${digest}`) % ID_SPACE;
  const suffix = numeric.toString(36).toUpperCase().padStart(ID_LENGTH, "0");
  return `Mangal${suffix}`;
}

export function isMangalsaathId(value) {
  return /^Mangal[A-Z0-9]{6}$/i.test(String(value || "").trim());
}

export function normalizeMangalsaathId(value) {
  const text = String(value || "").trim();
  if (!isMangalsaathId(text)) return "";
  return `Mangal${text.slice(6).toUpperCase()}`;
}

export function withMangalsaathId(profile) {
  if (!profile) return profile;
  return { ...profile, mangalsaathId: mangalsaathIdForProfile(profile.id) };
}
