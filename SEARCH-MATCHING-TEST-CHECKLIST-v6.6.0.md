# Search & Matching Test Checklist — v6.6.0

## Required setup

1. `npm install`
2. `npm run db:generate`
3. `npm run db:push`
4. Complete relational data migration and verification.
5. `npm run build`

## Functional checks

- Sign in as a member with completed partner preferences.
- Confirm the member's own profile does not appear in discovery.
- Confirm only active, publishable profiles with approved photos appear.
- Search by name, city, religion, caste, education and profession.
- Apply Verified only together with a keyword and confirm both conditions apply.
- Test age range boundaries and invalid reversed range.
- Test Best Match, Recently Updated, Newest, Age Ascending and Age Descending.
- Confirm each result shows a match percentage and an explainable reason when available.
- Confirm blocked members remain hidden.
- Confirm pagination returns stable totals and no duplicate profiles.
- Switch `PROFILE_STORAGE_MODE=legacy` temporarily and verify emergency fallback search still works.

## Security and privacy checks

- Confirm public search responses do not include private preferences, moderation notes or complete photo collections.
- Confirm direct access to an unpublished or blocked profile returns 404.
- Confirm unauthenticated search does not disclose internal scoring checks.
