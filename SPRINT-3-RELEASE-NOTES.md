# MangalSaath v1.3.0 — Sprint 3 Admin Verification Center

## Implemented

- Separate profile approval and manual mobile verification workflows.
- Member approval fields with approver, date, status and reason.
- Mobile verification status, method, verifier and timestamp.
- Internal admin notes stored in a dedicated relational table.
- Audit entries for mobile verification, member notes, approval, rejection, suspension and reactivation.
- Admin dashboard counters for pending approvals, pending mobile checks, approved members and suspended members.
- Admin Verification Center with search, filters, member review, quick actions and timeline.
- Search supports member ID, name, email, mobile, city, state, religion, caste and membership.
- Registration copy corrected to reflect email OTP and manual mobile verification.

## Database action required

Apply the migration in:

`prisma/migrations/20260727_sprint3_admin_verification/migration.sql`

Back up the production database before applying the migration.

## Verification status

- Backend JavaScript syntax checks: passed.
- Migration and schema changes: reviewed statically.
- Full Next.js build: not verified in this environment because dependency installation timed out.
- Production database migration: not executed here.

## Important workflow rule

Approving a member no longer automatically marks their mobile number as verified. These are independent admin actions.
