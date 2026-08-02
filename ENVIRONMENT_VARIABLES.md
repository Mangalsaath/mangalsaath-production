# MangalSaath v1.5.1 Environment Variables

Sprint 5.1 keeps only technical, secret, and deployment-specific values in the environment. Business settings—including support email, UPI ID, QR image, payment instructions, SEO, plans and coupons—are read from the Admin Console database.

## Permanent production variables

- `NODE_ENV`, `NEXT_PUBLIC_SITE_URL`
- `DATABASE_URL`, `JSON_DATABASE_PATH`, `FORCE_JSON_IMPORT`
- `APP_SECRET`, `ALLOW_DEMO_OTP`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `DEFAULT_FROM_EMAIL`, `MAIL_FROM_NAME`, `MAIL_REPLY_TO`
- `AUTH_STORAGE_MODE`, `PROFILE_STORAGE_MODE`, `COMMUNICATION_STORAGE_MODE`, `ADMIN_STORAGE_MODE`
- `FEATURE_EMAIL_OTP`, `FEATURE_MOBILE_OTP`, `FEATURE_MANUAL_MOBILE_VERIFICATION`
- `PAYMENT_ENGINE_ENABLED`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`

## First-install bootstrap variables

`ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `ADMIN_MOBILE`, `ADMIN_PASSWORD`, `ADMIN_SECURITY_QUESTION`, `ADMIN_SECURITY_ANSWER`, and `ADMIN_RESET_PASSWORD` are required only to create or deliberately reset the first Super Admin. Remove the password and answer from Hostinger after successful initialization.

## Removed from the environment

- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `NEXT_PUBLIC_UPI_ID`
- `NEXT_PUBLIC_UPI_QR_PATH`

These values now come from `BusinessSetting` through `lib/settings-service.js`, with a five-minute runtime cache and immediate invalidation after Admin Console changes.
