# Changelog v1.5.6

## LC-006 + LC-007 hardening

- Hardened relational manual-UPI submission and Admin payment review.
- Added unique UTR protection and payment proof validation.
- Added atomic payment review and membership activation safeguards.
- Preserved unused membership time during same-plan renewal.
- Added Razorpay amount/currency webhook checks.
- Added action-specific Admin authorization boundaries.
- Added permission-based filtering of Admin dashboard and settings datasets.
- Restricted Super Admin recovery/authentication settings to super_admin.
- Removed production environment files from the release archive.
- Added LC-006/LC-007 static verification script.
