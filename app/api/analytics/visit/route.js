import { NextResponse } from "next/server";
import { readDb, writeDb, getUser } from "@/lib/db";
import { rateLimit } from "@/lib/security";
import { isAdminRole } from "@/lib/roles";
import {
  ensureAnalytics,
  excludeIpHash,
  getRequestIp,
  hashAnalyticsIp,
  hashVisitorId,
  isIpExcluded,
  isLikelyBot,
  removeVisitorFromAnalytics,
} from "@/lib/analytics";

export async function POST(request) {
  const limited = rateLimit(request, {
    key: "homepage-visit",
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.allowed) return NextResponse.json({ ok: true });
  if (isLikelyBot(request)) return NextResponse.json({ ok: true });

  let body = {};
  try {
    body = await request.json();
  } catch {}

  const visitorId = hashVisitorId(body.visitorId);
  if (!visitorId) return NextResponse.json({ ok: true });

  const db = await readDb();
  const analytics = ensureAnalytics(db);
  const ipHash = hashAnalyticsIp(getRequestIp(request));

  let currentUser = null;
  try {
    currentUser = await getUser(request);
  } catch {}

  if (currentUser && isAdminRole(currentUser.role)) {
    const changed = excludeIpHash(db, ipHash);
    const removed = removeVisitorFromAnalytics(db, visitorId);
    if (changed || removed) await writeDb(db);
    return NextResponse.json({ ok: true });
  }

  if (isIpExcluded(db, ipHash)) {
    const removed = removeVisitorFromAnalytics(db, visitorId);
    if (removed) await writeDb(db);
    return NextResponse.json({ ok: true });
  }

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  analytics.totalVisits += 1;

  const existing = analytics.visitors[visitorId];
  if (!existing) {
    analytics.visitors[visitorId] = {
      firstSeenAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      visitCount: 1,
    };
    analytics.uniqueVisitors += 1;
  } else {
    existing.lastSeenAt = now.toISOString();
    existing.visitCount = Number(existing.visitCount || 0) + 1;
  }

  const daily = analytics.daily[day] || {
    visits: 0,
    uniqueVisitors: 0,
    visitorIds: {},
  };
  daily.visits = Number(daily.visits || 0) + 1;
  daily.visitorIds = daily.visitorIds || {};
  if (!daily.visitorIds[visitorId]) {
    daily.visitorIds[visitorId] = true;
    daily.uniqueVisitors = Number(daily.uniqueVisitors || 0) + 1;
  }
  analytics.daily[day] = daily;

  const keep = Object.keys(analytics.daily).sort().slice(-120);
  analytics.daily = Object.fromEntries(
    keep.map((key) => [key, analytics.daily[key]]),
  );

  await writeDb(db);
  return NextResponse.json({ ok: true });
}
