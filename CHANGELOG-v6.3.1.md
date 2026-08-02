# Changelog v6.3.1

## Security baseline

- Removed distributable plaintext administrator credentials.
- Removed file-based automatic administrator bootstrap.
- Administrator creation now requires explicit environment variables through `npm run create-admin`.
- Added an honest production-readiness audit and launch-blocker list.
- Updated package version to 6.3.1.

## Important

The MySQL implementation remains a compatibility foundation using a Prisma JSON application-state record. A normalized relational migration remains the next engineering sprint.
