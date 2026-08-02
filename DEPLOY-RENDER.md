# Mangalsaath — Render Deployment

## GitHub upload
Upload the complete project, but do not upload `node_modules`, `.next`, or any `.env` file.

## Render settings
- Runtime: Node
- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Health check: `/api/health`
- Node version: `20.19.0`

## Required environment variables
Copy the required values from `.env.example` into Render's Environment section. Never commit real passwords, API keys, or tokens.

## Important data warning
This release currently uses `data/db.json`. Render's normal filesystem is not suitable as a permanent production database because deployments or instance replacement can reset local files. Configure a managed database before accepting real customer registrations or payments.
