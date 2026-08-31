import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('[MangalSaath startup] Verifying production environment...');
await import('./verify-production-env.mjs');

// Hostinger auto-deploy starts the app with `npm start`, so run only the narrow,
// idempotent compatibility migration required for the configured Super Admin.
console.log('[MangalSaath startup] Verifying Super Admin role compatibility...');
await import('./migrate-super-admin-role.mjs');

// Controlled synthetic demo profiles may be seeded only when BOTH explicit
// production flags are present in the Web App runtime environment. The seed
// script itself performs the same guard checks and uses deterministic upserts,
// so repeated startup while the flags remain enabled will not create duplicates.
const allowDemoSeed = process.env.ALLOW_SYNTHETIC_DEMO_SEED === 'true';
const confirmDemoSeed = process.env.CONFIRM_CONTROLLED_DEMO_SEED === 'YES';
if (allowDemoSeed && confirmDemoSeed) {
  console.log('[MangalSaath startup] Controlled demo seed explicitly authorized; seeding synthetic profiles...');
  await import('./seed-demo-profiles.mjs');
  console.log('[MangalSaath startup] Controlled demo seed completed. Remove the temporary seed flags now.');
} else {
  console.log('[MangalSaath startup] Controlled demo seed not authorized; skipping.');
}

console.log('[MangalSaath startup] Starting the production web server...');
const nextCli = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextCli, 'start'], {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit'
});

let shuttingDown = false;
function forwardSignal(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (!child.killed) child.kill(signal);

  const timer = setTimeout(() => {
    if (!child.killed) child.kill('SIGKILL');
  }, 10_000);
  timer.unref();
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => forwardSignal(signal));
}

child.on('error', (error) => {
  console.error(`[MangalSaath startup] Unable to start Next.js: ${error.message}`);
  process.exit(1);
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
