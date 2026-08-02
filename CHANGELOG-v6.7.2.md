# MangalSaath v6.7.2 — Membership Admin

## Implemented

- Relational membership-plan create and update operations from the Admin Console.
- Plan validation for name, slug/ID, price, duration, display order and status.
- Configurable plan permissions and numeric limits:
  - profile views;
  - interests;
  - messages;
  - advanced search;
  - priority listing;
  - contact-detail access.
- Relational coupon create, update and delete/disable operations.
- Coupon validation for type, value, date range, global usage limit and per-user limit.
- Plan-specific coupon applicability.
- Coupons with redemption history are disabled instead of destructively deleted.
- Duplicate plan slugs and coupon codes are rejected.
- Every plan and coupon change is written to the relational Admin audit log.
- Admin UI now exposes plan features, display order, coupon dates and applicable plans.

## Not included

- Member payment checkout and automatic Razorpay activation remain on the next launch-critical milestone.
- Homepage CMS editing remains read-only in relational mode.

## Rollback

Set `ADMIN_STORAGE_MODE=legacy` to return the Admin settings route to legacy storage while investigating a relational deployment issue.
