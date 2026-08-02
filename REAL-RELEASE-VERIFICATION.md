# Mangalsaath v3.0.0 — Verified Release Record

This source package was inspected and rebuilt from the actual project files on 19 July 2026.

## Verified
- Clean `npm ci` installation completed.
- `npm run check` passed.
- `npm run build` passed with Next.js 16.2.10.
- `npm audit --omit=dev` reported zero known vulnerabilities.
- Production data contains one administrator account and no member/profile/message/interest/notification/transaction test data.
- Administrator password is stored as a salted scrypt hash, not plaintext.
- Public registration cannot assign the administrator role.
- Admin API access requires an authenticated `admin` role.
- Support email defaults to `contact@mangalsaath.com` and can be overridden through environment configuration.
- No AI-generated promotional couple image asset is included in the project.

## External launch services still required
- Create the `contact@mangalsaath.com` mailbox with the domain email provider.
- Configure SMTP, SMS OTP, managed database, private photo storage, payment gateway, HTTPS hosting, backups, and monitoring.
- Rotate the temporary administrator password immediately after first login or use `npm run create-admin` before deployment.
