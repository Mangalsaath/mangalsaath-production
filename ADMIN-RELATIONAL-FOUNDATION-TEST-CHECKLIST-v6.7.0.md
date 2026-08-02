# Admin Relational Foundation — Test Checklist

- [ ] `npm install` succeeds with Node 20.9+
- [ ] `npm run db:generate` succeeds
- [ ] Backup the database before schema changes
- [ ] `npm run db:push` creates all Admin Console tables
- [ ] `npm run db:admin:migrate` completes without error
- [ ] Re-running the migration creates no duplicate plans, coupons, sections or logs
- [ ] `npm run db:admin:verify` reports every category as `ok: true`
- [ ] Legacy Admin pages still load because runtime cutover has not occurred
- [ ] Sensitive metadata keys are redacted by `lib/admin-audit.js`
- [ ] A member account is denied by `requireAdmin`
- [ ] The current `admin` role receives all launch permissions
- [ ] Prisma schema validation and production build succeed
