import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 5 * 60_000;
let cache = null;
let cacheExpiresAt = 0;

const DEFAULTS = Object.freeze({
  businessName: "MangalSaath",
  businessAddress: "",
  gstin: "",
  supportEmail: "support@mangalsaath.com",
  supportMobile: "",
  whatsapp: "",
  upiId: "",
  qrImage: "/payment-qr.png",
  paymentInstructions: "Pay by UPI and submit the UTR for verification.",
  footerCopyright: "© MangalSaath. All rights reserved.",
  maintenanceMode: false,
  registrationEnabled: true,
  superAdminEmail: "",
  superAdminMobile: "",
  adminOtpExpiryMinutes: 5,
  adminSessionMinutes: 30,
  seoTitle: "MangalSaath | Meaningful Matches, Trusted Beginnings",
  seoDescription: "A privacy-first Indian matrimonial platform for meaningful, family-trusted connections."
});

function normalize(rows) {
  return { ...DEFAULTS, ...Object.fromEntries(rows.map((row) => [row.key, row.value])) };
}

export async function getSystemSettings({ fresh = false } = {}) {
  // Static metadata/config rendering during a source-only build has no database.
  // Hostinger injects DATABASE_URL for the production build and runtime.
  if (!process.env.DATABASE_URL) return { ...DEFAULTS };
  const now = Date.now();
  if (!fresh && cache && now < cacheExpiresAt) return cache;
  try {
    const rows = await prisma.businessSetting.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] });
    cache = normalize(rows);
    cacheExpiresAt = now + CACHE_TTL_MS;
    return cache;
  } catch (error) {
    // Build-time and first-install fallback: the website can render before the DB is seeded.
    console.warn("System settings fallback active:", error?.message || error);
    return { ...DEFAULTS };
  }
}

export function invalidateSystemSettingsCache() {
  cache = null;
  cacheExpiresAt = 0;
}

export async function getPublicSiteSettings(options) {
  const settings = await getSystemSettings(options);
  return {
    businessName: String(settings.businessName || DEFAULTS.businessName),
    businessAddress: String(settings.businessAddress || ""),
    gstin: String(settings.gstin || ""),
    supportEmail: String(settings.supportEmail || DEFAULTS.supportEmail),
    supportMobile: String(settings.supportMobile || ""),
    whatsapp: String(settings.whatsapp || ""),
    upiId: String(settings.upiId || ""),
    qrImage: String(settings.qrImage || DEFAULTS.qrImage),
    paymentInstructions: String(settings.paymentInstructions || DEFAULTS.paymentInstructions),
    footerCopyright: String(settings.footerCopyright || DEFAULTS.footerCopyright),
    maintenanceMode: settings.maintenanceMode === true || String(settings.maintenanceMode).toLowerCase() === "true",
    registrationEnabled: !(settings.registrationEnabled === false || String(settings.registrationEnabled).toLowerCase() === "false"),
    seoTitle: String(settings.seoTitle || DEFAULTS.seoTitle),
    seoDescription: String(settings.seoDescription || DEFAULTS.seoDescription)
  };
}
