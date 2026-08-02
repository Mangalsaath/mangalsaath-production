// Deliberately guarded: this command changes the production Super Admin password.
if (String(process.env.ADMIN_RESET_PASSWORD || '').toLowerCase() !== 'true') {
  throw new Error('Refusing to reset Super Admin. Set ADMIN_RESET_PASSWORD=true for this one-time command.');
}
if (String(process.env.ADMIN_PASSWORD || '').length < 12) {
  throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
}
await import('./prepare-production.mjs');
