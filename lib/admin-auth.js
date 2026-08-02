import { getSession } from "@/lib/db";

export const ADMIN_PERMISSIONS = Object.freeze({
  DASHBOARD_READ: "dashboard.read",
  MEMBERS_READ: "members.read",
  MEMBERS_UPDATE_STATUS: "members.update_status",
  MEMBERS_VERIFY: "members.verify",
  PHOTOS_MODERATE: "photos.moderate",
  REPORTS_READ: "reports.read",
  REPORTS_RESOLVE: "reports.resolve",
  PLANS_READ: "plans.read",
  PLANS_WRITE: "plans.write",
  COUPONS_READ: "coupons.read",
  COUPONS_WRITE: "coupons.write",
  PAYMENTS_READ: "payments.read",
  PAYMENTS_REVIEW: "payments.review",
  SETTINGS_READ: "settings.read",
  SETTINGS_WRITE: "settings.write",
  CONTENT_READ: "content.read",
  CONTENT_WRITE: "content.write",
  AUDIT_READ: "audit.read",
  ADMINS_MANAGE: "admins.manage"
});

const ALL_PERMISSIONS = Object.freeze(Object.values(ADMIN_PERMISSIONS));
const ROLE_PERMISSIONS = Object.freeze({
  admin: ALL_PERMISSIONS,
  super_admin: ALL_PERMISSIONS,
  moderator: [
    ADMIN_PERMISSIONS.DASHBOARD_READ,
    ADMIN_PERMISSIONS.MEMBERS_READ,
    ADMIN_PERMISSIONS.MEMBERS_UPDATE_STATUS,
    ADMIN_PERMISSIONS.MEMBERS_VERIFY,
    ADMIN_PERMISSIONS.PHOTOS_MODERATE,
    ADMIN_PERMISSIONS.REPORTS_READ,
    ADMIN_PERMISSIONS.REPORTS_RESOLVE
  ],
  finance_admin: [
    ADMIN_PERMISSIONS.DASHBOARD_READ,
    ADMIN_PERMISSIONS.PLANS_READ,
    ADMIN_PERMISSIONS.PLANS_WRITE,
    ADMIN_PERMISSIONS.COUPONS_READ,
    ADMIN_PERMISSIONS.COUPONS_WRITE,
    ADMIN_PERMISSIONS.PAYMENTS_READ,
    ADMIN_PERMISSIONS.PAYMENTS_REVIEW,
    ADMIN_PERMISSIONS.AUDIT_READ
  ],
  content_admin: [
    ADMIN_PERMISSIONS.DASHBOARD_READ,
    ADMIN_PERMISSIONS.SETTINGS_READ,
    ADMIN_PERMISSIONS.SETTINGS_WRITE,
    ADMIN_PERMISSIONS.CONTENT_READ,
    ADMIN_PERMISSIONS.CONTENT_WRITE
  ]
});

export class AdminAuthorizationError extends Error {
  constructor(message = "Forbidden", status = 403) {
    super(message);
    this.name = "AdminAuthorizationError";
    this.status = status;
  }
}

export function permissionsForRole(role) {
  return new Set(ROLE_PERMISSIONS[String(role || "").toLowerCase()] || []);
}

export function hasAdminPermission(user, permission) {
  return Boolean(user && permissionsForRole(user.role).has(permission));
}

export async function requireAdmin(request, options = {}) {
  const sessionResult = await getSession(request);
  if (!sessionResult?.user) throw new AdminAuthorizationError("Authentication required.", 401);
  const { user, session } = sessionResult;
  const permissions = permissionsForRole(user.role);
  if (!permissions.size) throw new AdminAuthorizationError();
  if (options.requireDualOtp === true && session?.adminDualOtpVerified !== true) {
    throw new AdminAuthorizationError("Super Admin verification required.", 403);
  }
  if (options.permission && !permissions.has(options.permission)) throw new AdminAuthorizationError();
  return { user, session, permissions };
}

export function isAdminAuthorizationError(error) {
  return error instanceof AdminAuthorizationError || error?.name === "AdminAuthorizationError";
}
