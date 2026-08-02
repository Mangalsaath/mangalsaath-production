# Mangalsaath v6.1.0 LC1 Runtime Fix Report

## Corrected
- Fixed homepage runtime failure: `Cannot access 'siteConfig' before initialization`.
- `supportEmail` is now derived only after `siteConfig` state is initialized.

## Verification
- `npm run check`: passed.
- Full production build could not be executed in the packaging environment because the Next.js executable was unavailable in the extracted dependencies.

## Local verification commands
```bash
npm install
npm run check
npm run dev
```
Then open `http://localhost:3000`.
