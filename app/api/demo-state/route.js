import { NextResponse } from "next/server";
import { getDemoProfileControl } from "@/lib/demo-profile-control";

export async function GET() {
  const control = await getDemoProfileControl();
  return NextResponse.json(
    {
      enabled: control.enabled === true,
      viewerAccessRequired:
        process.env.NODE_ENV === "production" ? true : control.viewerAccessRequired !== false,
      accessVersion: control.accessVersion || "v1",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
