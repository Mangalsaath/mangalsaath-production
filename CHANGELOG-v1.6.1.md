# MangalSaath v1.6.1 — LC-008 Audit 06

- Removed the unsafe implicit `NODE_ENV=production` fallback.
- Production start/deployment now require explicitly configured `NODE_ENV=production`.
- Stopped requiring the one-time Super Admin bootstrap password on every application restart.
- Retained strong-password validation whenever `ADMIN_PASSWORD` is intentionally supplied.
- Added `verify:lc008:audit06` and the final static certification report.
