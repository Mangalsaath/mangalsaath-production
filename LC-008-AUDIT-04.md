# LC-008 Audit 04 — Data Protection & Operational Readiness

## Result

**Static audit: PASS after remediation**  
**Runtime restore drill: PENDING on staging/Hostinger MySQL**  
**Public launch verdict: NO-GO until runtime gates pass**

## High-severity finding fixed

The prior `db:backup` command exported only the transitional `application_state` JSON row. The application now writes operational data to relational tables, so that backup could omit users, profiles, sessions, interests, messages, blocks, reports, settings, plans, coupons, payments, memberships, admin notes, audit logs and moderation events.

This created a serious recovery risk: a backup could report success while being incomplete.

## Remediation

`scripts/backup-database.mjs` now:

- exports the complete relational data set plus transitional application state;
- records table counts in a versioned backup manifest;
- creates the backup with owner-only permissions;
- refuses to overwrite an existing backup file;
- writes a SHA-256 checksum alongside the backup;
- supports a configurable private `BACKUP_DIR`;
- avoids printing database credentials or record contents.

## Verification

- `npm run check` — PASS
- `npm run verify:lc006-007` — PASS
- `npm run verify:launch` — PASS
- `npm run verify:lc008:static` — PASS
- `npm run verify:lc008:audit03` — PASS
- `npm run verify:lc008:audit04` — PASS
- JavaScript/MJS syntax checks — PASS

## Remaining production gates

1. Run the backup against a staging copy of Hostinger MySQL.
2. Compare manifest counts with database counts.
3. Restore into an empty staging database using a controlled MySQL restore procedure.
4. Run relational verification and browser smoke tests against the restored database.
5. Confirm backups are copied off the application server and encrypted at rest.

A static code audit cannot certify a real restore. Final GO remains dependent on the Hostinger build, live migrations, SMTP delivery, browser UAT, SSL/DNS, restart recovery and a successful staging restore drill.
