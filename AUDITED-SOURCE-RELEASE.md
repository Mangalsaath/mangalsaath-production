# MangalSaath v1.6.2 Audited Source Release

## Corrected runtime paths

- Admin Console settings, public configuration, registration controls, Super Admin identity/OTP contacts, session duration, and profile maintenance checks now read the same relational `BusinessSetting` records.
- A failure in messages, notifications, membership, interests, profile, or Admin Console data no longer destroys an otherwise valid login session.
- Members created before the relational-profile cutover receive a safe create-only relational profile repair when opening or saving their profile.
- Member identity-verification requests now use relational member profiles and relational audit logs when relational storage is enabled.
- Super Admin security answer remains hidden from ordinary members and only appears after valid Super Admin credentials.
- Manual member mobile verification remains available in Admin Console.

## Verification completed

- `npm ci`
- `npm run check`
- `npm run verify:launch`
- LC-006/007 and all LC-008 bundled checks
- `npm run verify:final-launch`
- `npm run build` with Next.js 16.2.10: all 29 routes compiled successfully

## Deployment requirements

1. Keep the existing Hostinger environment variables; never upload a real `.env` file to GitHub.
2. Confirm `DATABASE_URL`, `APP_SECRET`, SMTP variables, `ADMIN_SECURITY_ANSWER`, and Super Admin contact variables are present in Hostinger.
3. Deploy this source from the repository root.
4. After deployment, run the relational migration/verification commands documented in the production guide before testing legacy member profiles.
5. Test Super Admin login, one existing member, one new member, profile edit/save, verification request, manual mobile verification, and password-recovery email.

## Dependency audit note

The locked dependency tree currently reports seven high-severity advisories and zero critical advisories. Do not run `npm audit fix --force`; dependency upgrades must be tested as a separate controlled release.
