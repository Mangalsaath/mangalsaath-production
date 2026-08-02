import { NextResponse } from "next/server";
import { readDb, writeDb, uid } from "@/lib/db";
import { requireAdmin, ADMIN_PERMISSIONS, isAdminAuthorizationError } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/security";
import { useRelationalAdmin, writeRelationalSettings } from "@/lib/admin-core";
import { buildAdminAuditData } from "@/lib/admin-audit";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

function hasValidSignature(bytes, type) {
  if (type === "image/png") return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

function audit(db, admin, action, details) {
  db.adminAuditLogs ||= [];
  db.adminAuditLogs.unshift({ id: uid("aal"), adminUserId: admin.id, action, details, createdAt: new Date().toISOString() });
  db.adminAuditLogs = db.adminAuditLogs.slice(0, 1000);
}

export async function POST(request) {
  const limited = rateLimit(request, { key: "admin-qr-upload", limit: 10, windowMs: 60_000 });
  if (!limited.allowed) return NextResponse.json({ error: "Too many upload attempts. Please wait." }, { status: 429 });
  let admin;
  try { ({ user: admin } = await requireAdmin(request, { permission: ADMIN_PERMISSIONS.SETTINGS_WRITE, requireDualOtp: true })); }
  catch (error) { return NextResponse.json({ error: isAdminAuthorizationError(error) ? error.message : "Forbidden" }, { status: isAdminAuthorizationError(error) ? error.status : 403 }); }

  try {
    const form = await request.formData();
    const file = form.get("qr");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a QR image." }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Use PNG, JPG, JPEG or WEBP format." }, { status: 400 });
    if (!file.size || file.size > MAX_BYTES) return NextResponse.json({ error: "QR image must be 5 MB or smaller." }, { status: 400 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasValidSignature(bytes, file.type)) return NextResponse.json({ error: "The selected file is not a valid image." }, { status: 400 });

    const dataUrl = `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`;
    if (useRelationalAdmin()) {
      await writeRelationalSettings({ qrImage: dataUrl }, admin.id, buildAdminAuditData);
    } else {
      const db = await readDb();
      db.settings ||= {};
      db.settings.qrImage = dataUrl;
      audit(db, admin, "payment_qr_uploaded", `${file.type}, ${file.size} bytes`);
      await writeDb(db);
    }
    return NextResponse.json({ message: "QR code updated successfully.", qrImage: dataUrl });
  } catch {
    return NextResponse.json({ error: "Unable to process the QR image." }, { status: 400 });
  }
}

export async function DELETE(request) {
  const limited = rateLimit(request, { key: "admin-qr-delete", limit: 10, windowMs: 60_000 });
  if (!limited.allowed) return NextResponse.json({ error: "Too many requests. Please wait." }, { status: 429 });
  let admin;
  try { ({ user: admin } = await requireAdmin(request, { permission: ADMIN_PERMISSIONS.SETTINGS_WRITE, requireDualOtp: true })); }
  catch (error) { return NextResponse.json({ error: isAdminAuthorizationError(error) ? error.message : "Forbidden" }, { status: isAdminAuthorizationError(error) ? error.status : 403 }); }

  if (useRelationalAdmin()) {
    await writeRelationalSettings({ qrImage: "" }, admin.id, buildAdminAuditData);
  } else {
    const db = await readDb();
    db.settings ||= {};
    db.settings.qrImage = "";
    audit(db, admin, "payment_qr_removed", "Payment QR image removed.");
    await writeDb(db);
  }
  return NextResponse.json({ message: "QR code removed successfully." });
}
