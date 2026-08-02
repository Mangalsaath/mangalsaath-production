# Administrator Guide — v3.0.0

- Administrator login uses the normal login form with the administrator email and password.
- The Admin Console is displayed only when the authenticated account has `role: admin`.
- Direct admin API access by guests or members returns HTTP 403.
- The admin can review users, registrations, verification requests, interests, messages, membership/revenue summaries and verification audit history.
- Public registration cannot assign an administrator role.
- Use `npm run create-admin` to create or rotate the administrator credentials securely.
