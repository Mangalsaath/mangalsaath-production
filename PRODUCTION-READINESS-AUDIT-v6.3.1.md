# MangalSaath v6.3.1 Production Readiness Audit

## Executive decision

This release is a security-corrected **production foundation**, not yet the final public-launch build.

## Critical correction completed

- Removed the plaintext administrator credential document from the distributable project.
- Removed `config/admin-bootstrap.json`, which contained a reusable temporary administrator password.
- Disabled automatic administrator creation from plaintext project files.
- Administrator creation must now be performed explicitly through environment variables and `npm run create-admin`.

## Database status

The current Prisma schema stores the verified v6.2.3 application state inside one MySQL JSON column. This provides persistent MySQL storage and a low-regression migration path, but it is **not yet a fully normalized relational migration**.

Before a high-traffic public launch, the following collections should move to dedicated relational tables:

- users and sessions
- profiles and profile photos
- interests and messages
- OTP and password-reset challenges
- plans, subscriptions, coupons and transactions
- admin audit logs and settings

## Launch blockers

1. Full normalized relational schema and transactional repository layer.
2. Real SMS and email OTP integration; demo OTP must be disabled in production.
3. Super Admin dual OTP using configurable mobile and email values.
4. External object storage or a documented durable upload-volume strategy.
5. Payment verification and webhook implementation.
6. End-to-end production build and database tests against MySQL 8.
7. Backup restore drill.
8. Privacy, consent, retention and account-deletion workflow verification.

## Minimum safe deployment rules

- Never deploy `.env`, local database exports, credential notes or bootstrap JSON files.
- Set a long random `APP_SECRET` and database password.
- Create the first administrator only through the documented command.
- Force HTTPS and verify HSTS only after the domain is permanently configured.
- Keep database backups outside the application server.

## Verification performed in this workspace

- Source-tree inspection completed.
- Plaintext credential exposure identified and removed.
- JavaScript syntax validation can be run with `npm run check` after dependencies are installed.
- Full dependency installation/build was not completed here because the npm install command did not finish within the available execution window.
