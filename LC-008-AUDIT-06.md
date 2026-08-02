# LC-008 Audit 06 — Final Static Production Certification

## Scope
Release engineering, production configuration, bootstrap-secret lifecycle, startup/deployment gates, operational scripts, and final source-only risk review.

## Verified finding and remediation

### High — `NODE_ENV` enforcement could be bypassed by a fallback
`scripts/env-config.mjs` previously defaulted a missing `NODE_ENV` to `production`. The production validator therefore could not distinguish an explicitly configured production environment from a missing variable.

**Fix:** `NODE_ENV` is now read without a fallback. Production start/deployment fails unless the hosting environment explicitly sets `NODE_ENV=production`.

### High — One-time bootstrap password was required on every restart
`.env.example` correctly documents `ADMIN_PASSWORD` as a one-time first-install secret that should be removed. However, the production environment validator required it during every `npm start`, forcing a sensitive temporary credential to remain configured permanently.

**Fix:** `ADMIN_PASSWORD` is no longer mandatory for routine startup. When present for first install or an intentional reset, its strength is still validated. Initial Super Admin creation remains protected by `prepare-production.mjs`, which fails if creation is needed and no valid bootstrap password exists.

## Static certification matrix

| Area | Result |
|---|---|
| Explicit production environment | PASS |
| Startup environment gate | PASS |
| Deployment environment gate | PASS |
| One-time bootstrap secret lifecycle | PASS |
| Lockfile/reproducible install structure | PASS |
| Startup is read-only | PASS |
| Explicit database preparation command | PASS with observation |
| Health endpoint | PASS |
| Backup export/checksum structure | PASS |
| Final source-only launch blockers | None known after remediation |

## Observation
The database preparation command uses `prisma db push` because this repository does not contain a complete baseline migration history for a fresh database. This requires a live pre-deployment backup and schema review. It remains a runtime deployment gate, not a source-only PASS for migration safety.

## Source-only verdict
**PASS — PRE-DEPLOYMENT CERTIFIED.** No known critical source-code blocker remains in the audited scope.

This is not the public-launch GO. The following live gates remain mandatory:

1. `npm ci` and `npm run build` on Hostinger.
2. Production database backup before schema preparation.
3. `npm run deploy:production` against MySQL and schema verification.
4. `npm start` plus `/api/health` HTTP 200 verification.
5. SMTP OTP and password-recovery delivery.
6. Full member/admin browser UAT.
7. HTTPS, domain, logging, restart, backup and restore drill.
