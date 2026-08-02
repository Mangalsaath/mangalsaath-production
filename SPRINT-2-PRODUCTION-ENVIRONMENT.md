# Sprint 2 — Production Environment Baseline

## Status

Implementation completed. Build verification remains dependent on installing project dependencies and running the production build.

## Single source of configuration

Application runtime configuration is centralized in `lib/config.js`. Production scripts use the matching `scripts/env-config.mjs` module because Node executes `.mjs` scripts directly while Next.js compiles application modules.

## Required production secrets

- `DATABASE_URL`
- `APP_SECRET`
- `ADMIN_PASSWORD`
- `ADMIN_SECURITY_ANSWER`
- `SMTP_PASS`

Never commit real values for these variables.

## Launch authentication flags

- `FEATURE_EMAIL_OTP=true`
- `FEATURE_MOBILE_OTP=false`
- `FEATURE_MANUAL_MOBILE_VERIFICATION=true`
- `ALLOW_DEMO_OTP=false`

## Hostinger deployment sequence

1. Rotate any database or mailbox password previously shared outside the server.
2. Replace all `REPLACE_WITH_...` placeholders in `HOSTINGER.env`.
3. Add the variables in Hostinger's Node.js environment settings.
4. Run `npm install`.
5. Run `npm run verify:production-env` with production variables loaded.
6. Run `npm run build`.
7. Start with `npm start`.
8. Confirm member email OTP and Super Admin email OTP delivery.

## Fail-fast startup

`npm start` now runs production environment verification before database initialization and before starting Next.js. Missing or unsafe settings stop startup with a clear error.
