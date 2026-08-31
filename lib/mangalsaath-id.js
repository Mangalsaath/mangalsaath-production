import crypto from "crypto";

const ID_DIGITS = 18;
const MODULUS = 10n ** BigInt(ID_DIGITS);

export function mangalsaathIdForProfile(profileOrId) {
  const rawId = typeof profileOrId === "object" ? profileOrId?.id : profileOrId;
  const value = String(rawId || "").trim();
  if (!value) return "";

  const digest = crypto.createHash("sha256").update(`mangalsaath-profile:${value}`).digest("hex");
  const numeric = BigInt(`0x${digest}`) % MODULUS;
  return `MS-${numeric.toString().padStart(ID_DIGITS, "0")}`;
}

export function withMangalsaathId(profile) {
  if (!profile) return profile;
  return { ...profile, mangalsaathId: mangalsaathIdForProfile(profile.id) };
}
