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

    if (!configuredAdmin) {
      console.log('[MangalSaath startup migration] Configured Super Admin account not found; no role change applied.');
    } else if (configuredAdmin.role === 'super_admin') {
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
  }
} finally {
  await prisma.$disconnect();
}
