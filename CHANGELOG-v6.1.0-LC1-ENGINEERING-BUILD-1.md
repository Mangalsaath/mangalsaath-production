# Mangalsaath v6.1.0 LC1 — Engineering Build 1

## Implemented

### Owner Control Center
- Added Admin Console controls for business name, address, GSTIN, support email and mobile.
- Added payment settings for UPI ID, QR image path and payment instructions.
- Added Super Admin security contact fields and configurable OTP/session timing.
- Added editable footer copyright.

### Membership
- Membership plans are now database-backed and editable from the Admin Console.
- Admin can add or edit plan name, price, duration, status, description and badge.

### Coupons
- Multiple coupons are now supported.
- Coupons support percentage or fixed discounts.
- Coupons support activation status, validity dates, total usage limits, per-user limits and plan applicability.
- Coupon codes are validated server-side before payment submission.
- Duplicate or exhausted coupon use is rejected.

### Payments
- UPI settings now load from the centralized settings table.
- Manual payment instructions are configurable.
- UTR duplicate protection remains active.

### Business Identity
Default values:
- M/s Tradewave Enterprises
- Ghaziabad, Uttar Pradesh – 201009
- GSTIN: 09KKIPS7473B1ZJ
- contact@mangalsaath.com
- +91 7988663797

### Security Foundation
- Admin settings routes require authenticated administrator role.
- Changes are rate-limited and written to an admin audit trail.
- Public configuration API exposes only non-sensitive business settings.
- Admin navigation is visible only after an authenticated admin session.

## Verification

- `npm run check` passed.
- Production build could not be completed in the current runtime because the uploaded ZIP contained an incomplete `node_modules` directory and package installation was unavailable.
- Run `npm install`, `npm run check`, and `npm run build` after extraction.

## Next Engineering Build

- Super Admin password + mobile OTP + email OTP login enforcement
- Re-authentication for changing Super Admin email/mobile
- Admin session timeout and single-session enforcement
- Login alerts and detailed admin security audit logs
