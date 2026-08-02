# Mangalsaath Changelog

Current release: **v6.1.0-LC1 — Integrated Audited Launch Candidate**.

See `CHANGELOG-v6.1.0.md` for the current release and historical changelog files for earlier versions.

## v6.7.0 — Admin Relational Foundation
See `CHANGELOG-v6.7.0.md`.

## v1.2.0 Sprint 2 — Production Environment
- Centralized application environment reads in `lib/config.js`.
- Added matching production-script configuration in `scripts/env-config.mjs`.
- Added fail-fast environment verification before production startup.
- Synchronized `.env.example`, `.env.production`, `HOSTINGER.env`, and Hostinger import template.
- Locked email OTP, manual mobile verification, and disabled mobile OTP as launch flags.

## v1.5.0 RC1 — Sprint 5
- Added public database health endpoint.
- Added controlled Hostinger deployment, rollback and launch-gate documentation.
- Added release verification command.
- Frozen feature scope for launch; only launch-blocking fixes are permitted.
