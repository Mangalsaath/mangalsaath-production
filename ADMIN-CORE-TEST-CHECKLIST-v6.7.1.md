# Admin Core Test Checklist — v6.7.1

1. Run `npm install`, `npm run db:generate`, `npm run db:push`, and `npm run db:admin:migrate` against a database copy.
2. Run `npm run db:admin:verify` and `npm run db:admin-core:verify`.
3. Confirm Admin login requires password + mobile OTP + email OTP.
4. Confirm dashboard totals match database counts.
5. Approve, reject and request more information for a test profile.
6. Suspend a test member and confirm all sessions are revoked; reactivate the member.
7. Resolve and dismiss test reports; confirm mandatory notes and audit entries.
8. Approve and reject a test primary photo; confirm moderation event creation.
9. Change business name/contact settings and confirm persistence after restart.
10. Confirm moderator/finance/content roles cannot access unauthorized actions.
11. Set `ADMIN_STORAGE_MODE=legacy` and confirm emergency rollback works.
12. Run `npm run check` and `npm run build` before release approval.
