# MangalSaath v1.1.1 — Hostinger Deployment Guide

## What changed

The production build no longer connects to MySQL. Database schema creation and initial data setup happen safely when the application starts.

## Required first-deployment environment variables

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://mangalsaath.com
NEXT_PUBLIC_SUPPORT_EMAIL=contact@mangalsaath.com

DATABASE_URL=mysql://DB_USER:URL_ENCODED_PASSWORD@DB_HOST:3306/DB_NAME
APP_SECRET=replace-with-a-random-secret-of-at-least-32-characters

ADMIN_USERNAME=superadmin
ADMIN_FIRST_NAME=Super
ADMIN_LAST_NAME=Admin
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_MOBILE=10-digit-mobile-number
ADMIN_PASSWORD=temporary-strong-password-at-least-12-characters
ADMIN_RESET_PASSWORD=false

AUTH_STORAGE_MODE=relational
PROFILE_STORAGE_MODE=relational
COMMUNICATION_STORAGE_MODE=relational
ADMIN_STORAGE_MODE=relational
ALLOW_DEMO_OTP=false
```

The MySQL password inside `DATABASE_URL` must be URL encoded. Special characters such as `&`, `%`, `#`, `$`, `@`, `:` and `/` cannot be pasted into the URL unchanged.

## Hostinger commands

Use the normal project commands:

- Build command: `npm run build`
- Start command: `npm start`

The start command automatically performs the safe equivalent of:

```text
prisma db push
production seed
Super Admin bootstrap
next start
```

## First Super Admin login

Use:

- Username or email configured through `ADMIN_USERNAME` / `ADMIN_EMAIL`
- Temporary password configured through `ADMIN_PASSWORD`

The first successful Super Admin authentication requires mobile OTP and email OTP, then forces creation of a permanent password.

For production OTP delivery, configure:

```env
SMS_PROVIDER_URL=
SMS_PROVIDER_TOKEN=
```

## After first login

After confirming the permanent password works, the temporary `ADMIN_PASSWORD` may be removed from Hostinger. Existing Super Admin credentials remain stored as a secure password hash in MySQL.

Do not set `ADMIN_RESET_PASSWORD=true` during ordinary deployments.

## Deliberate Super Admin password reset

1. Set a new temporary `ADMIN_PASSWORD` of at least 12 characters.
2. Set `ADMIN_RESET_PASSWORD=true`.
3. Restart or redeploy once.
4. Set `ADMIN_RESET_PASSWORD=false` immediately.
5. Log in with dual OTP and create a new permanent password.

## Expected first startup logs

```text
[MangalSaath startup] Running safe database initialization...
[MangalSaath initialization] Creating or updating the MySQL schema...
[MangalSaath initialization] Seeding required production data...
Created Super Admin: ...
[MangalSaath initialization] Database initialization completed successfully.
[MangalSaath startup] Starting the production web server...
```

If database authentication fails, the build can still complete, but startup will stop with a clear database initialization error. Recheck the Hostinger database username, password, host, port and database name.
