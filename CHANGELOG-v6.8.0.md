# MangalSaath v6.8.0 — Payment & Membership Engine

## Implemented
- Server-side Razorpay order creation using amount calculated from relational plan data.
- Server-side coupon validation, plan applicability, usage limits and discount calculation.
- Mandatory checkout signature verification before activation.
- Signed webhook verification for `payment.captured` and `order.paid` recovery flows.
- Atomic membership activation, replacement of previous active membership and user plan update.
- Relational `UserMembership` lifecycle model and payment/coupon relations.
- Idempotent activation: an already-paid transaction is not activated twice.
- Feature flag and environment configuration; online payments remain disabled until credentials are configured.

## Operational note
Run Prisma migration/generation and configure Razorpay test credentials before enabling `PAYMENT_ENGINE_ENABLED=true`.
