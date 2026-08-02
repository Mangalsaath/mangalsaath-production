# Testing Guide — v2.4.0

1. Run `npm install` and `npm run dev`.
2. Open Create Free Profile.
3. Enter full name, a unique email, a unique 10-digit Indian mobile number and an 8+ character password.
4. Submit to request OTP. In local mode, the OTP is shown in the testing notice.
5. Enter a wrong OTP and confirm it is rejected.
6. Enter the displayed OTP and confirm the account is created and automatically logged in.
7. Confirm the welcome screen offers Complete My Profile and Skip for now.
8. Log out and log in once with email, then once with mobile number.
9. Confirm duplicate email and duplicate mobile registration attempts are blocked.
10. For production, configure `SMS_PROVIDER_URL` and `SMS_PROVIDER_TOKEN`; confirm the local testing OTP is no longer returned.
