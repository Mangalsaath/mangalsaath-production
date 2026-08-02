# MangalSaath LC-006 + LC-007 Certification Report

Version: 1.5.6
Baseline: Mangalsaath-v1.5.1-Sprint-5.1-Configuration-Refactor(6).zip
Scope: Membership, Payments, Coupons and Admin Operations

## Status

Static code hardening: PASS
Production runtime certification: PENDING
Final launch decision: NO-GO until LC-008 runtime UAT is completed

## Launch-critical fixes completed

1. Added relational manual-UPI payment submission.
2. Added database-unique UTR/reference protection.
3. Added secure payment-proof type and 1 MB size validation.
4. Added atomic pending-to-paid/rejected payment state transitions.
5. Added relational Admin payment approval/rejection with payment-review permission and dual-OTP enforcement.
6. Added same-plan renewal carry-forward so unused paid time is preserved.
7. Added Razorpay webhook amount and currency validation.
8. Removed payment proof and internal verification metadata from member-facing payment responses.
9. Removed bundled production environment files and strengthened ignore rules.
10. Added action-specific Admin authorization for reports, member verification, mobile verification, member status, notes and photo moderation.
11. Prevented Dashboard-only roles from receiving member, reports, payment, plan or audit datasets without the matching permission.
12. Prevented non-Super-Admin roles from changing Super Admin recovery email/mobile and authentication timing settings.
13. Restricted member-operation targets to role=member, preventing accidental action against Admin-family accounts.
14. Added static LC-006/LC-007 regression verification.

## Verified controls

- A member cannot submit a manual payment without authentication.
- Manual payment amount is calculated server-side from the active database plan.
- Duplicate UTR/reference values are rejected at API and database levels.
- A pending payment cannot be approved or rejected twice.
- One payment maps to at most one membership through the unique paymentId relation.
- Online gateway payments cannot be manually approved.
- Payment approval requires an Admin role with payments.review permission and completed Admin OTP verification.
- Membership renewals preserve remaining time when renewing the same plan.
- Suspended members are signed out by deleting active sessions.
- Sensitive Super Admin contact/authentication settings require the super_admin role.
- Admin datasets are filtered according to role permissions.

## Remaining production checks

- Apply and verify Prisma migration against a production-like MySQL copy.
- Verify real Hostinger SMTP and Super Admin OTP delivery.
- Test manual UPI submit -> approve -> membership activation in a browser.
- Test reject flow and duplicate/concurrent approval attempts.
- Test Razorpay order, checkout signature and webhook using gateway test mode.
- Verify membership expiry, renewal and plan replacement using controlled dates.
- Verify coupon usage-limit behaviour under concurrent requests.
- Verify all entitlement limits across interests, messages, profile views and contact visibility.
- Confirm database backup and restore.

## Verification commands run

- npm run verify:lc006-007 — PASS
- npm run check — PASS
- node --check across app, lib and scripts — PASS

## Modified core files

- app/api/admin/payments/route.js
- app/api/admin/route.js
- app/api/admin/settings/route.js
- app/api/membership/route.js
- app/api/payments/webhook/route.js
- lib/payment-engine.js
- prisma/schema.prisma
- prisma/migrations/20260729_lc006_lc007_payment_hardening/migration.sql
- scripts/verify-lc006-lc007.mjs
- package.json
- .gitignore

## Recommendation

Proceed to LC-008 only after deploying this build to a staging or production-like Hostinger environment. Do not open public registration until the runtime checks above pass.
