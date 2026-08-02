import fs from 'node:fs';

const requiredFiles = [
  'app/page.js',
  'app/layout.js',
  'next.config.mjs',
  '.env.example',
  'prisma/schema.prisma',
  'lib/db.js',
  'lib/security.js',
  'CHANGELOG-v6.3.1.md',
  'PRODUCTION-READINESS-AUDIT-v6.3.1.md',
  'CHANGELOG-v6.3.2.md',
  'AUTHENTICATION-TEST-CHECKLIST-v6.3.2.md',
  'lib/profile-visibility.js',
  'CHANGELOG-v6.4.1.md',
  'DATA-SAFETY-TEST-CHECKLIST-v6.4.1.md',
  'app/api/health/route.js',
  'SPRINT-5-DEPLOYMENT-GUIDE.md',
  'SPRINT-5-LAUNCH-CHECKLIST.md'
];

const missing = requiredFiles.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error(`Missing required project files: ${missing.join(', ')}`);
  process.exit(1);
}

const env = fs.readFileSync('.env.example', 'utf8');
for (const key of [
  'DATABASE_URL',
  'NEXT_PUBLIC_SITE_URL',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD'
]) {
  if (!env.includes(`${key}=`)) {
    console.error(`Missing environment template key: ${key}`);
    process.exit(1);
  }
}

const forbiddenCredentialFiles = [
  'config/admin-bootstrap.json',
  'ADMIN-LOGIN-DETAILS.txt'
];
const exposed = forbiddenCredentialFiles.filter((file) => fs.existsSync(file));
if (exposed.length) {
  console.error(`Unsafe credential files must not be distributed: ${exposed.join(', ')}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log(`MangalSaath ${pkg.version} structure, environment, health-check and credential-safety checks passed.`);
