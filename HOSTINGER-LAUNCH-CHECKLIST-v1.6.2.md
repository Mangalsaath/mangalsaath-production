# Hostinger Launch Checklist — MangalSaath v1.6.2

Complete these checks in order. Do not open public registration until all critical items pass.

## 1. Preserve rollback copy

- Keep this ZIP unchanged.
- Back up the current Hostinger application and MySQL database, if any.

## 2. Environment

- Copy values from `.env.example` into Hostinger environment variables; do not upload a real `.env` into Git.
- Set `NODE_ENV=production` explicitly.
- Confirm `NEXT_PUBLIC_SITE_URL=https://mangalsaath.com`.
- Confirm the production MySQL `DATABASE_URL`.
- Set a unique `APP_SECRET` of at least 32 random characters.
- Confirm Hostinger SMTP credentials.
- Keep `ALLOW_DEMO_OTP=false`.
- Keep mobile OTP disabled and manual mobile verification enabled.
- Keep `PAYMENT_ENGINE_ENABLED=false` until Razorpay credentials and webhook are ready.

## 3. Install, verify and build

```bash
npm ci
npm run verify:final-launch
npm run build
npm run deploy:production
npm start
```

## 4. Runtime checks

- `/api/health` returns a healthy response.
- Homepage and static pages load over HTTPS.
- No secrets or stack traces appear in browser responses.
- Restart the Node application once and confirm it recovers normally.

## 5. Critical browser smoke test

- Register with email OTP.
- Log in and log out.
- Reset password.
- Create and edit a member profile.
- Upload and display photos.
- Search and open member profiles.
- Send, accept, reject and withdraw an interest.
- Verify messaging access rules.
- Verify membership/entitlement display.
- Verify admin login with password, security answer and email OTP.
- Verify member approval, manual mobile verification, settings and payment administration.

## 6. Data and recovery

- Run a relational database backup.
- Confirm the backup manifest and table counts.
- Perform a restore drill on a non-production database before launch or at the earliest controlled maintenance window.

## Launch decision

- All critical checks pass: **GO FOR PUBLIC LAUNCH**.
- Build, database, OTP, login, profile, admin or security check fails: **NO-GO; fix only the failing blocker and retest**.
