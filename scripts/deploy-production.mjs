import process from 'node:process';

console.log('[MangalSaath deployment] Verifying production environment...');
await import('./verify-production-env.mjs');

console.log('[MangalSaath deployment] Applying schema and required seed data...');
await import('./initialize-production.mjs');

console.log('[MangalSaath deployment] Production preparation completed successfully.');
console.log('[MangalSaath deployment] Start the application with: npm start');
process.exit(0);
