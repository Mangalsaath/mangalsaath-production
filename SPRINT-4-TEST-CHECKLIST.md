# Sprint 4 Controlled Test Checklist

## Local build
- [ ] Use Node 20.9+ and npm 10+
- [ ] Copy `.env.example` to a private local environment file
- [ ] Replace all `REPLACE_WITH_` placeholders
- [ ] Run `npm ci`
- [ ] Run `npx prisma generate`
- [ ] Run `npm run verify:production-env`
- [ ] Run `npm run build`

## Database staging
- [ ] Back up Hostinger MySQL
- [ ] Restore backup into a staging database
- [ ] Apply the included Prisma migration
- [ ] Run relational verification scripts
- [ ] Confirm existing users, profiles, interests and messages counts

## Authentication
- [ ] Member registration email OTP
- [ ] Wrong/expired OTP handling
- [ ] Member login/logout
- [ ] Forgot-password email OTP
- [ ] Super Admin wrong password lockout
- [ ] Super Admin wrong security answer
- [ ] Super Admin email OTP
- [ ] Session expiry and logout

## Admin Verification Center
- [ ] Pending member appears
- [ ] Manual mobile verification persists
- [ ] Approval does not auto-verify mobile
- [ ] Reject with reason
- [ ] Suspend signs member out
- [ ] Reactivate member
- [ ] Internal note and audit timeline
- [ ] Advanced search and filters

## Member journeys
- [ ] Create/edit profile
- [ ] Upload/delete up to 10 photos
- [ ] Search and view profile
- [ ] Send/accept/reject/withdraw interest
- [ ] Accepted Members section
- [ ] Send/read message
- [ ] Block/report workflow

## Business and payment settings
- [ ] Membership plan edits appear publicly
- [ ] Coupon edits sync correctly
- [ ] Homepage offers sync automatically
- [ ] UPI ID and QR upload/replace/delete
- [ ] Payment engine disabled state

## Production smoke test
- [ ] HTTPS and domain redirect
- [ ] `/api/health`
- [ ] Homepage and visitor counter
- [ ] Registration and email delivery
- [ ] Super Admin login
- [ ] Admin and member protected routes
- [ ] Mobile and desktop layouts
