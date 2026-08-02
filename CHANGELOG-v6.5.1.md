# MangalSaath v6.5.1 — Relational Authentication Cutover

## Implemented
- Relational `users` table is now the authentication source of truth.
- Relational `sessions` table now stores hashed bearer sessions.
- Login, registration uniqueness checks, password reset, session validation, logout and Super Admin session creation use relational storage.
- New registrations create `User` and `MemberProfile` atomically.
- Compatibility mirroring remains for modules not yet cut over from `ApplicationState`.
- Password reset revokes every relational session for the member.
- Maximum five active sessions per user, with older sessions removed.
- Session activity is touched at most once every five minutes.
- Immediate rollback is available with `AUTH_STORAGE_MODE=legacy`.
- Added `npm run db:auth:verify` readiness command.

## Required deployment sequence
1. Back up the database.
2. Run `npm run db:generate` and `npm run db:push`.
3. Run `npm run db:relational:migrate`.
4. Run `npm run db:relational:verify` and `npm run db:auth:verify`.
5. Set `AUTH_STORAGE_MODE=relational`.
6. Restart the application and test member plus Super Admin login.
