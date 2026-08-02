import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => { throw new Error(`LC-008 static certification failed: ${message}`); };
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const pkg = JSON.parse(read('package.json'));
if (!/^1\.6\.\d+$/.test(pkg.version)) fail(`unexpected package version ${pkg.version}`);

for (const forbidden of ['.env', '.env.production', 'HOSTINGER.env', 'HOSTINGER-PUBLIC-LAUNCH-v1.2.0.env']) {
  if (exists(forbidden)) fail(`${forbidden} must not be bundled in the release`);
}

const requiredRoutes = [
  'app/api/health/route.js',
  'app/api/auth/login/route.js',
  'app/api/auth/admin-otp/route.js',
  'app/api/auth/register/route.js',
  'app/api/auth/reset-password/route.js',
  'app/api/session/route.js',
  'app/api/profiles/route.js',
  'app/api/interests/route.js',
  'app/api/messages/route.js',
  'app/api/payments/order/route.js',
  'app/api/payments/verify/route.js',
  'app/api/payments/webhook/route.js',
  'app/api/admin/route.js',
  'app/api/admin/payments/route.js',
  'app/api/admin/settings/route.js'
];
for (const file of requiredRoutes) if (!exists(file)) fail(`missing required route ${file}`);

for (const file of ['app/api/admin/route.js','app/api/admin/payments/route.js','app/api/admin/settings/route.js','app/api/admin/qr/route.js']) {
  const source = read(file);
  if (!source.includes('requireAdmin')) fail(`${file} does not invoke requireAdmin`);
  if (!source.includes('requireDualOtp: true')) fail(`${file} does not require verified Admin OTP session`);
}

const webhook = read('app/api/payments/webhook/route.js');
for (const marker of ['RAZORPAY_WEBHOOK_SECRET','verifyWebhookSignature','Payment amount mismatch','Payment currency mismatch']) {
  if (!webhook.includes(marker)) fail(`payment webhook is missing ${marker}`);
}

const health = read('app/api/health/route.js');
if (!health.includes('SELECT 1') || !health.includes('Cache-Control')) fail('health check is not database-backed/no-store');

const schema = read('prisma/schema.prisma');
for (const model of ['User','SessionRecord','PaymentTransaction','UserMembership','AdminAuditLog']) {
  if (!schema.includes(`model ${model} `) && !schema.includes(`model ${model}{`) && !schema.includes(`model ${model} {`)) fail(`Prisma model ${model} is missing`);
}

console.log('LC-008 static release, route protection, payment webhook and schema checks passed.');
