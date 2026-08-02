# MangalSaath v6.6.1 — Relational Interests & Messaging Cutover

## Implemented
- Interests now read and write through `InterestRecord` when `COMMUNICATION_STORAGE_MODE=relational`.
- Messages now read and write through `MessageRecord`.
- Accepted-interest enforcement, duplicate prevention, blocking checks, unread counts and read receipts run against relational data.
- Profile enrichment for conversations comes from relational member profiles.
- Existing notifications, activities and membership quota accounting remain in the compatibility store during this staged cutover.
- Emergency rollback: set `COMMUNICATION_STORAGE_MODE=legacy`.
- Added `npm run db:communication:verify`.

## Deployment order
1. `npm install`
2. `npm run db:generate`
3. `npm run db:push`
4. `npm run db:relational:migrate`
5. `npm run db:communication:verify`
6. `npm run build`
