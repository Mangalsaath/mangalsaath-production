# Mangalsaath v3.0.0 Production Launch Guide

## 1. Create the support mailbox
`contact@mangalsaath.com` must be created with the email provider attached to the domain (Namecheap Private Email, Zoho Mail, Google Workspace, or another provider). The website displays this address and uses SMTP settings when outbound email is connected; the website cannot create the mailbox itself.

Configure DNS records supplied by the provider: MX, SPF, DKIM and preferably DMARC.

## 2. Environment configuration
Copy `.env.example` to `.env.local` for local work and set production secrets in the hosting dashboard. Never commit real passwords or API secrets.

Required before public registration:
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `SMS_PROVIDER_URL` and `SMS_PROVIDER_TOKEN`
- Production database/storage configuration
- Payment gateway keys before accepting payment
- SMTP credentials for support and transactional email
- Monitoring and backups

## 3. First administrator
Run once on the deployment environment:

```bash
ADMIN_EMAIL=admin@mangalsaath.com ADMIN_PASSWORD='use-a-strong-secret' npm run create-admin
```

On Windows PowerShell:

```powershell
$env:ADMIN_EMAIL='admin@mangalsaath.com'
$env:ADMIN_PASSWORD='use-a-strong-secret'
npm run create-admin
```

Remove the environment password after the administrator is created. Public registration always creates the `member` role; administrator access is checked server-side.

## 4. Clean launch data
The distribution contains no sample members, profiles, messages, interests, notifications, subscriptions, transactions or coupon-use history. Only plan definitions and the separately provisioned administrator remain.

## 5. Deployment gate
Run:

```bash
npm ci
npm run check
npm run build
npm start
```

Verify registration OTP, email/mobile login, profile completion, search, interest acceptance, messages, membership/coupon, admin verification, HTTPS, backups and monitoring before advertising the platform.

## Important scaling note
The included JSON datastore is suitable for local validation and a controlled pilot only. Connect a managed production database and private object storage before a public/high-volume launch.
