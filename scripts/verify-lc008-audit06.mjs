import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const fail = (message) => {
  console.error(`LC-008 Audit 06 verification failed: ${message}`);
  process.exit(1);
};

const pkg = JSON.parse(read('package.json'));
const envConfig = read('scripts/env-config.mjs');
const envVerify = read('scripts/verify-production-env.mjs');
const envExample = read('.env.example');
const start = read('scripts/start-production.mjs');
const deploy = read('scripts/deploy-production.mjs');

if (envConfig.includes('nodeEnv: envText("NODE_ENV", "production")')) {
  fail('NODE_ENV still has an unsafe production fallback.');
}
if (!envConfig.includes('nodeEnv: envText("NODE_ENV")')) {
  fail('NODE_ENV is not read without a fallback.');
}
if (envVerify.includes('required(env.adminPassword, "ADMIN_PASSWORD")')) {
  fail('one-time ADMIN_PASSWORD is still mandatory during every production start.');
}
if (!envVerify.includes('When ADMIN_PASSWORD is present')) {
  fail('optional bootstrap password strength validation is missing.');
}
if (!envExample.includes('ONE-TIME FIRST INSTALL ONLY')) {
  fail('bootstrap secret lifecycle is not documented in .env.example.');
}
if (!start.includes("verify-production-env.mjs")) fail('startup environment gate is missing.');
if (!deploy.includes("verify-production-env.mjs")) fail('deployment environment gate is missing.');
if (!fs.existsSync('package-lock.json')) fail('package-lock.json is missing.');
if (!pkg.scripts['verify:lc008:audit06']) fail('Audit 06 verification command is missing.');

console.log('LC-008 Audit 06 release-configuration and bootstrap-secret lifecycle checks passed.');
