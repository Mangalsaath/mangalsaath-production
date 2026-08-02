# MangalSaath v6.5.2 — Relational Profile Cutover

## Completed
- Profile detail, owner profile, profile editing and public search now read from MySQL `member_profiles` and `users` tables.
- Profile and user summary updates are committed together in one Prisma transaction.
- Public profile visibility rules remain enforced after cutover.
- Existing block rules and maintenance settings remain compatible during the staged migration.
- Emergency rollback remains available through `PROFILE_STORAGE_MODE=legacy`.
- Added relational profile verification command.

## Verification command
```bash
npm run db:profiles:verify
```

## Required deployment sequence
```bash
npm install
npm run db:generate
npm run db:push
npm run db:relational:migrate
npm run db:relational:verify
npm run db:auth:verify
npm run db:profiles:verify
npm run build
```
