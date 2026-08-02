# Payment Engine Test Checklist — v6.8.0

1. Run `npm install`, `npx prisma generate`, and create/apply a Prisma migration.
2. Configure Razorpay test keys and webhook secret; keep live mode disabled.
3. Confirm invalid, expired, exhausted and wrong-plan coupons are rejected.
4. Confirm payable amount is calculated only on the server.
5. Confirm order creation stores a pending relational transaction.
6. Complete a test checkout and confirm signature verification activates one membership.
7. Replay the verify request and webhook; confirm no duplicate membership/redemption is created.
8. Submit a forged signature; confirm HTTP 400/401 and no activation.
9. Confirm the previous active membership becomes `replaced` on a successful upgrade.
10. Confirm payment and membership records remain consistent after simulated activation failure.
