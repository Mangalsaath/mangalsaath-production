# MangalSaath v6.3.0 — MySQL Production Guide

## What changed
The verified v6.2.3 application state is now persisted in MySQL 8 through Prisma instead of being written to `data/db.json` at runtime. This Phase-1 migration deliberately preserves the existing API and user experience to minimise launch regression risk.

## Hosting requirements
- Node.js 20.9 or newer
- MySQL 8
- SSH/terminal access
- Ability to run `npm install`, `npm run build`, and `npm start`
- Persistent storage for `public/uploads` until object storage is introduced
- Free SSL and automated backups

## First deployment
1. Create a MySQL database and user.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Run `npm install`.
4. Run `npm run db:generate`.
5. Run `npm run db:push`.
6. To import an existing `data/db.json`, run `npm run db:migrate:json` once.
7. Run `npm run build` and then `npm start`.

## Backup
Run `npm run db:backup` before releases and before any forced import. Hosting-level daily MySQL backups should also remain enabled.

## Important launch limitation
For the economical first launch, use one Node.js application instance. The current compatibility data layer serializes writes inside that instance. Before horizontal scaling or high traffic, move high-volume collections (users, profiles, messages, interests, sessions and transactions) into dedicated relational Prisma models.
