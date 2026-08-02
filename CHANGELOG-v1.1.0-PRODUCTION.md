# MangalSaath v1.1.0 Production Edition

## Fixed
- Empty production MySQL database after first Hostinger deployment.
- Legacy `create-admin` command writing to `data/db.json` instead of MySQL.
- Missing relational Super Admin after deployment.
- Missing default relational membership plans and coupon records.

## Changed
- The build now runs Prisma generation, `prisma db push`, production seeding, then the Next.js build.
- Prisma CLI is a production dependency so it is available in cloud build environments.
- Super Admin creation is idempotent and reads secure Hostinger environment variables.
- Password resets require the explicit `ADMIN_RESET_PASSWORD=true` switch.

## Security
- No default production password or mobile number is used.
- Super Admin password must contain at least 12 characters.
- Production dual OTP remains mandatory and requires configured SMS and email providers.
