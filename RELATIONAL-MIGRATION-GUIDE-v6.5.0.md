# Relational Core Migration Guide — v6.5.0

## Before starting

1. Back up the existing database: `npm run db:backup`
2. Confirm `DATABASE_URL` points to the intended MySQL database.
3. Install dependencies: `npm install`
4. Generate Prisma client: `npm run db:generate`
5. Create/update tables in a non-production copy first: `npm run db:push`

## Copy legacy records into relational tables

Run:

`npm run db:relational:migrate`

The command is idempotent: it upserts existing IDs instead of creating duplicate rows.

## Verify

Run:

`npm run db:relational:verify`

Do not enable a relational runtime cutover unless the command returns `"ok": true` and application journey tests pass.

## Rollback

No runtime cutover occurs in v6.5.0. The application continues using `application_state`, so rollback is simply deploying v6.4.2. The new relational tables may remain unused or be dropped after confirming a backup exists.
