import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

try {
  const configuredEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  if (!configuredEmail) {
    console.log('[MangalSaath startup migration] ADMIN_EMAIL not configured; skipping Super Admin role migration.');
  } else {
    const configuredAdmin = await prisma.user.findFirst({
      where: { email: configuredEmail },
      select: { id: true, email: true, role: true, status: true },
    });

    if (configuredAdmin) {
      if (configuredAdmin.role === 'super_admin') {
        console.log('[MangalSaath startup migration] Super Admin role already current.');
      } else if (configuredAdmin.role === 'admin') {
        await prisma.user.update({
          where: { id: configuredAdmin.id },
          data: { role: 'super_admin', status: 'active' },
        });
        console.log('[MangalSaath startup migration] Migrated configured Super Admin role from admin to super_admin.');
      } else {
        throw new Error(`Configured ADMIN_EMAIL belongs to role ${configuredAdmin.role}; refusing automatic privilege escalation.`);
      }
    } else {
      // Compatibility fallback for legacy production installs where ADMIN_EMAIL was
      // changed after the original administrator record was created. Only migrate
      // when the target is unambiguous: exactly one legacy admin and no existing
      // dedicated super_admin. Never elevate a member or any other role.
      const [legacyAdmins, superAdmins] = await Promise.all([
        prisma.user.findMany({
          where: { role: 'admin' },
          select: { id: true, email: true, status: true },
          take: 2,
        }),
        prisma.user.findMany({
          where: { role: 'super_admin' },
          select: { id: true },
          take: 1,
        }),
      ]);

      if (superAdmins.length > 0) {
        console.log('[MangalSaath startup migration] Dedicated Super Admin already exists; configured email mismatch left unchanged.');
      } else if (legacyAdmins.length === 1) {
        await prisma.user.update({
          where: { id: legacyAdmins[0].id },
          data: { role: 'super_admin', status: 'active' },
        });
        console.log('[MangalSaath startup migration] Migrated the unique legacy admin to super_admin after configured email mismatch.');
      } else {
        console.log(`[MangalSaath startup migration] Configured account not found and legacy admin count is ${legacyAdmins.length}; refusing ambiguous role migration.`);
      }
    }
  }
} finally {
  await prisma.$disconnect();
}
