import crypto from "crypto";

export function getRequestIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwarded = forwarded ? forwarded.split(",")[0].trim() : "";
  return (
    request.headers.get("cf-connecting-ip") ||
    firstForwarded ||
    request.headers.get("x-real-ip") ||
    ""
  ).trim();
}

export function hashAnalyticsIp(ip) {
  const value = String(ip || "").trim();
  if (!value) return "";
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashVisitorId(visitorId) {
  const value = String(visitorId || "").slice(0, 160);
  if (!value) return "";
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function isLikelyBot(request) {
  const ua = String(request.headers.get("user-agent") || "").toLowerCase();
  if (!ua) return false;
  return /(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|headless|lighthouse|pagespeed)/i.test(ua);
}

export function ensureAnalytics(db) {
  db.analytics = db.analytics || {};
  db.analytics.totalVisits = Number(db.analytics.totalVisits || 0);
  db.analytics.uniqueVisitors = Number(db.analytics.uniqueVisitors || 0);
  db.analytics.daily = db.analytics.daily || {};
  db.analytics.visitors = db.analytics.visitors || {};
  db.analytics.excludedIpHashes = db.analytics.excludedIpHashes || {};
  return db.analytics;
}

export function excludeIpHash(db, ipHash) {
  if (!ipHash) return false;
  const analytics = ensureAnalytics(db);
  if (analytics.excludedIpHashes[ipHash]) return false;
  analytics.excludedIpHashes[ipHash] = {
    excludedAt: new Date().toISOString(),
  };
  return true;
}

export function isIpExcluded(db, ipHash) {
  if (!ipHash) return false;
  const analytics = ensureAnalytics(db);
  return Boolean(analytics.excludedIpHashes[ipHash]);
}

export function removeVisitorFromAnalytics(db, visitorIdHash) {
  if (!visitorIdHash) return false;
  const analytics = ensureAnalytics(db);
  const visitor = analytics.visitors[visitorIdHash];
  if (!visitor) return false;

  analytics.uniqueVisitors = Math.max(0, analytics.uniqueVisitors - 1);
  if (Number(visitor.visitCount || 0) > 0) {
    analytics.totalVisits = Math.max(
      0,
      analytics.totalVisits - Number(visitor.visitCount || 0),
    );
  }
  delete analytics.visitors[visitorIdHash];

  for (const day of Object.keys(analytics.daily)) {
    const daily = analytics.daily[day];
    if (!daily?.visitorIds?.[visitorIdHash]) continue;
    delete daily.visitorIds[visitorIdHash];
    daily.uniqueVisitors = Math.max(0, Number(daily.uniqueVisitors || 0) - 1);
  }
  return true;
}
