# Changelog — v2.4.0

## Added
- Four-field quick registration: full name, email, mobile and password.
- Mandatory six-digit mobile OTP before account creation.
- Expiring OTP challenges with attempt limits and one-way OTP hashing.
- Automatic sign-in after successful OTP verification.
- Welcome/onboarding screen directing users to complete their matrimonial profile.
- Login using either registered email address or registered mobile number.
- Duplicate email and mobile-number prevention.
- SMS provider integration hook through environment variables.

## Changed
- Long profile form is no longer required before account creation.
- Newly registered profiles begin incomplete and are completed progressively from Edit Profile.
- Mobile verification is recorded at registration; email verification remains pending.

## Security
- OTP validity: 10 minutes.
- Maximum incorrect OTP attempts: 5.
- OTP values are stored as salted SHA-256 hashes.
- Public registration always creates a member role, never an administrator.
