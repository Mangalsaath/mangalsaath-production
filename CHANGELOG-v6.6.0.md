# MangalSaath v6.6.0 — Search & Matching Foundation

## Launch-critical changes

- Added server-side compatibility scoring based on a member's saved partner preferences.
- Added explainable match reasons to discovery results.
- Best Match sorting now uses the calculated compatibility score rather than the profile-completion score.
- Excluded the signed-in member's own profile from discovery.
- Fixed combined verified + keyword search: both filters now apply together.
- Added relational search filters for state, caste, education, profession, gender and height range.
- Added strict validation for age and height ranges.
- Added Newest and Recently Updated server-side sorting support.
- Preserved active-member, approved-photo, completion and block safety rules.
- Added search facets for cities and religions to support stable filter lists.
- Added legacy-storage compatibility scoring for emergency rollback mode.

## Compatibility score weights

- Age preference: 25
- Religion: 20
- Caste: 15
- Location: 10
- Education: 10
- Profession: 10
- Marital status: 5
- Trust verification: 5

The calculation ignores unset/Open preferences rather than unfairly marking them as mismatches.
