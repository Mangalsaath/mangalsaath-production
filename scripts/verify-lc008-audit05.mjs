import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const fail = (message) => {
  console.error(`LC-008 Audit 05 verification failed: ${message}`);
  process.exit(1);
};

const pkg = JSON.parse(read('package.json'));
const start = read('scripts/start-production.mjs');
const deploy = read('scripts/deploy-production.mjs');
const envVerify = read('scripts/verify-production-env.mjs');
const health = read('app/api/health/route.js');

if (pkg.scripts.start !== 'node scripts/start-production.mjs') fail('production start script is not controlled.');
if (pkg.scripts['deploy:production'] !== 'node scripts/deploy-production.mjs') fail('explicit production deployment command is missing.');
if (start.includes("initialize-production.mjs")) fail('startup still mutates or seeds the database.');
if (!deploy.includes("initialize-production.mjs")) fail('deployment command does not apply schema/seed preparation.');
if (!envVerify.includes('NODE_ENV must be production')) fail('production NODE_ENV enforcement is missing.');
if (!start.includes("SIGTERM") || !start.includes("SIGINT")) fail('graceful signal forwarding is missing.');
if (!health.includes('SELECT 1') || !health.includes('status: 503')) fail('database-backed health check is incomplete.');
if (!fs.existsSync('package-lock.json')) fail('package-lock.json is required for reproducible npm ci installs.');

console.log('LC-008 Audit 05 deployment-safety and operational-resilience checks passed.');
