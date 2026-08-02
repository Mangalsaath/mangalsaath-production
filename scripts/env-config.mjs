export function envText(name, fallback = "") {
  const value = process.env[name];
  return value == null || String(value).trim() === "" ? fallback : String(value).trim();
}

export function envBool(name, fallback = false) {
  return ["1", "true", "yes", "on"].includes(envText(name, fallback ? "true" : "false").toLowerCase());
}

export const productionEnv = Object.freeze({
  nodeEnv: envText("NODE_ENV"),
  siteUrl: envText("NEXT_PUBLIC_SITE_URL"),
  databaseUrl: envText("DATABASE_URL"),
  appSecret: envText("APP_SECRET"),
  adminEmail: envText("ADMIN_EMAIL"),
  adminPassword: envText("ADMIN_PASSWORD"),
  adminSecurityQuestion: envText("ADMIN_SECURITY_QUESTION"),
  adminSecurityAnswer: envText("ADMIN_SECURITY_ANSWER"),
  smtpHost: envText("SMTP_HOST"),
  smtpPort: envText("SMTP_PORT", "465"),
  smtpSecure: envBool("SMTP_SECURE", true),
  smtpUser: envText("SMTP_USER"),
  smtpPass: envText("SMTP_PASS"),
  defaultFromEmail: envText("DEFAULT_FROM_EMAIL"),
  allowDemoOtp: envBool("ALLOW_DEMO_OTP", false),
  emailOtp: envBool("FEATURE_EMAIL_OTP", true),
  mobileOtp: envBool("FEATURE_MOBILE_OTP", false),
  manualMobileVerification: envBool("FEATURE_MANUAL_MOBILE_VERIFICATION", true),
  paymentEngine: envBool("PAYMENT_ENGINE_ENABLED", false),
  razorpayKeyId: envText("RAZORPAY_KEY_ID"),
  razorpayKeySecret: envText("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: envText("RAZORPAY_WEBHOOK_SECRET")
});
