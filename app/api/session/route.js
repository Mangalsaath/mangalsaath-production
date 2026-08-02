import { NextResponse } from "next/server";
import { getUser, revokeSession } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ user: null }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { passwordHash, failedLoginAttempts, lockedUntil, ...safe } = user;
  return NextResponse.json({ user: safe }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request) {
  const url = new URL(request.url);
  const allDevices = url.searchParams.get("all") === "true";
  const revoked = await revokeSession(request, allDevices);
  if (!revoked) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ message: allDevices ? "Logged out from all devices." : "Logged out successfully." }, { headers: { "Cache-Control": "no-store" } });
}
