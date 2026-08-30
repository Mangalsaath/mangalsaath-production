import crypto from "crypto";
import { NextResponse } from "next/server";

const DEMO_COOKIE = "ms_demo_access";

function appSecret() {
  const secret = process.env.APP_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("APP_SECRET must contain at least 32 characters in production.");
  }
  return secret || "mangalsaath-development-only-secret";
}

function sign(payload) {
  return crypto.createHmac("sha256", appSecret()).update(payload).digest("base64url");
}

function validToken(token, accessVersion) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return parsed.v === accessVersion && Number(parsed.exp) > Date.now();
  } catch {
    return false;
  }
}

function isApi(pathname) {
  return pathname.startsWith("/api/");
}

export async function proxy(request) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/admin-demo") ||
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/demo-access" ||
    pathname === "/api/demo-access" ||
    pathname === "/api/demo-state" ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  let state;
  try {
    const stateUrl = new URL("/api/demo-state", request.url);
    const response = await fetch(stateUrl, { cache: "no-store" });
    if (!response.ok) return NextResponse.next();
    state = await response.json();
  } catch {
    return NextResponse.next();
  }

  if (!state?.enabled) return NextResponse.next();

  const accessRequired =
    process.env.NODE_ENV === "production" ? true : state.viewerAccessRequired !== false;
  if (!accessRequired) return NextResponse.next();

  const token = request.cookies.get(DEMO_COOKIE)?.value || "";
  if (validToken(token, state.accessVersion || "v1")) {
    return NextResponse.next();
  }

  if (isApi(pathname)) {
    return NextResponse.json(
      { error: "Controlled demo access is required for this live demo window." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = "/demo-access";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?)$).*)"],
};
