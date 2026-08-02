# MangalSaath v1.1.1 Production Stabilization Edition

## Purpose

This release fixes the Hostinger deployment blocker caused by running database schema creation during the Next.js build.

## Changes

- Changed `npm run build` to run only Prisma Client generation and the Next.js production build.
- Added `npm run db:init` for explicit schema creation and production seeding.
- Changed `npm start` to safely initialize the database before starting Next.js.
- Added clearer errors for missing or invalid `DATABASE_URL` values and Prisma connection failures.
- Made production seed operations safe to run repeatedly.
- Made the first Super Admin bootstrap one-time and idempotent.
- Preserved an existing Super Admin even after the temporary bootstrap password is removed.
- Retained forced password change on first login.
- Retained dual mobile OTP and email OTP requirements for Super Admin login.

## First deployment sequence

1. Hostinger installs dependencies.
2. Hostinger runs `npm run build` without contacting MySQL.
3. Hostinger runs `npm start`.
4. The startup script runs Prisma schema initialization.
5. Required plans, coupon, settings and first Super Admin are created.
6. Next.js starts after initialization succeeds.

## Important

The first deployment still requires valid database credentials. A successful build confirms the source can compile; the application becomes available only after runtime database initialization succeeds.
