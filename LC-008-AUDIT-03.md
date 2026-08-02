# MangalSaath LC-008 — Audit 03

**Release checkpoint:** v1.5.8  
**Scope:** API authorization consistency, Super Admin controls, database/state safety, and production launch risks.

## Verification executed

- `npm run check` — PASS
- `npm run verify:lc006-007` — PASS
- `npm run verify:launch` — PASS
- `npm run verify:lc008:static` — PASS
- `npm run verify:lc008:audit03` — PASS
- JavaScript syntax checks for modified routes — PASS

## Confirmed strengths

1. All 26 API routes were inventoried and their authentication/authorization markers reviewed.
2. Member write routes require an authenticated session.
3. Sensitive Admin routes use permission-based authorization and dual-OTP session enforcement.
4. Payment webhook signature, amount, and currency checks are present.
5. Payment UTR duplication and pending-payment duplication protections are present.
6. Optimistic version checking protects the legacy application-state store from silent overwrite conflicts.
7. Production health check does not expose database credentials or exception details.

## Finding fixed in this audit

### High — Super Admin role mismatch blocked protected security settings

The production bootstrap creates the first Super Admin with role `admin`, while the settings route previously allowed changes to Super Admin recovery and authentication settings only when the role string was exactly `super_admin`.

Impact before fix:

- The real bootstrap Super Admin could be denied when changing Super Admin email, mobile, OTP expiry, or Admin session duration in relational mode.
- The legacy storage branch did not apply the same protected-key role check.
- A future `super_admin` role could not use the Admin password-change endpoint.

Fix applied:

- Treat `admin` and `super_admin` as accepted canonical Super Admin role labels for protected security settings.
- Apply the same protected-setting restriction in both relational and legacy storage modes.
- Allow both canonical role labels in the Admin password-change endpoint.
- Add an automated regression check.

Modified files:

- `app/api/admin/settings/route.js`
- `app/api/admin/password/route.js`
- `scripts/verify-lc008-audit03.mjs`
- `package.json`

## Remaining observations

### Medium — Rate limiting is process-local

The current limiter uses an in-memory map. This is acceptable for a single Node process, but limits reset after restart and are not shared across multiple instances. It is not a blocker for a single-process Hostinger launch, but a shared database/Redis limiter is recommended before horizontal scaling.

### Medium — Mixed legacy and relational state remains operationally complex

Several flows use relational tables while notifications, activities, and compatibility data still use the application-state JSON record. Existing optimistic locking reduces overwrite risk, but production UAT must exercise concurrent Admin and member actions.

### Runtime gates still pending

The following cannot be certified from static source review alone:

- successful `npm ci` and `next build` on the deployment host
- Prisma generation and production MySQL migrations
- SMTP OTP and password-reset delivery
- live browser member/Admin end-to-end UAT
- HTTPS, DNS, restart, logs, backup and restore

## Current verdict

**Static source audit:** PASS after the fix above.  
**LC-008 overall:** IN PROGRESS.  
**Public launch:** NO-GO until the runtime gates are completed on Hostinger.
