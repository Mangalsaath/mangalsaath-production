# MangalSaath LC-008 — Audit 02

## Scope

Static production certification of the v1.5.6 LC-006/LC-007 hardening baseline, covering release traceability, protected Admin APIs, Super Admin OTP session enforcement, payment webhook integrity checks, health-check design, and required relational schema models.

## Verified PASS

- `npm run check`
- `npm run verify:lc006-007`
- `npm run verify:launch`
- `npm run verify:lc008:static`
- Release ZIP contains no `.env`, `.env.production`, Hostinger environment file, private key, certificate, local database, or database dump.
- Admin routes inspected use `requireAdmin(...)` and require a verified Admin OTP session.
- Admin operations are permission-scoped rather than dashboard-role-only.
- Razorpay webhook requires a configured webhook secret and verifies the signature before processing.
- Razorpay webhook validates paid amount and currency against the stored transaction.
- Health endpoint checks the database with `SELECT 1` and returns `Cache-Control: no-store`.
- Required relational models exist for users, sessions, payments, memberships, and Admin audit logs.

## Changes made in this audit

1. Corrected stale verification output labels from v1.5.1/v1.0 to v1.5.6.
2. Added `scripts/verify-lc008-static.mjs`.
3. Added npm command `verify:lc008:static`.

## Runtime limitation

A genuine `npm ci`/`next build` could not be completed in this execution environment because its internal package proxy returned HTTP 404 for `@prisma/client@6.19.0`. This is an environment/package-mirror limitation, not evidence that the application build passes or fails on Hostinger.

## Still pending before GO

- Dependency installation and `npm run build` on a machine with normal npm registry access.
- Prisma generation and migration against the live Hostinger MySQL database.
- SMTP OTP delivery through the configured Hostinger mailbox.
- Browser UAT for registration, OTP, login, profile, search, interests, membership, payment, and Admin approval.
- SSL/DNS checks on `mangalsaath.com`.
- Backup creation and restoration test.
- Production restart and log review.

## Current verdict

**LC-008 IN PROGRESS — NO-GO until runtime and live production checks pass.**
