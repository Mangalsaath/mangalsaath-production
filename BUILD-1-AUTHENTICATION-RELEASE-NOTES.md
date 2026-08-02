# MangalSaath Build 1 — Authentication Release

## Implemented

- Registration now requires explicit Terms and Privacy consent in both the user interface and API.
- Production registration fails safely when the mobile OTP provider is not configured.
- Production password recovery fails safely when no recovery/SMS OTP provider is configured.
- Relational authentication responses now consistently expose `profileId`, including login and restored sessions.
- Session restoration is forced dynamic and protected from stale caching.
- Frontend API handling now reports non-JSON server and hosting errors instead of failing with a JSON parsing message.
- API requests use `no-store` for authentication-sensitive responses.

## Local testing

Set `NODE_ENV=development` and `ALLOW_DEMO_OTP=true` to display local OTPs without an external provider. Never use demo OTP mode in production.

## Production requirements

Before launch, configure `APP_SECRET`, `DATABASE_URL`, `SMS_PROVIDER_URL`, `SMS_PROVIDER_TOKEN`, and the email OTP provider variables used by Super Admin dual-factor authentication.
