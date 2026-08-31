import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, ADMIN_PERMISSIONS, isAdminAuthorizationError } from "@/lib/admin-auth";
import { appendAdminAudit } from "@/lib/admin-audit";
import { cleanText, rateLimit } from "@/lib/security";

const MAX_PROFILES = 10;
const MAX_PHOTOS = 5;

function fail(error) {
  if (isAdminAuthorizationError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("AI gallery batch API error", error);
  return NextResponse.json({ error: "Unable to process AI gallery batch." }, { status: 500 });
}

function assertSuperAdmin(admin) {
  if (String(admin?.role || "").toLowerCase() !== "super_admin") {
    return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
  }
  return null;
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

function normalizePhoto(value, index) {
  const rawUrl = typeof value === "string" ? value : value?.url;
  const url = cleanHttpsUrl(rawUrl);
  if (!url) return null;
  return {
    url,
    label: cleanText(typeof value === "object" ? value?.label : "", 80) || `Photo ${index + 1}`,
  };
}

function normalizeBatch(value) {
  if (!Array.isArray(value) || value.length < 1) {
    return { error: "Provide at least one profile in the batch." };
  }
  if (value.length > MAX_PROFILES) {
    return { error: `Maximum ${MAX_PROFILES} profiles are allowed per batch.` };
  }

  const seen = new Set();
  const items = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index] || {};
    const profileId = cleanText(item.profileId, 64);
    if (!profileId) return { error: `Profile ${index + 1}: profileId is required.` };
    if (seen.has(profileId)) return { error: `Profile ${profileId} appears more than once.` };
    seen.add(profileId);

    if (!Array.isArray(item.photos) || item.photos.length < 1 || item.photos.length > MAX_PHOTOS) {
      return { error: `Profile ${profileId}: provide 1 to ${MAX_PHOTOS} photos.` };
    }
    const photos = item.photos.map(normalizePhoto);
    if (photos.some((photo) => !photo)) {
      return { error: `Profile ${profileId}: every photo must use a valid HTTPS URL.` };
    }
    const primaryIndex = Number.isInteger(Number(item.primaryIndex)) ? Number(item.primaryIndex) : 0;
    if (primaryIndex < 0 || primaryIndex >= photos.length) {
      return { error: `Profile ${profileId}: primaryIndex must point to one of the supplied photos.` };
    }
    items.push({ profileId, photos, primaryIndex });
  }
  return { items };
}

function galleryFor(item) {
  const stamp = Date.now();
  return item.photos.map((photo, index) => ({
    id: `demo_batch_${item.profileId}_${index + 1}_${stamp}`,
    data: photo.url,
    url: photo.url,
    mime: "image/remote",
    source: "external-storage",
    label: photo.label,
    createdAt: new Date().toISOString(),
    syntheticSlot: index + 1,
  }));
}

export async function POST(request) {
  const limited = rateLimit(request, { key: "admin-demo-gallery-batch", limit: 12, windowMs: 60_000 });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many batch actions. Please wait." }, { status: 429 });
  }

  try {
    const { user: admin } = await requireAdmin(request, {
      permission: ADMIN_PERMISSIONS.DEMO_PROFILES_WRITE,
      requireDualOtp: true,
    });
    const denied = assertSuperAdmin(admin);
    if (denied) return denied;

    const body = await request.json();
    const mode = cleanText(body.mode, 20) || "validate";
    if (!['validate', 'apply'].includes(mode)) {
      return NextResponse.json({ error: "Mode must be validate or apply." }, { status: 400 });
    }

    const normalized = normalizeBatch(body.profiles);
    if (normalized.error) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const items = normalized.items;
    const ids = items.map((item) => item.profileId);
    const records = await prisma.memberProfile.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, isDemoProfile: true, demoVisible: true },
    });
    const byId = new Map(records.map((record) => [record.id, record]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length) {
      return NextResponse.json({ error: `AI profiles not found: ${missing.join(", ")}` }, { status: 404 });
    }
    const nonSynthetic = records.filter((record) => !record.isDemoProfile).map((record) => record.id);
    if (nonSynthetic.length) {
      return NextResponse.json({ error: `Batch contains non-AI profiles: ${nonSynthetic.join(", ")}` }, { status: 400 });
    }

    const preview = items.map((item) => ({
      profileId: item.profileId,
      name: byId.get(item.profileId)?.name || item.profileId,
      photoCount: item.photos.length,
      primaryIndex: item.primaryIndex,
      visibility: byId.get(item.profileId)?.demoVisible ? "Enabled" : "Hidden",
    }));

    if (mode === "validate") {
      return NextResponse.json({
        valid: true,
        message: `${items.length} AI profiles validated. No database changes were made.`,
        limits: { maxProfiles: MAX_PROFILES, maxPhotosPerProfile: MAX_PHOTOS },
        preview,
      });
    }

    const applied = [];
    for (const item of items) {
      const photos = galleryFor(item);
      const primaryPhoto = photos[item.primaryIndex]?.id || photos[0]?.id || null;
      const updated = await prisma.memberProfile.update({
        where: { id: item.profileId },
        data: {
          photos,
          primaryPhoto,
          photoModerationStatus: "approved",
          photoModerationNote: "Controlled external gallery batch managed by Super Admin.",
        },
        select: { id: true, name: true, demoVisible: true },
      });
      applied.push({
        profileId: updated.id,
        name: updated.name,
        photoCount: photos.length,
        primaryPhoto,
        visibility: updated.demoVisible ? "Enabled" : "Hidden",
      });

      await appendAdminAudit({
        actorUserId: admin.id,
        action: "demo.profile.gallery.batch_applied",
        entityType: "MemberProfile",
        entityId: updated.id,
        metadata: {
          synthetic: true,
          photoCount: photos.length,
          primaryPhoto,
          visibilityPreserved: true,
          batchSize: items.length,
        },
        request,
      });
    }

    return NextResponse.json({
      valid: true,
      applied: true,
      message: `${applied.length} AI profile galleries updated sequentially.`,
      results: applied,
    });
  } catch (error) {
    return fail(error);
  }
}
