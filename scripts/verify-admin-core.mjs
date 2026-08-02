import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
try {
  const [admins, settings, profiles, reports, audits, photoEvents] = await Promise.all([
    prisma.user.count({ where: { role: { in: ["admin", "super_admin", "moderator", "finance_admin", "content_admin"] } } }),
    prisma.businessSetting.count(), prisma.memberProfile.count(), prisma.reportRecord.count(), prisma.adminAuditLog.count(), prisma.photoModerationEvent.count()
  ]);
  if (!admins) throw new Error("No admin account exists in relational users.");
  console.log(JSON.stringify({ ok: true, admins, settings, profiles, reports, audits, photoModerationEvents: photoEvents, mode: process.env.ADMIN_STORAGE_MODE || "relational" }, null, 2));
} catch (error) { console.error(error); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
