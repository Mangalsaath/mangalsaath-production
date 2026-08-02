# Authentication Test Checklist — v6.3.2

1. Configure a development MySQL database and run `npm run db:generate` followed by `npm run db:push`.
2. Set `APP_SECRET` to at least 32 random characters.
3. For local OTP testing only, set `NODE_ENV=development` and `ALLOW_DEMO_OTP=true`.
4. Register with an invalid mobile number and confirm rejection.
5. Register with a weak password and confirm rejection.
6. Request an OTP twice within 60 seconds and confirm cooldown enforcement.
7. Enter an incorrect OTP five times and confirm challenge lockout.
8. Complete registration and confirm the account/profile/session are created.
9. Attempt five incorrect logins and confirm the account is temporarily locked.
10. Reset the password using OTP and confirm the lock is removed and existing sessions are revoked.
11. Log in successfully and confirm `/api/session` returns the safe user object.
12. Log out and confirm the same bearer token no longer accesses `/api/session`.
13. Change the administrator password and confirm only the current administrator session remains active.
14. Confirm production responses never contain `demoOtp`.
