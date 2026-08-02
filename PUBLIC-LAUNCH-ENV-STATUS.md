# Public Launch Environment Status

The production database, Super Admin identity/password, and Hostinger SMTP credentials are populated in `HOSTINGER.env` and `.env.production`.

The following two values still require a real SMS provider before public registration and Super Admin mobile OTP can work:

- `SMS_PROVIDER_URL`
- `SMS_PROVIDER_TOKEN`

Keep `ALLOW_DEMO_OTP=false` for public launch. Do not commit either production environment file to Git.
