# MangalSaath v1.5.0 RC1 — Hostinger Deployment Guide

## 1. Before deployment

1. Put the website in maintenance mode or choose a low-traffic window.
2. Download a complete backup of the current website files.
3. Export the production MySQL database from Hostinger/phpMyAdmin.
4. Rotate any database, SMTP or administrator password that has been shared outside Hostinger.
5. Fill the production environment variables. Never upload a real `.env.production` to a public repository.

## 2. Install and build

```bash
npm ci
npx prisma generate
npm run build
```

The deployment must stop if any command fails.

## 3. Database update

Back up the database first, then apply the included Prisma schema using the deployment method supported by the Hostinger plan:

```bash
npx prisma db push
```

For a controlled migration environment, review and apply `prisma/migrations/20260727_sprint3_admin_verification/migration.sql` instead of blindly executing it.

## 4. Start

```bash
npm start
```

The production startup script validates environment values and initializes required production data before starting Next.js.

## 5. Smoke checks

1. Open `/api/health`; expect HTTP 200 and `database: reachable`.
2. Register a test member and complete email OTP.
3. Log in as Super Admin using password, security answer and email OTP.
4. Manually verify the test mobile number, then approve the member.
5. Test profile creation/editing, photo upload, search, interest and messaging.
6. Test business settings, membership plans, coupons, homepage offers and UPI QR upload.
7. Confirm HTTPS and all legal/footer links.

## 6. Rollback

1. Stop the new application.
2. Restore the previous website files.
3. Restore the pre-deployment MySQL export if the schema/data update caused a problem.
4. Restore the previous environment configuration.
5. Start the previous release and repeat the health and login smoke checks.
