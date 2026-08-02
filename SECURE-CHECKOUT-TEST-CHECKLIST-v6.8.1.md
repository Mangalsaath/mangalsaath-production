# Secure Checkout Test Checklist v6.8.1
1. Enable payment engine and use Razorpay test keys.
2. Log in, select a paid plan, apply a valid/invalid coupon.
3. Confirm quoted price matches Razorpay Checkout amount.
4. Complete a test payment and confirm membership activates only after verification.
5. Dismiss checkout and confirm no membership change.
6. Trigger a failed payment and confirm a safe error is shown.
7. Confirm manual UPI submission remains pending until admin approval.
8. Call `/api/membership/entitlements` while logged in and confirm only active, unexpired plan permissions are returned.
