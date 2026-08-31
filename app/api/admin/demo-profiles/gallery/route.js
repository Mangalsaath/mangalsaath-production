import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uid } from "@/lib/db";
import { requireAdmin, ADMIN_PERMISSIONS, isAdminAuthorizationError } from "@/lib/admin-auth";
import { appendAdminAudit } from "@/lib/admin-audit";
import { cleanText, rateLimit } from "@/lib/security";

function fail(error) {
  if (isAdminAuthorizationError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("AI gallery admin API error", error);
  return NextResponse.json({ error: "Unable to update AI profile gallery." }, { status: 500 });
}

function assertSuperAdmin(admin) {
  if (String(admin?.role || "").toLowerCase() !== "super_admin") {
    return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  }
  return null;
}

function normalizePhotos(value) {
  return Array.isArray(value)
    ? value.filter((item) => item && typeof item === "object" && item.id).slice(0, 5)
    : [];
}

function cleanHttpsUrl(value) {
  const text = cleanText(value, 2000);
  if (!text) return "";
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function POST(request) {
  const limited = rateLimit(request, { key: "admin-demo-gallery", limit: 60, windowMs: 60_000 });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many gallery actions. Please wait." }, { status: 429 });
  }

  try {
    const { user: admin } = await requireAdmin(request, {
      permission: ADMIN_PERMISSIONS.DEMO_PROFILES_WRITE,
      requireDualOtp: true,
    });
    const denied = assertSuperAdmin(admin);
    if (denied) return denied;

    const body = await request.json();
    const profileId = cleanText(body.profileId, 64);
    const action = cleanText(body.action, 40);
    const profile = profileId
      ? await prisma.memberProfile.findUnique({ where: { id: profileId } })
      : null;

    if (!profile?.isDemoProfile) {
      return NextResponse.json({ error: "AI profile not found." }, { status: 404 });
    }

    const photos = normalizePhotos(profile.photos);
    let nextPhotos = [...photos];
    let nextPrimary = profile.primaryPhoto || photos[0]?.id || null;
    let auditAction = "demo.profile.gallery.updated";

    if (action === "add-url") {
      if (photos.length >= 5) {
        return NextResponse.json({ error: "Maximum 5 photos are allowed per AI profile." }, { status: 400 });
      }
      const url = cleanHttpsUrl(body.url);
      if (!url) return NextResponse.json({ error: "Enter a valid HTTPS image URL." }, { status: 400 });
      const photo = {
        id: uid("demo_photo"),
        data: url,
        url,
        mime: "image/remote",
        source: "external-storage",
        label: cleanText(body.label, 80) || `Photo ${photos.length + 1}`,
        createdAt: new Date().toISOString(),
      };
      nextPhotos.push(photo);
      if (!nextPrimary) nextPrimary = photo.id;
      auditAction = "demo.profile.gallery.photo_added";
    } else if (action === "replace-url") {
      const photoId = cleanText(body.photoId, 100);
      const url = cleanHttpsUrl(body.url);
      if (!photoId || !url) {
        return NextResponse.json({ error: "Photo and valid HTTPS replacement URL are required." }, { status: 400 });
      }
      const index = nextPhotos.findIndex((item) => item.id === photoId);
      if (index < 0) return NextResponse.json({ error: "Photo not found." }, { status: 404 });
      nextPhotos[index] = {
        ...nextPhotos[index],
        data: url,
        url,
        mime: "image/remote",
        source: "external-storage",
        label: cleanText(body.label, 80) || nextPhotos[index].label || `Photo ${index + 1}`,
        updatedAt: new Date().toISOString(),
      };
      auditAction = "demo.profile.gallery.photo_replaced";
    } else if (action === "remove") {
      const photoId = cleanText(body.photoId, 100);
      if (!photoId) return NextResponse.json({ error: "Photo is required." }, { status: 400 });
      const exists = nextPhotos.some((item) => item.id === photoId);
      if (!exists) return NextResponse.json({ error: "Photo not found." }, { status: 404 });
      nextPhotos = nextPhotos.filter((item) => item.id !== photoId);
      if (nextPrimary === photoId) nextPrimary = nextPhotos[0]?.id || null;
      auditAction = "demo.profile.gallery.photo_removed";
    } else if (action === "set-primary") {
      const photoId = cleanText(body.photoId, 100);
      if (!nextPhotos.some((item) => item.id === photoId)) {
        return NextResponse.json({ error: "Photo not found." }, { status: 404 });
      }
      nextPrimary = photoId;
      auditAction = "demo.profile.gallery.primary_changed";
    } else {
      return NextResponse.json({ error: "Invalid gallery action." }, { status: 400 });
    }

    const updated = await prisma.memberProfile.update({
      where: { id: profile.id },
      data: {
        photos: nextPhotos,
        primaryPhoto: nextPrimary,
        photoModerationStatus: "approved",
        photoModerationNote: "Managed by Super Admin for controlled synthetic profile.",
      },
    });

    await appendAdminAudit({
      actorUserId: admin.id,
      action: auditAction,
      entityType: "MemberProfile",
      entityId: profile.id,
      metadata: {
        synthetic: true,
        photoCount: nextPhotos.length,
        primaryPhoto: nextPrimary,
        visibilityPreserved: true,
      },
      request,
    });

    return NextResponse.json({
      message: "AI profile gallery updated.",
      profile: {
        id: updated.id,
        photos: normalizePhotos(updated.photos),
        primaryPhoto: updated.primaryPhoto || null,
        demoVisible: updated.demoVisible,
      },
    });
  } catch (error) {
    return fail(error);
  }
}
