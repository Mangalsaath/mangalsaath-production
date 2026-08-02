# MangalSaath v6.3.3 — Super Admin Dual OTP

## Implemented
- Password validation is followed by mandatory mobile OTP and email OTP for Super Admin.
- Both OTPs must be correct in the same challenge before an admin session is issued.
- OTPs are HMAC-hashed, expire based on the Admin setting, and allow at most five attempts.
- Admin sessions now carry a server-side dual-OTP verification flag; old/unverified admin sessions fail closed.
- Super Admin email and mobile are read from Admin Console settings with account fallback for bootstrap.
- SMS and email delivery use environment-configured HTTP providers.
- Production fails closed when either provider/contact is missing.
- Security and admin audit events are recorded.
- Added a dedicated dual-OTP screen to the website.
- Fixed the asynchronous Admin Settings authorization helper.

## Required production environment
- SMS_PROVIDER_URL / SMS_PROVIDER_TOKEN
- EMAIL_OTP_PROVIDER_URL / EMAIL_OTP_PROVIDER_TOKEN
- APP_SECRET
- Super Admin email and mobile in Admin Console settings

## Local testing
Set NODE_ENV=development and ALLOW_DEMO_OTP=true to display test OTPs. Never enable demo OTP in production.
