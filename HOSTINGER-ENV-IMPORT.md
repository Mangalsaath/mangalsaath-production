# MangalSaath Public Launch — Hostinger Environment Import

Use `HOSTINGER.env` for Hostinger import.

Before importing, replace these five placeholder groups:

1. `DATABASE_URL` — copy the complete production MySQL URL from Hostinger.
2. `ADMIN_PASSWORD` — use a strong, unique password of at least 12 characters.
3. `SMTP_PASS` — password of `admin@mangalsaath.com`.
4. `SMS_PROVIDER_URL` — API endpoint supplied by the selected SMS OTP provider.
5. `SMS_PROVIDER_TOKEN` — API token supplied by the selected SMS OTP provider.

`APP_SECRET` has already been generated as a strong random value. Keep it private and do not change it after users begin signing in unless a planned secret rotation is being performed.

## Import

1. Open the Node.js application in Hostinger.
2. Open Environment Variables.
3. Choose Import `.env`.
4. Upload `HOSTINGER.env`.
5. Confirm that all variables were imported.
6. Redeploy or restart the application.

## Launch checks

Run `npm run verify:production-env` in the production environment. Then test:

- Member mobile OTP registration.
- Super Admin mobile OTP.
- Super Admin email OTP sent through Hostinger SMTP.
- Login and database persistence.

Never commit `.env.production` or `HOSTINGER.env` to GitHub.
