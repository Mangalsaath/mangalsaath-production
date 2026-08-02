const isProduction = process.env.NODE_ENV === "production";
const onlinePaymentsEnabled = process.env.PAYMENT_ENGINE_ENABLED === "true";

const scriptSources = ["'self'", "'unsafe-inline'"];
const connectSources = ["'self'"];
const imageSources = ["'self'", "data:", "blob:"];
const frameSources = ["'self'"];

if (!isProduction) {
  scriptSources.push("'unsafe-eval'");
  connectSources.push("ws:", "wss:", "http:", "https:");
}

// Razorpay Checkout is loaded in the browser only when online payments are enabled.
// These origins are required for the checkout script, hosted payment frame and API calls.
if (onlinePaymentsEnabled) {
  scriptSources.push("https://checkout.razorpay.com");
  connectSources.push("https://*.razorpay.com");
  imageSources.push("https://*.razorpay.com");
  frameSources.push("https://*.razorpay.com");
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `img-src ${imageSources.join(" ")}`,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src ${scriptSources.join(" ")}`,
  `connect-src ${connectSources.join(" ")}`,
  `frame-src ${frameSources.join(" ")}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(isProduction ? ["upgrade-insecure-requests"] : [])
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy }
];

if (isProduction) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  }
};

export default nextConfig;
