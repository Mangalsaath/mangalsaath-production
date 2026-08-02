import { productionEnv as env } from "./env-config.mjs";

const errors = [];
const warnings = [];
const required = (value, name) => {
  if (!String(value || "").trim()) errors.push(`${name} is required.`);
};

required(env.siteUrl, "NEXT_PUBLIC_SITE_URL");
required(env.databaseUrl, "DATABASE_URL");
required(env.appSecret, "APP_SECRET");
required(env.adminEmail, "ADMIN_EMAIL");
required(env.adminSecurityQuestion, "ADMIN_SECURITY_QUESTION");
required(env.adminSecurityAnswer, "ADMIN_SECURITY_ANSWER");
required(env.smtpHost, "SMTP_HOST");
required(env.smtpUser, "SMTP_USER");
required(env.smtpPass, "SMTP_PASS");
required(env.defaultFromEmail, "DEFAULT_FROM_EMAIL");

if (env.nodeEnv !== "production") errors.push("NODE_ENV must be production for the production start and deployment commands.");

if (env.siteUrl && !/^https:\/\//i.test(env.siteUrl)) errors.push("NEXT_PUBLIC_SITE_URL must use HTTPS in production.");
if (env.databaseUrl && !/^mysql:\/\//i.test(env.databaseUrl)) errors.push("DATABASE_URL must be a MySQL connection URL.");
if (env.appSecret && env.appSecret.length < 32) errors.push("APP_SECRET must contain at least 32 characters.");
if (env.allowDemoOtp) errors.push("ALLOW_DEMO_OTP must be false in production.");
if (!env.emailOtp) errors.push("FEATURE_EMAIL_OTP must be true for the launch authentication flow.");
if (env.mobileOtp) errors.push("FEATURE_MOBILE_OTP must be false for the launch authentication flow.");
if (!env.manualMobileVerification) errors.push("FEATURE_MANUAL_MOBILE_VERIFICATION must be true for launch.");

if (env.adminPassword && (/change-this|password|admin123|replace|set-a-/i.test(env.adminPassword) || env.adminPassword.length < 12)) {
  errors.push("When ADMIN_PASSWORD is present, it must be a strong, unique password of at least 12 characters.");
}
if (/replace|set-a-|private-answer/i.test(env.adminSecurityAnswer) || env.adminSecurityAnswer.length < 6) {
  errors.push("ADMIN_SECURITY_ANSWER must be a private answer of at least 6 characters.");
}
if (!env.smtpSecure) errors.push("SMTP_SECURE must be true for Hostinger SMTP on port 465.");
if (env.smtpPort !== "465") warnings.push("Hostinger SMTP normally uses port 465 with SMTP_SECURE=true.");

if (env.paymentEngine) {
  required(env.razorpayKeyId, "RAZORPAY_KEY_ID");
  required(env.razorpayKeySecret, "RAZORPAY_KEY_SECRET");
  required(env.razorpayWebhookSecret, "RAZORPAY_WEBHOOK_SECRET");
} else {
  warnings.push("Online Razorpay payments are disabled for launch.");
}

if (errors.length) {
  console.error("Production environment verification failed:\n");
  for (const error of errors) console.error(`❌ ${error}`);
  process.exit(1);
}
console.log("✅ Production environment verification passed.");
for (const warning of warnings) console.warn(`⚠️ ${warning}`);
