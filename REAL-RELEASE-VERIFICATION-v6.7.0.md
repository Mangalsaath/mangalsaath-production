# Real Release Verification — v6.7.0

## Verified in the build environment
- New JavaScript modules pass `node --check`.
- Migration and verification scripts pass `node --check`.
- Existing project structure and credential-safety check passes.
- Package metadata updated to 6.7.0.
- Release archive integrity verified after packaging.

## Requires local/database verification
- Dependency installation timed out in the build environment.
- Prisma schema validation, client generation, database push, migration, verification, and Next.js production build must be run locally using the included checklist.
