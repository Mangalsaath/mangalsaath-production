const allowDemoSeed = process.env.ALLOW_SYNTHETIC_DEMO_SEED === 'true';
const confirmDemoSeed = process.env.CONFIRM_CONTROLLED_DEMO_SEED === 'YES';

if (allowDemoSeed && confirmDemoSeed) {
  console.log('[MangalSaath instrumentation] Controlled demo seed explicitly authorized; seeding synthetic profiles...');
  await import('./scripts/seed-demo-profiles.mjs');
  console.log('[MangalSaath instrumentation] Controlled demo seed completed. Remove the temporary seed flags now.');
} else {
  console.log('[MangalSaath instrumentation] Controlled demo seed not authorized; skipping.');
}
