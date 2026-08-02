import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  console.error(`\n[MangalSaath initialization] ${message}`);
  process.exit(1);
}

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) fail('DATABASE_URL is missing. Add it in the Hostinger environment settings.');
if (!/^mysql:\/\//i.test(databaseUrl)) fail('DATABASE_URL must start with mysql://.');

console.log('[MangalSaath initialization] Creating or updating the MySQL schema...');
const prismaCli = path.join(projectRoot, 'node_modules', 'prisma', 'build', 'index.js');
const result = spawnSync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate'], {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit'
});

if (result.error) fail(`Unable to start Prisma: ${result.error.message}`);
if (result.status !== 0) {
  fail('Prisma could not initialize the database. Recheck the database host, database name, username, password and URL encoding.');
}

console.log('[MangalSaath initialization] Seeding required production data...');
await import('./prepare-production.mjs');
console.log('[MangalSaath initialization] Database initialization completed successfully.');
