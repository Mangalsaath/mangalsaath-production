# LC-006 + LC-007 — Work in Progress

Baseline: v1.5.1 Sprint 5.1 Configuration Refactor
Working version: v1.5.2

## Completed in first engineering pass

- Added relational manual-UPI payment submission.
- Added unique UTR storage at database level.
- Added relational admin payment approval/rejection with permission checks and dual-OTP enforcement.
- Added atomic pending-to-paid/rejected transition protection.
- Added same-plan renewal carry-forward so unused membership time is not lost.
- Added webhook amount and currency verification.
- Prevented member APIs from returning payment proof data or internal verification metadata.
- Added payment proof size/type validation.
- Removed bundled production environment files from the working release.

## Still under audit

- Coupon concurrency and reservation behaviour.
- Membership entitlement enforcement across every protected API.
- Admin plan/coupon/settings permission boundaries.
- Runtime Prisma migration and MySQL tests.
- Browser UAT for submit, approve, reject, renewal and expiry.
