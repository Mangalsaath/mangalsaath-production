# Deployment Guide — Mangalsaath v2.0.0

1. Install Node.js LTS and run `npm ci`.
2. Copy `.env.example` to the production environment and set `NEXT_PUBLIC_SITE_URL` to the live HTTPS domain.
3. Keep `ENABLE_DEMO_LOGIN=false`.
4. Run `npm run build`; deployment must stop if the build fails.
5. Run `npm start` behind HTTPS and a reverse proxy/platform that preserves `x-forwarded-for`.
6. Verify `/api/health`, `/robots.txt` and `/sitemap.xml`.
7. Replace seed/demo credentials and local JSON data before public onboarding.
8. Configure managed database, object storage for photos, transactional email/OTP, monitoring and automated encrypted backups.
9. Integrate a live payment gateway only after server-side signature/webhook verification is implemented and tested.

## Rollback
Retain the prior versioned ZIP and production database backup. Roll back application and data together when schema changes are introduced.
