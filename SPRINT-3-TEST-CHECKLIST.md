# Sprint 3 Test Checklist

## Database

- [ ] Back up Hostinger MySQL.
- [ ] Apply Sprint 3 migration.
- [ ] Run `npx prisma generate`.
- [ ] Confirm existing verified users were backfilled correctly.

## Admin verification

- [ ] Log in with Super Admin password, security answer and email OTP.
- [ ] Open Admin Console.
- [ ] Confirm counters load.
- [ ] Search by name, email, mobile and member ID.
- [ ] Filter pending approvals and pending mobile checks.
- [ ] Mark a mobile number manually verified.
- [ ] Confirm method is `manual`, verifier and date are recorded.
- [ ] Approve a member separately.
- [ ] Reject a member with a reason.
- [ ] Suspend and reactivate a member.
- [ ] Add an internal note.
- [ ] Confirm each action appears in the timeline/audit log.

## Member visibility

- [ ] Confirm unapproved profiles are not exposed where approval is required.
- [ ] Confirm approving a profile does not silently verify mobile.
- [ ] Confirm suspended members are signed out.

## Regression

- [ ] Member email OTP registration.
- [ ] Member login by email/mobile and password.
- [ ] Profile editing and photo upload.
- [ ] Search, interests, accepted members and messaging.
- [ ] Membership and payment pages.
