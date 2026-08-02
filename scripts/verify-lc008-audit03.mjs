import fs from 'fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const settings = read('app/api/admin/settings/route.js');
const password = read('app/api/admin/password/route.js');
const adminAuth = read('lib/admin-auth.js');

assert(settings.includes('function isSuperAdmin(user)'), 'Super Admin role compatibility helper is missing.');
assert(settings.includes('!isSuperAdmin(admin)'), 'Protected settings are not restricted to the canonical Super Admin roles.');
assert((settings.match(/protectedSecurityKeys/g) || []).length >= 2, 'Protected settings must be enforced in both relational and legacy storage modes.');
assert(password.includes('["admin", "super_admin"]'), 'Admin password change does not support both canonical Super Admin role labels.');
assert(adminAuth.includes('super_admin: ALL_PERMISSIONS'), 'Super Admin permissions are missing.');

console.log('LC-008 Audit 03 Super Admin role and protected-settings checks passed.');
