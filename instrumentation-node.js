const allowDemoSeed = process.env.ALLOW_SYNTHETIC_DEMO_SEED === 'true';
const confirmDemoSeed = process.env.CONFIRM_CONTROLLED_DEMO_SEED === 'YES';
const STARTUP_GUARD_KEY = 'controlledDemoSeedStartupGuardV1';

if (allowDemoSeed && confirmDemoSeed) {
  try {
    const { prisma } = await import('./lib/prisma.js');
    const existingGuard = await prisma.businessSetting.findUnique({
      where: { key: STARTUP_GUARD_KEY },
      select: { id: true, value: true },
    });

    if (existingGuard) {
      console.log('[MangalSaath instrumentation] Controlled demo seed already guarded; skipping repeat startup seed. Remove temporary seed flags.');
    } else {
      await prisma.businessSetting.upsert({
        where: { key: STARTUP_GUARD_KEY },
        create: {
          id: `setting_${STARTUP_GUARD_KEY}`,
          key: STARTUP_GUARD_KEY,
          category: 'demo',
          value: {
            status: 'started',
            startedAt: new Date().toISOString(),
            reason: 'startup-one-time-guard',
          },
          isSecret: true,
        },
        update: {},
      });

      console.log('[MangalSaath instrumentation] Controlled demo seed explicitly authorized; one-time guard recorded; starting seed...');
      await import('./scripts/seed-demo-profiles.mjs');
      await prisma.businessSetting.update({
        where: { key: STARTUP_GUARD_KEY },
        data: {
          value: {
            status: 'dispatched',
            dispatchedAt: new Date().toISOString(),
            reason: 'startup-one-time-guard',
          },
        },
      });
      console.log('[MangalSaath instrumentation] Controlled demo seed dispatched once. Future restarts will skip it; remove temporary seed flags now.');
    }
  } catch (error) {
    console.error('[MangalSaath instrumentation] Seed safety guard could not confirm a safe run; skipping startup seed.', error);
  }
} else {
  console.log('[MangalSaath instrumentation] Controlled demo seed not authorized; skipping.');
}
