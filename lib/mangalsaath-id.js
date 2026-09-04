const OFFSET = 1000;

export function mangalsaathIdForProfile(profileOrNumber) {
  const rawNumber = typeof profileOrNumber === "object"
    ? profileOrNumber?.mangalNumber
    : profileOrNumber;
  const number = Number(rawNumber);
  if (!Number.isInteger(number) || number < 1) return "";
  return `MANGAL${OFFSET + number}`;
}

export function isMangalsaathId(value) {
  const match = /^MANGAL(\d{4,})$/i.exec(String(value || "").trim());
  if (!match) return false;
  return Number(match[1]) >= OFFSET + 1;
}

export function normalizeMangalsaathId(value) {
  const text = String(value || "").trim().toUpperCase();
  return isMangalsaathId(text) ? text : "";
}

export function mangalNumberFromId(value) {
  const normalized = normalizeMangalsaathId(value);
  if (!normalized) return null;
  const number = Number(normalized.slice(6)) - OFFSET;
  return Number.isInteger(number) && number >= 1 ? number : null;
}

export function withMangalsaathId(profile) {
  if (!profile) return profile;
  return { ...profile, mangalsaathId: mangalsaathIdForProfile(profile) };
}
