import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSession, hashPassword, verifyPassword, writeDb } from "@/lib/db";
import { relationalAuthEnabled, updateRelationalUser, revokeAllRelationalSessions } from "@/lib/relational-auth";
import { cleanText, rateLimit, validatePassword } from "@/lib/security";

export async function POST(request) {
  const limited = rateLimit(request, { key: "admin-password", limit: 5, windowMs: 15 * 60_000 });
  if (!limited.allowed) return NextResponse.json({ error: "Too many password attempts. Please try again later." }, { status: 429 });

  const auth = await getSession(request);
  const admin = auth?.user;
  if (!admin || !["admin", "super_admin"].includes(String(admin.role || "").toLowerCase())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!verifyPassword(currentPassword, admin.passwordHash)) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  if (!validatePassword(newPassword).valid) return NextResponse.json({ error: "New password must have at least 8 characters, including uppercase, lowercase, number and special symbol." }, { status: 400 });
  if (newPassword !== confirmPassword) return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
  if (newPassword === currentPassword) return NextResponse.json({ error: "Choose a password different from the current password." }, { status: 400 });
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
    return NextResponse.json({ error: "Use uppercase, lowercase, a number and a special character." }, { status: 400 });
  }

  const db = auth.db;
  const index = db.users.findIndex((user) => user.id === admin.id && ["admin", "super_admin"].includes(String(user.role || "").toLowerCase()));
  if (index < 0) return NextResponse.json({ error: "Administrator account not found." }, { status: 404 });

  const newPasswordHash = hashPassword(newPassword);
  db.users[index].passwordHash = newPasswordHash;
  db.users[index].passwordChangedAt = new Date().toISOString();
  db.users[index].mustChangePassword = false;
  db.sessions = db.sessions.filter((session) => session.userId !== admin.id || session.id === auth.session.id);
  db.activities = db.activities || [];
  db.activities.unshift({
    id: `a_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`,
    type: "admin_password_changed",
    userId: admin.id,
    description: cleanText("Administrator password changed", 100),
    createdAt: new Date().toISOString()
  });
  await writeDb(db);
  if (relationalAuthEnabled()) {
    await updateRelationalUser(admin.id, { passwordHash: newPasswordHash, passwordChangedAt: new Date(), mustChangePassword: false });
    await revokeAllRelationalSessions(admin.id);
  }

  const { passwordHash, ...safeAdmin } = db.users[index];
  return NextResponse.json({ message: "Administrator password changed successfully.", user: safeAdmin });
}
