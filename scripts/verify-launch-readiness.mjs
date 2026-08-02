import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "app/page.js",
  "app/api/auth/register/route.js",
  "app/api/auth/login/route.js",
  "app/api/profiles/route.js",
  "app/api/interests/route.js",
  "app/api/messages/route.js",
  "app/api/membership/route.js",
  "app/api/payments/order/route.js",
  "app/api/admin/route.js",
  "prisma/schema.prisma",
  ".env.example"
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error(`Missing launch files:\n- ${missing.join("\n- ")}`);
  process.exit(1);
}

const envText = fs.readFileSync(path.join(root, ".env.example"), "utf8");
const requiredEnv = ["DATABASE_URL", "APP_SECRET", "ADMIN_EMAIL", "ADMIN_MOBILE", "ADMIN_PASSWORD"];
const missingEnv = requiredEnv.filter((key) => !new RegExp(`^${key}=`, "m").test(envText));
if (missingEnv.length) {
  console.error(`Missing environment placeholders: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const insecurePatterns = [
  [/ALLOW_DEMO_OTP=true/m, "Demo OTP must not be enabled in the production template."],
  [/PAYMENT_ENGINE_ENABLED=true[\s\S]*RAZORPAY_KEY_SECRET=\s*$/m, "Razorpay cannot be enabled without a key secret."],
];
for (const [pattern, message] of insecurePatterns) {
  if (pattern.test(envText)) {
    console.error(message);
    process.exit(1);
  }
}

console.log("MangalSaath launch structure and production-template checks passed.");
