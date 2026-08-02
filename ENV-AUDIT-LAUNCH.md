# Environment Audit — Launch Edition

The application source was audited for every `process.env` reference.

## Active launch services

- MySQL database: `DATABASE_URL`
- Application/session security: `APP_SECRET`
- Super Admin bootstrap: `ADMIN_*`
- Relational data modes: `*_STORAGE_MODE`
- Member and Admin mobile OTP: `SMS_PROVIDER_URL`, `SMS_PROVIDER_TOKEN`
- Super Admin email OTP: Hostinger SMTP variables
- Production safety: `ALLOW_DEMO_OTP=false`

## Email OTP change

The previous HTTP email OTP variables were removed from active code:

- `EMAIL_OTP_PROVIDER_URL`
- `EMAIL_OTP_PROVIDER_TOKEN`

Super Admin email OTP now uses the reusable `lib/email.js` SMTP service and the official `admin@mangalsaath.com` mailbox.

## Optional at launch

Razorpay, UPI display values, a dedicated password-reset provider and JSON import controls are retained as optional settings. Razorpay remains disabled.
