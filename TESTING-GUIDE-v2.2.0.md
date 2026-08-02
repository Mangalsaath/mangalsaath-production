# Mangalsaath v2.2.0 Testing Guide

1. Run `npm install` and `npm run dev`.
2. As a guest, confirm the header contains Home, Search Matches, Membership, Login and Create Free Profile.
3. Confirm Contact and About are absent from the top menu and available in the footer.
4. Open Search Matches and Membership dropdowns; verify every option opens the intended view.
5. Log in as a normal member. Confirm My Matches, messages, alerts and profile controls appear, but Admin Console does not.
6. Log in as an administrator. Confirm Admin Console appears only inside the My Profile dropdown.
7. Attempt `/api/admin` without an admin bearer token and confirm HTTP 403.
8. Test mobile width and confirm horizontal primary navigation and full-width dropdown panel remain usable.
9. Confirm PREMIER still applies 20% discount on Premium and Platinum plans.
10. Run `npm run build` before deployment.
