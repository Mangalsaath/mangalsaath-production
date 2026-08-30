import { NextResponse } from "next/server";
import {
  DEMO_ACCESS_COOKIE,
  createDemoAccessToken,
  getDemoProfileControl,
  isAuthorizedDemoViewer,
  verifyDemoAccessCode,
} from "@/lib/demo-profile-control";
import { rateLimit } from "@/lib/security";

export async function GET(request) {
  const control = await getDemoProfileControl();
  return NextResponse.json(
    {
      enabled: control.enabled === true,
      accessRequired: control.viewerAccessRequired !== false,
      authorized: isAuthorizedDemoViewer(request, control),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request) {
  const limited = rateLimit(request, {
    key: "demo-viewer-access",
    limit: 10,
    windowMs: 10 * 60_000,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many access attempts. Please try again later." },
      { status: 429 },
    );
  }

  const control = await getDemoProfileControl();
  if (!control.enabled) {
    return NextResponse.json({ error: "The controlled demo is not active." }, { status: 403 });
  }
  if (control.viewerAccessRequired === false) {
    return NextResponse.json({ authorized: true, message: "Demo access is open for this window." });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!verifyDemoAccessCode(body?.code, control)) {
    return NextResponse.json({ error: "Invalid demo access code." }, { status: 401 });
  }

  const { token, expiresAt } = createDemoAccessToken(control);
  const response = NextResponse.json({
    authorized: true,
    expiresAt: expiresAt.toISOString(),
    message: "Controlled demo access granted.",
  });
  response.cookies.set(DEMO_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authorized: false, message: "Demo access ended." });
  response.cookies.set(DEMO_ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
