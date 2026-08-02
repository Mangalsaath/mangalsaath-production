# MangalSaath v6.4.1 — Data Safety Hotfix

## Launch-critical fixes

- Added optimistic concurrency control to the transitional single-row MySQL state store. Concurrent stale writes now fail instead of silently overwriting newer data.
- Added separate public and owner/admin profile serializers.
- Public search responses no longer expose full photo collections, moderation notes, partner preferences, internal completion gaps, or detailed trust checks.
- Public profile details are hidden unless the profile is publishable.
- Search now includes only active members with at least 80% completion and an administrator-approved primary photo.
- Corrected Trust Score so only an explicitly approved photo receives approved-photo credit.
- Enforced maintenance mode and registration enable/disable settings on the server.
- Strengthened profile update validation, photo validation, cache controls, and conflict responses.

## Important limitation

The application still uses a transitional JSON-in-MySQL store and base64 image storage. The next data-layer release should normalize high-write entities and move media to object storage.
