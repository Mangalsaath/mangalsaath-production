# MangalSaath v1.4.0 Sprint 4 — Launch Readiness Report

Audit date: 27 July 2026
Base: v1.3.0 Sprint 3 Admin Verification Center

## Executive decision

**Status: CONDITIONAL NO-GO for public deployment.**

The static code audit passed after three launch-blocking defects were corrected. A real production build, database migration test, SMTP delivery test and browser-based end-to-end test are still mandatory before public deployment.

## Verified by inspection and static testing

- 73 JavaScript/MJS files passed `node --check`.
- Production environment template contains placeholders rather than live passwords.
- Production templates disable demo OTP.
- Member registration uses email OTP and records mobile verification as pending.
- Admin approval and mobile verification are separate in the relational workflow.
- Admin APIs generally use authenticated sessions and permission checks.
- OTP values are HMAC-hashed and time-limited.
- Passwords use salted scrypt hashes.
- Uploaded profile/payment images are restricted by MIME pattern and size; QR upload also checks file signatures.
- Prisma models include indexes for major member, approval, communication and audit queries.

## Launch blockers corrected in Sprint 4

### FIX-01 — Payment QR administrator authorization

The QR route called asynchronous authentication without awaiting it and used a local authorization implementation. This could cause runtime failure and incomplete administrator identity in audit records.

**Correction:** The route now awaits the centralized `requireAdmin` guard, requires `settings.write`, and requires the completed Super Admin email-OTP session.

### FIX-02 — Super Admin password change in relational mode

The password-change route updated only the transitional application-state record. With relational authentication enabled, the MySQL `User.passwordHash` could remain unchanged.

**Correction:** The route now updates the relational user password and invalidates relational sessions after a password change.

### FIX-03 — Legacy approval incorrectly verified mobile

The legacy fallback workflow still set `mobileVerified=true` when approving a profile, contradicting the launch policy.

**Correction:** Approval now updates approval status only; manual mobile verification remains a separate action.

## Remaining mandatory verification

| Area | Status | Required evidence |
|---|---|---|
| Next.js production build | Not verified | `npm ci` and `npm run build` complete successfully |
| Prisma generation | Not verified | Prisma client generates against the release package |
| Sprint 3 migration | Not verified | Apply to a backup/staging copy of Hostinger MySQL |
| SMTP email OTP | Not verified | Registration and Super Admin OTP delivered to real mailboxes |
| Registration journey | Not verified | Request OTP, verify, account creation, login |
| Super Admin journey | Not verified | Password + security answer + email OTP + dashboard access |
| Manual mobile verification | Not verified | Pending → verified, verifier and timestamp stored |
| Approval/rejection/suspension | Not verified | UI actions persist and audit logs are created |
| Profile/search/interests/messages | Not verified | Browser E2E against staging database |
| QR upload | Not verified | Upload, replace and delete through Admin Console |
| Payment/coupon flows | Not verified | Test with payment engine disabled and enabled separately |
| Mobile responsiveness | Not verified | Android/iPhone/tablet viewport testing |
| Production domain/SSL | Not verified | Hostinger deployment smoke test |

## Risks that are not immediate blockers but should be monitored

1. Rate limiting is process-memory based. It is acceptable for a single Node process at initial launch, but it will not be shared across multiple instances and resets on restart.
2. The transitional `ApplicationState` JSON store remains in the codebase alongside relational tables. Keep all storage modes set to `relational` in production and schedule removal after migration verification.
3. Profile photos and QR images are stored as data URLs. This is workable for a low-volume launch but database size can grow quickly; object storage should be introduced after launch.
4. Security answers are configured as environment secrets and compared using HMAC. Rotate the answer if it has ever been shared and keep it separate from passwords.

## Go-live gates

Public deployment may proceed only after all of the following pass:

1. Clean install and production build.
2. Database backup and successful staging migration.
3. Real member email OTP delivery.
4. Real Super Admin email OTP login.
5. Admin verification, approval and suspension smoke tests.
6. Member profile, search, interest and messaging smoke tests.
7. Production health endpoint, domain and SSL checks.

## Sprint 4 status

- Architecture inspection: PASS
- Static syntax verification: PASS
- Critical code corrections: PASS
- Full build verification: PENDING
- Database verification: PENDING
- Functional E2E verification: PENDING
- Production verification: PENDING

**Recommendation:** Do not deploy this package directly over the live site yet. Use it for the next controlled build and staging verification step.
