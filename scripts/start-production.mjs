import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('[MangalSaath startup] Verifying production environment...');
await import('./verify-production-env.mjs');

// Startup must remain read-only. Schema synchronization and seed operations are
// intentionally performed by `npm run deploy:production`, not on every restart.
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
