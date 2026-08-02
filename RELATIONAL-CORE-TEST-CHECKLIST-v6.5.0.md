# v6.5.0 Relational Core Test Checklist

- [ ] Database backup completes.
- [ ] `npm install` completes with Node 20.9+.
- [ ] `npm run db:generate` succeeds.
- [ ] `npm run db:push` creates all relational tables.
- [ ] `npm run db:relational:migrate` completes and records a successful migration run.
- [ ] Re-running the migration creates no duplicate users or profiles.
- [ ] `npm run db:relational:verify` returns `ok: true`.
- [ ] User/profile/session/interest/message/block/report counts match legacy state.
- [ ] Registration and login still work through the legacy runtime.
- [ ] Profile search, interests, messaging and safety flows remain unchanged.
- [ ] Admin dual OTP still works.
- [ ] `npm run check` passes.
- [ ] `npm run build` passes.
