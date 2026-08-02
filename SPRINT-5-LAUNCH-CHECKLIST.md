# MangalSaath v1.5.0 RC1 — Launch Checklist

## Release gate

- [ ] `npm ci` completed successfully
- [ ] `npx prisma generate` completed successfully
- [ ] `npm run build` completed successfully
- [ ] Production environment validation passed
- [ ] Production database backup downloaded and restore procedure understood
- [ ] Database update applied successfully
- [ ] `/api/health` returns HTTP 200

## Authentication

- [ ] Member registration email OTP delivered and accepted
- [ ] Member login, logout and password reset work
- [ ] Super Admin password works
- [ ] Super Admin security answer works
- [ ] Super Admin email OTP delivered and accepted
- [ ] Invalid/expired OTP is rejected

## Member and admin workflows

- [ ] Profile create/edit/photo upload works
- [ ] Search and profile visibility rules work
- [ ] Interest send/accept/reject/withdraw works
- [ ] Messaging restrictions and delivery work
- [ ] Manual mobile verification works independently of approval
- [ ] Approve/reject/suspend/reactivate works
- [ ] Internal admin notes and audit timeline work

## Business and production

- [ ] Business identity and support details are correct
- [ ] Membership plans, coupons and homepage offers are correct
- [ ] UPI details and QR image are correct
- [ ] Privacy, Terms, About and Contact pages are correct
- [ ] Domain and HTTPS are valid
- [ ] Error logs can be accessed
- [ ] Post-launch database backup is scheduled

## Go/No-Go

Public launch is **NO-GO** until every release-gate item and every authentication item above is checked.
