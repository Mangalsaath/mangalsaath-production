# MangalSaath v6.4.1 — Data Safety Test Checklist

## Public profile privacy
- Search response contains only summary fields and one primary photo.
- Search does not return partner preferences, moderation notes, full photo arrays, user contact information, or internal trust checks.
- Direct profile URL returns 404 for incomplete or photo-unapproved profiles when viewed by another member.
- Profile owner and Super Admin can still view the complete profile.

## Publishing rules
- Profile below 80% completion is absent from search.
- Profile with pending/rejected/no photo is absent from search.
- Active profile at 80%+ with approved photo appears in search.
- Suspended/inactive users never appear.

## Settings enforcement
- Disable registration in Admin Settings and confirm OTP registration is blocked with HTTP 403.
- Enable maintenance mode and confirm member profile APIs return HTTP 503.
- Confirm Super Admin can still inspect profiles during maintenance.

## Data conflict safety
- Send two profile updates based on the same state version at nearly the same time.
- Confirm one succeeds and the stale request receives HTTP 409 rather than overwriting the first change.

## Trust Score
- Pending photo gives no approved-photo points.
- Rejected photo gives no approved-photo points.
- Approved photo gives approved-photo points.

## Regression
- Registration works when enabled and maintenance mode is off.
- Owner can update profile and upload up to 10 valid JPEG/PNG/WebP images.
- Search filters, sorting and pagination still work.
