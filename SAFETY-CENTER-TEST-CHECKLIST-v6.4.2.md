# Safety Center Test Checklist — v6.4.2

1. Log in as Member A and open Member B’s profile.
2. Submit a report with fewer than 10 characters; confirm validation fails.
3. Submit a valid report; confirm success and administrator report visibility.
4. Submit a second open report for the same member; confirm HTTP 409 behavior.
5. Block Member B; confirm B disappears from A’s search and profile detail becomes unavailable.
6. Confirm A and B cannot send interests or messages to each other.
7. Confirm existing pending/accepted interests become `Blocked`.
8. Confirm blocked conversations disappear from both members’ message lists.
9. As Super Admin, resolve or dismiss the report with a required note.
10. Use DELETE `/api/safety?profileId=<id>` to unblock and confirm discovery is restored.
11. Run `npm run check`, `npx prisma generate`, and `npm run build`.
