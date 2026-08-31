import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin, ADMIN_PERMISSIONS, isAdminAuthorizationError } from "@/lib/admin-auth";
import { cleanText, rateLimit } from "@/lib/security";

function fail(error) {
  if (isAdminAuthorizationError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("AI gallery upload signature error", error);
  return NextResponse.json({ error: "Unable to prepare image upload." }, { status: 500 });
}

function assertSuperAdmin(admin) {
  if (String(admin?.role || "").toLowerCase() !== "super_admin") {
    return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  }
  return null;
}

function storageConfig() {
  return {
    cloudName: String(process.env.CLOUDINARY_CLOUD_NAME || "").trim(),
    apiKey: String(process.env.CLOUDINARY_API_KEY || "").trim(),
    apiSecret: String(process.env.CLOUDINARY_API_SECRET || "").trim(),
  };
}

export async function GET(request) {
  const limited = rateLimit(request, { key: "admin-demo-gallery-signature", limit: 30, windowMs: 60_000 });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many upload requests. Please wait." }, { status: 429 });
  }

  try {
    const { user: admin } = await requireAdmin(request, {
      permission: ADMIN_PERMISSIONS.DEMO_PROFILES_WRITE,
      requireDualOtp: true,
    });
    const denied = assertSuperAdmin(admin);
    if (denied) return denied;

    const { cloudName, apiKey, apiSecret } = storageConfig();
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ configured: false, error: "External image storage is not configured." }, { status: 503 });
    }

    const url = new URL(request.url);
    const profileId = cleanText(url.searchParams.get("profileId"), 64);
    if (!profileId) {
      return NextResponse.json({ error: "Profile ID is required." }, { status: 400 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `mangalsaath/ai-profiles/${profileId}`;
    const transformation = "c_limit,w_1600,h_1600,q_auto:good,f_auto";
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}&transformation=${transformation}`;
    const signature = crypto.createHash("sha1").update(`${paramsToSign}${apiSecret}`).digest("hex");

    return NextResponse.json({
      configured: true,
      cloudName,
      apiKey,
      timestamp,
      folder,
      transformation,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      limits: {
        maxBytes: 8 * 1024 * 1024,
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
      },
    });
  } catch (error) {
    return fail(error);
  }
}
