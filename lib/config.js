function text(name, fallback = "") {
  const value = process.env[name];
  return value == null || String(value).trim() === "" ? fallback : String(value).trim();
}

function bool(name, fallback = false) {
  const value = text(name, fallback ? "true" : "false").toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
}

function number(name, fallback) {
  const value = Number(text(name, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

export const config = Object.freeze({
  app: Object.freeze({
    nodeEnv: text("NODE_ENV", "development"),
    siteUrl: text("NEXT_PUBLIC_SITE_URL", "https://mangalsaath.com"),
    secret: text("APP_SECRET")
  }),
  database: Object.freeze({
    url: text("DATABASE_URL"),
    jsonPath: text("JSON_DATABASE_PATH", "./data/db.json"),
    forceJsonImport: bool("FORCE_JSON_IMPORT", false)
  }),
  admin: Object.freeze({
    username: text("ADMIN_USERNAME", "admin@mangalsaath.com"),
    email: text("ADMIN_EMAIL", "admin@mangalsaath.com"),
    mobile: text("ADMIN_MOBILE"),
    firstName: text("ADMIN_FIRST_NAME", "Super"),
    lastName: text("ADMIN_LAST_NAME", "Admin"),
    password: text("ADMIN_PASSWORD"),
    securityQuestion: text("ADMIN_SECURITY_QUESTION", "Enter your private Super Admin security answer"),
    securityAnswer: text("ADMIN_SECURITY_ANSWER"),
    resetPassword: bool("ADMIN_RESET_PASSWORD", false)
  }),
  smtp: Object.freeze({
    host: text("SMTP_HOST", "smtp.hostinger.com"),
    port: number("SMTP_PORT", 465),
    secure: bool("SMTP_SECURE", true),
    user: text("SMTP_USER"),
    pass: text("SMTP_PASS"),
    fromEmail: text("DEFAULT_FROM_EMAIL", text("SMTP_USER")),
    fromName: text("MAIL_FROM_NAME", "MangalSaath"),
    replyTo: text("MAIL_REPLY_TO", "support@mangalsaath.com")
  }),
  storage: Object.freeze({
    auth: text("AUTH_STORAGE_MODE", "relational").toLowerCase(),
    profile: text("PROFILE_STORAGE_MODE", "relational").toLowerCase(),
    communication: text("COMMUNICATION_STORAGE_MODE", "relational").toLowerCase(),
    admin: text("ADMIN_STORAGE_MODE", "relational").toLowerCase()
  }),
  features: Object.freeze({
    emailOtp: bool("FEATURE_EMAIL_OTP", true),
    mobileOtp: bool("FEATURE_MOBILE_OTP", false),
    manualMobileVerification: bool("FEATURE_MANUAL_MOBILE_VERIFICATION", true),
    demoOtp: bool("ALLOW_DEMO_OTP", false),
    paymentEngine: bool("PAYMENT_ENGINE_ENABLED", false)
  }),
  payment: Object.freeze({
    razorpayKeyId: text("RAZORPAY_KEY_ID"),
    razorpayKeySecret: text("RAZORPAY_KEY_SECRET"),
    razorpayWebhookSecret: text("RAZORPAY_WEBHOOK_SECRET")
  })
});

export function requireConfigValue(value, name) {
  if (!String(value || "").trim()) throw new Error(`${name} is required.`);
  return value;
}
