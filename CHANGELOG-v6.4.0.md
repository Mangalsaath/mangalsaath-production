# Mangalsaath v6.4.0 — Member Experience Foundation

## Launch-critical improvements

- Added a four-step member profile wizard: Basic, Career & Location, Photos, and Partner Preferences.
- Added server-calculated weighted profile completion so the dashboard and API use one consistent value.
- Added a transparent Trust Score (0–100) based on profile quality, mobile verification, email verification, photo presence, and administrator review.
- Added Trust Score level and verification breakdown to the member dashboard.
- Added stricter profile validation:
  - About section requires at least 40 characters.
  - Preferred minimum age cannot exceed preferred maximum age.
  - Height remains restricted to 100–250 cm.
  - Members must be at least 18 years old.
- Added photo moderation state reset when a member adds or removes photos.
- Profile API responses now include `profileCompletion`, `profileMissing`, `trustScore`, `trustLevel`, and `trustChecks`.
- Updated application version to 6.4.0.

## Compatibility

- No Prisma schema migration is required.
- Existing profiles are enriched dynamically when read.
- Existing MySQL ApplicationState data remains compatible.
