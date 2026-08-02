# Deployment Guide — v6.1.0-LC1

1. Extract the ZIP.
2. Open the extracted project folder in VS Code.
3. Run `npm install`.
4. Copy `.env.example` to `.env.local` and enter the real support email and UPI ID.
5. Replace `public/payment-qr.png` with the real QR image.
6. Run `npm run check`.
7. Run `npm run build`.
8. Run `npm start` for a production-mode local test.
9. Deploy to a Node.js host with persistent writable storage.
10. Configure the same environment variables on the host.

Important: the current JSON database requires persistent disk storage. Serverless deployments without persistent writable storage are not suitable unless the database is migrated.
