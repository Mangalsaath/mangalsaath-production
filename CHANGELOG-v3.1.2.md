# Mangalsaath v3.1.2

## Administrator security upgrade

- Added an administrator-only password change panel.
- Requires the current password before accepting a new password.
- Enforces a minimum of 12 characters with uppercase, lowercase, number and special character.
- Rate-limits password attempts.
- Invalidates other active administrator sessions after a password change.
- Added a reusable command-line administrator reset utility through `npm run create-admin`.
- Seeded a documented temporary administrator password for first login. Change it immediately after login.
