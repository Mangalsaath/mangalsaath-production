# Testing Guide — v2.6.0

## Requirements
- Node.js 20.9 or newer
- npm 10 or newer

## Clean installation
```bash
npm install
npm run check
```

## Development CSP verification
```bash
npm run dev
```
Open `http://localhost:3000`. The console should no longer report that `eval()` is blocked. Development response headers may contain `unsafe-eval`; this is intentional for local debugging only.

## Production verification
```bash
npm run build
npm run start
```
The production Content-Security-Policy must not contain `unsafe-eval`. Confirm homepage, registration, OTP, profile editing, membership, PREMIER coupon, messaging and administrator access.
