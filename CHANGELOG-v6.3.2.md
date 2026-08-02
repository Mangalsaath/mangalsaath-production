# MangalSaath v6.3.2 — Authentication Hardening

## Implemented

- Added persistent failed-login tracking and a 15-minute account lock after five failed attempts.
- Added login success/failure audit entries and last-login timestamps.
- Added secure session tokens stored as SHA-256 hashes rather than reusable plaintext tokens.
- Added session metadata, expiry rules, maximum active-session retention, logout API, and logout-from-all-devices API support.
- Preserved compatibility with legacy v6.3.1 sessions during upgrade.
- Added HMAC-protected OTP hashing using `APP_SECRET` and timing-safe OTP verification.
- Added OTP resend cooldown and maximum verification attempts.
- Disabled demo OTP disclosure by default; it now requires both non-production mode and `ALLOW_DEMO_OTP=true`.
- Added provider request timeouts for SMS and password-reset delivery.
- Prevented password-reset account enumeration by returning a generic response for unknown accounts.
- Applied the full strong-password policy to password resets.
- Cleared account lock state and revoked all sessions after password reset.
- Added Indian mobile-number validation and Terms/Privacy acceptance timestamp to new registrations.
- Added `Cache-Control: no-store` to sensitive authentication responses.
- Updated frontend logout to revoke the server-side session before deleting the local token.

## Remaining launch blockers

- Real SMS and email provider credentials must be configured and tested.
- Super Admin dual-factor login (mobile OTP + email OTP) remains a separate implementation sprint.
- The in-memory request rate limiter should be replaced by a shared persistent limiter when the app runs on multiple server instances.
- Authentication data remains within the transitional `ApplicationState` JSON payload until relational normalization.
