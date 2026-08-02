import crypto from 'node:crypto';
import tls from 'node:tls';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const failures = [];

function pass(message) {
  console.log(`PASS  ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`FAIL  ${message}`);
}

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) fail(`${name} is missing.`);
  return value;
}

function passwordMatches(password, storedHash) {
  if (!password || !storedHash?.includes(':')) return false;
  const [salt, expectedHex] = storedHash.split(':');
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function waitForReply(socket, expectedCodes) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('timeout', onTimeout);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onTimeout = () => {
      cleanup();
      reject(new Error('connection timed out'));
    };
    const onData = (chunk) => {
      buffer += chunk.toString('utf8');
      const last = buffer.split(/\r?\n/).filter(Boolean).at(-1) || '';
      if (!/^\d{3} /.test(last)) return;
      cleanup();
      const code = Number(last.slice(0, 3));
      if (!expectedCodes.includes(code)) {
        reject(new Error(code === 535 ? 'authentication rejected (535)' : `server rejected command (${code})`));
        return;
      }
      resolve();
    };
    socket.on('data', onData);
    socket.once('error', onError);
    socket.once('timeout', onTimeout);
  });
}

async function smtpCommand(socket, command, expectedCodes) {
  socket.write(`${command}\r\n`);
  await waitForReply(socket, expectedCodes);
}

async function verifySmtp() {
  const host = required('SMTP_HOST');
  const port = Number(required('SMTP_PORT'));
  const user = required('SMTP_USER');
  const password = required('SMTP_PASS');
  const from = required('DEFAULT_FROM_EMAIL');
  if (!host || !port || !user || !password || !from) return;
  if (String(process.env.SMTP_SECURE || '').toLowerCase() !== 'true') {
    fail('SMTP_SECURE must be true for the configured implicit-TLS service.');
    return;
  }

  const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: true });
  socket.setTimeout(15000);
  try {
    await waitForReply(socket, [220]);
    await smtpCommand(socket, 'EHLO mangalsaath.com', [250]);
    await smtpCommand(socket, 'AUTH LOGIN', [334]);
    await smtpCommand(socket, Buffer.from(user).toString('base64'), [334]);
    await smtpCommand(socket, Buffer.from(password).toString('base64'), [235]);
    await smtpCommand(socket, `MAIL FROM:<${from}>`, [250]);
    await smtpCommand(socket, 'RSET', [250]);
    await smtpCommand(socket, 'QUIT', [221]);
    pass(`SMTP authentication and sender accepted for ${user}.`);
  } catch (error) {
    fail(`SMTP check failed: ${error.message}.`);
  } finally {
    socket.destroy();
  }
}

async function verifyDatabaseAndAdmin() {
  const databaseUrl = required('DATABASE_URL');
  if (!databaseUrl) return;
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.protocol !== 'mysql:') fail('DATABASE_URL must start with mysql://.');
    else pass(`DATABASE_URL format is valid (${parsed.hostname}:${parsed.port || '3306'}/${parsed.pathname.slice(1)}).`);
  } catch {
    fail('DATABASE_URL is not a valid URL. URL-encode special characters in the password.');
    return;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    pass('MySQL authentication and query succeeded.');
  } catch (error) {
    fail(`MySQL check failed (${error.code || error.name || 'unknown error'}).`);
    return;
  }

  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      username: true,
      email: true,
      mobile: true,
      passwordHash: true,
      status: true,
      mustChangePassword: true
    }
  });
  if (admins.length !== 1) {
    fail(`Expected exactly one Super Admin; found ${admins.length}.`);
    return;
  }

  const admin = admins[0];
  pass(`One active Super Admin record found (${admin.email}, status=${admin.status}, mustChangePassword=${admin.mustChangePassword}).`);
  const configuredEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (configuredEmail && configuredEmail !== admin.email.toLowerCase()) {
    fail('ADMIN_EMAIL does not match the Super Admin stored in MySQL.');
  } else if (configuredEmail) {
    pass('ADMIN_EMAIL matches the stored Super Admin.');
  }

  const temporaryPassword = String(process.env.ADMIN_PASSWORD || '');
  if (temporaryPassword) {
    if (temporaryPassword.length < 12) fail('ADMIN_PASSWORD is shorter than the required 12 characters.');
    if (passwordMatches(temporaryPassword, admin.passwordHash)) {
      pass('ADMIN_PASSWORD matches the stored Super Admin password.');
    } else {
      fail('ADMIN_PASSWORD does not match the stored Super Admin password. Run the guarded one-time reset command if intended.');
    }
  } else {
    pass('No persistent ADMIN_PASSWORD is configured (recommended after first login).');
  }
}

console.log('MangalSaath Hostinger preflight (secrets are never printed)');
try {
  await verifyDatabaseAndAdmin();
  await verifySmtp();
} finally {
  await prisma.$disconnect();
}

if (failures.length) {
  console.error(`\nPreflight failed with ${failures.length} issue(s). Do not redeploy yet.`);
  process.exitCode = 1;
} else {
  console.log('\nPreflight passed. Database, Super Admin and SMTP are ready.');
}
