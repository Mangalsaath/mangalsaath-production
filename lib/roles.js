export const ADMIN_ROLES = Object.freeze([
  "admin",
  "super_admin",
  "moderator",
  "finance_admin",
  "content_admin",
]);

export function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

export function isAdminRole(role) {
  return ADMIN_ROLES.includes(normalizeRole(role));
}

export function isSuperAdminRole(role) {
  return ["admin", "super_admin"].includes(normalizeRole(role));
}

export function isMemberRole(role) {
  return normalizeRole(role) === "member";
}
