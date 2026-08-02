# Relational Authentication Test Checklist — v6.5.1

- [ ] Relational migration and both verification commands pass.
- [ ] Existing member can log in by email.
- [ ] Existing member can log in by Indian mobile number.
- [ ] Five incorrect passwords trigger a temporary lock.
- [ ] Successful login creates a row in `sessions`, not a plaintext token.
- [ ] `/api/session` returns the authenticated user.
- [ ] Single-device logout removes only the current session.
- [ ] All-device logout removes all user sessions.
- [ ] Password reset changes the relational password hash and revokes sessions.
- [ ] New registration creates matching rows in `users` and `member_profiles`.
- [ ] Duplicate email and duplicate mobile registration are rejected.
- [ ] Super Admin password login still requires both mobile and email OTP.
- [ ] Admin session has `adminDualOtpVerified=true`.
- [ ] Setting `AUTH_STORAGE_MODE=legacy` restores the previous authentication path.
