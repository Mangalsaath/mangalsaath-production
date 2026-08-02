# MangalSaath v6.7.1 — Admin Core Cutover

## Implemented
- Relational Admin dashboard metrics, member list, verification queue, reports, plans, payments and audit activity.
- Relational member activation and suspension; suspending a member revokes active sessions.
- Relational profile verification approval, rejection and information-request workflow.
- Relational report resolution and dismissal with mandatory notes.
- Relational primary-photo moderation with immutable moderation events.
- Relational business settings read/write with revision increments and redacted audit logging.
- Permission-based Admin authorization with mandatory dual-OTP session verification.
- Emergency rollback through `ADMIN_STORAGE_MODE=legacy`.
- Admin core verification command: `npm run db:admin-core:verify`.

## Deliberately deferred
- Plan, coupon and homepage-content writes remain read-only in relational mode until the Membership Admin release.
- Full payment approval cutover remains in the Payment release.
- Profile photo binary storage migration remains a production-hardening task.
