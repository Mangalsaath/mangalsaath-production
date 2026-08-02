# Public Launch Checklist

## Mandatory before deployment
- [ ] Replace `public/payment-qr.png` with the real Mangalsaath UPI QR image using the same filename.
- [ ] Create a strong administrator password using `npm run create-admin`.
- [ ] Confirm no demo OTP is exposed in production.
- [ ] Confirm writable persistent storage for `data/db.json`, or migrate to a managed database.
- [ ] Back up `data/db.json` before and after deployment.
- [ ] Test registration, login, OTP, profile creation, search, interests, messages, payment submission, admin approval, and membership activation.
- [ ] Test mobile, tablet, and desktop layouts.
- [ ] Confirm HTTPS and domain configuration.

## Manual UPI verification rule
Never approve a payment from a screenshot alone. Match the UTR, amount, payer details, and date against the bank or UPI statement before approval.
