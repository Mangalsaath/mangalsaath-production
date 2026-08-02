# Membership Admin Test Checklist — v6.7.2

## Setup

1. Run `npm install`.
2. Run `npm run db:generate`.
3. Run `npm run db:push` against a non-production MySQL database first.
4. Run `npm run db:admin:migrate` and `npm run db:admin:verify`.
5. Set `ADMIN_STORAGE_MODE=relational`.

## Plan management

- Create a paid plan with a unique ID and name.
- Edit price, duration, badge, display order and status.
- Save numeric limits for profile views, interests and messages.
- Toggle advanced search, priority listing and contact access.
- Confirm duplicate slug/ID is rejected.
- Confirm invalid or negative price is rejected.
- Confirm the audit log records creation and updates.

## Coupon management

- Create percentage and fixed-value coupons.
- Verify percentage discounts cannot exceed 100.
- Verify end date must be later than start date.
- Restrict a coupon to one or more paid plans.
- Confirm duplicate coupon code is rejected.
- Edit status, limits and dates.
- Delete a coupon with no redemptions.
- Confirm a coupon with redemption history is disabled rather than deleted.
- Confirm the audit log records all coupon changes.

## Regression

- Business settings still save.
- Admin dual OTP remains required.
- Non-admin members cannot access the endpoint.
- Read-only Admin settings payload still returns plans and coupons in the legacy UI shape.
- Run `npm run check` and `npm run build`.
