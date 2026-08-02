# MangalSaath v6.7.0 — Admin Relational Foundation

## Implemented
- Added relational Prisma models for business settings, membership plans and features, coupons and plan links, coupon redemptions, payment transactions, homepage sections, append-only admin audit logs, and photo moderation events.
- Added centralized role-to-permission authorization service for current and future administrator roles.
- Added audit-log service that redacts sensitive fields before persistence.
- Added idempotent migration tooling from the legacy ApplicationState admin collections.
- Added count verification tooling for staged migration safety.

## Commands
```bash
npm run db:generate
npm run db:push
npm run db:admin:migrate
npm run db:admin:verify
```

## Runtime status
This release creates and migrates the relational foundation. Existing Admin screens continue using legacy storage until the Admin Core cutover is implemented and verified.
