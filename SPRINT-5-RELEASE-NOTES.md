# MangalSaath v1.5.0 RC1 — Sprint 5 Release Notes

## Added

- Public no-cache database health endpoint at `/api/health`.
- Controlled Hostinger deployment and rollback guide.
- Final launch gate checklist.
- `verify:release` package command for structural and production-environment validation.

## Baseline retained

- Member email OTP, password and collected mobile number.
- Manual mobile verification by an administrator.
- Super Admin password, security answer and email OTP.
- Independent mobile verification and member approval actions.
- Sprint 3 verification center and Sprint 4 security hardening.

## Verification status

- Static project check: required.
- JavaScript syntax check: required.
- Full dependency installation and Next.js production build: must be completed on a machine with npm registry access.
- Real SMTP, MySQL, browser and Hostinger deployment tests: production verification required.
