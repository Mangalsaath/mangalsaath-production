import fs from "node:fs";

const required = [
  ["app/api/membership/route.js", "manualReference"],
  ["app/api/admin/payments/route.js", "PAYMENTS_REVIEW"],
  ["lib/payment-engine.js", "isSamePlanRenewal"],
  ["app/api/payments/webhook/route.js", "Payment amount mismatch"],
  ["prisma/schema.prisma", "manualReference"],
  ["prisma/migrations/20260729_lc006_lc007_payment_hardening/migration.sql", "UNIQUE INDEX"],
  ["app/api/admin/route.js", "REPORTS_RESOLVE"],
  ["app/api/admin/route.js", "PHOTOS_MODERATE"],
  ["app/api/admin/route.js", "dashboard.transactions = []"],
  ["app/api/admin/settings/route.js", "Only the Super Admin can change Super Admin recovery"],
  ["app/api/admin/settings/route.js", "permissions.has(ADMIN_PERMISSIONS.AUDIT_READ)"]
];
for (const [file, marker] of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  const content = fs.readFileSync(file, "utf8");
  if (!content.includes(marker)) throw new Error(`Missing hardening marker in ${file}: ${marker}`);
}
for (const unsafe of [".env.production", "HOSTINGER.env", "HOSTINGER-PUBLIC-LAUNCH-v1.2.0.env"]) {
  if (fs.existsSync(unsafe)) throw new Error(`Unsafe environment file remains: ${unsafe}`);
}
console.log("LC-006 + LC-007 static hardening checks passed.");
