# Changelog — v6.1.0-LC1

## Integrated
- Stage 1–9 audit baseline.
- Manual UPI payment flow using QR code and UPI ID.
- UTR/reference validation and duplicate protection.
- Optional payment screenshot upload with type and size validation.
- Pending payment state; no automatic premium activation.
- Administrator payment approval/rejection workflow.
- Membership activation only after approval.
- Payment notifications and activity trail.
- Production environment template and launch documentation.

## Security and reliability
- Server-side authorization for admin payment review.
- Rate limiting for payment submissions.
- Payment proof validation.
- Idempotent review protection.
- Existing password hashing, session expiry, OTP controls, route authorization, atomic database writes, and input cleaning retained.

## Runtime correction
- Fixed `siteConfig` initialization order in `app/page.js` to prevent homepage HTTP 500 errors.
