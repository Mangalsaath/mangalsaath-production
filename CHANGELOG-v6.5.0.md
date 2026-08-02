# MangalSaath v6.5.0 — Relational Core Foundation

## Launch-critical work completed

- Added normalized MySQL/Prisma models for users, member profiles, sessions, interests, messages, blocks and reports.
- Preserved the existing `application_state` table as the runtime source of truth during transition.
- Added an idempotent migration command that copies core records from the legacy JSON state into relational tables inside a transaction.
- Added migration-run audit records with source version, counts, status and error details.
- Added a verification command that compares legacy and relational record counts before any cutover.
- Added indexes for login identity, profile discovery, unread messages, interests, safety moderation and expiry cleanup.
- Added cascade rules for member-owned records.
- Preserved existing string IDs so routes and historical references can transition without ID remapping.

## Important scope boundary

This release creates and populates the relational core, but does **not** switch live API routes to relational reads/writes yet. That deliberate two-stage approach prevents a risky all-at-once database rewrite. The existing JSON state remains authoritative until verification passes and the next cutover release is locally tested.
