# Mangalsaath v6.0.0 Launch Candidate

## Launch-critical fixes
- Condensed the home page from several long sections to a focused hero, trust summary, three-step journey and launch offer.
- Made membership plan information visible to visitors who are not logged in.
- Added clear account creation/login prompts for membership activation.
- Added forgot-password and OTP-based password recovery screens.
- Added a secure password reset API with rate limits, expiry, attempt limits, session invalidation and provider hooks.
- Reduced vertical spacing across general, legal, membership and form pages.
- Added automatic top-of-page navigation when changing views.

## Deployment note
Configure `PASSWORD_RESET_PROVIDER_URL` and `PASSWORD_RESET_PROVIDER_TOKEN` (or the existing SMS provider variables) before public password-recovery delivery. In local development, the OTP is shown on screen for testing.
