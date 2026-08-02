# Mangalsaath v2.6.0 — Production Stability Update

## Fixed
- Resolved the React/Next.js development console error caused by a production-only CSP being applied during `npm run dev`.
- Development CSP now permits `unsafe-eval` and local WebSocket connections required by Next.js debugging and Fast Refresh.
- Production CSP remains strict and does not permit `unsafe-eval`.

## Stability
- Pinned Next.js, React, and React DOM to the exact tested versions instead of using `latest`.
- Added supported Node.js and npm engine requirements.
- Added a lightweight project/environment validation command: `npm run check`.
- Enabled response compression explicitly.

## Security
- Added `object-src 'none'`, worker and manifest directives to CSP.
- Added Cross-Origin-Resource-Policy.
- Added HSTS only in production, where HTTPS is expected.
- Expanded Permissions Policy to disable browser payment access unless deliberately enabled later.

## Compatibility
- Existing registration, OTP, profiles, trust verification, membership and PREMIER coupon functionality are unchanged.
