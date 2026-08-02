# Mangalsaath v4.0.1 — Railway Deployment Fix

India-first matrimonial web application built with Next.js.

## What was fixed

- Fresh `package-lock.json` generated from the public npm registry.
- `.npmrc` explicitly points to `https://registry.npmjs.org/`.
- Production build verified with Next.js 16.2.10, React 19.2.7 and React DOM 19.2.7.
- Misleading old beta admin credentials removed from this README.

## Railway deployment

1. Upload all project files to the root of your private GitHub repository.
2. Keep both `.npmrc` and `package-lock.json` in the repository.
3. Railway should use the default commands. If manual commands are needed:
   - Build: `npm ci && npm run check && npm run build`
   - Start: `npm start`
4. Copy required values from `.env.example` into Railway Variables.
5. Create the first administrator using `npm run create-admin` inside the deployed environment.

## Local verification

```bash
npm ci
npm run check
npm run build
npm start
```

Open `http://localhost:3000`.

## Important production note

Before unrestricted public registration, configure a real SMS OTP provider, managed database, secure media storage, email delivery and payment gateway. The bundled JSON data store is intended only for a controlled pilot.
