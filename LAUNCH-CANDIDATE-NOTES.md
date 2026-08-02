# MangalSaath v1.0 Launch Candidate

This release is intentionally limited to the first public-launch scope. No non-essential features were added.

## Included launch flows

- Mobile OTP registration, login, logout and password recovery
- Member profile creation and editing
- Up to 10 profile photos with primary-photo selection and validation
- Member search, profile viewing and shortlist
- Interests, accepted-connection messaging and notifications
- Membership plans, coupons, manual UPI proof and optional Razorpay checkout
- Administrator member, verification, payment, plan, coupon, homepage and business-setting controls
- Super Admin mobile OTP plus email OTP

## Launch-candidate fixes in this package

- Added step-level profile validation before users move through the profile wizard.
- Added strict date-of-birth validation on client and server.
- Added About Me length validation (40–2,000 characters) on client and server.
- Made photo processing safer with functional state updates, upload progress and read-error handling.
- Prevented duplicate file-input submissions and clarified the 10-photo limit.
- Added profile save progress protection to prevent duplicate saves.
- Added a launch-readiness verification command: `npm run verify:launch`.
- Updated application package version to `1.0.0-launch-candidate`.

## Local test setup

Copy `.env.example` to `.env`. For local OTP testing only, set:

```env
NODE_ENV=development
ALLOW_DEMO_OTP=true
```

Then run:

```bash
npm install
npx prisma generate
npm run dev
```

For production, keep `ALLOW_DEMO_OTP=false`, replace every placeholder secret, configure MySQL and OTP providers, and enable Razorpay only after entering all Razorpay credentials.

## Release hardening update

- Added `npm run verify:production-env` to stop deployment when production secrets, OTP providers, database URL, HTTPS URL, or enabled Razorpay credentials are missing.
- Updated Content Security Policy so Razorpay Checkout can load only when `PAYMENT_ENGINE_ENABLED=true`.
- Kept development WebSocket/HTTP allowances out of production CSP.
- Allowed Razorpay checkout pop-ups while retaining cross-origin isolation protections.
- Updated `/api/health` to report the launch-candidate version and disable caching.

Run before production deployment:

```bash
npm run verify:production-env
npm run verify:launch
npm run build
```

## Accepted Members enhancement
- Added a dedicated Accepted Members tab inside My Matches / Interest Centre.
- Accepted connections remain visible in Sent and Received history.
- Added name search and the approved lightweight filters: All, Verified, Premium, Recently Accepted and Recently Active.
- Added user-friendly accepted-member cards with photo, name, age, city, occupation, verification badge, relative acceptance time, View Profile and Chat actions.
- Added an Accepted Members entry in the My Matches menu and dashboard counter.
- Reused the existing accepted Interest records; no new database table was introduced.
