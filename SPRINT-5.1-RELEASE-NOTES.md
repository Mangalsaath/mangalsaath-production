# Sprint 5.1 Release Notes

- Added centralized typed public settings service backed by `BusinessSetting`.
- Added five-minute settings cache and immediate invalidation after Admin Console saves.
- Removed public support email, UPI ID and UPI QR environment dependencies.
- Membership payment configuration now reads Admin Console settings.
- Site metadata and organization schema now read Admin Console business/SEO settings.
- Rebuilt `.env.production`, `.env.example` and `HOSTINGER.env` for Hostinger.
- Version updated to `1.5.1`.

## Verification status

Static source checks and project checks are included. A real production build still requires valid database credentials, dependency installation and Hostinger SMTP credentials.
