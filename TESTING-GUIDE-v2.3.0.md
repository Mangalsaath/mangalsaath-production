# v2.3.0 Testing Guide

1. Log in as a normal member and open Dashboard.
2. Complete at least 80% of the profile.
3. Select an ID type, enter the last four digits, and submit verification.
4. Confirm status becomes Under Review.
5. Log in as administrator and open Admin Console.
6. Confirm the request appears in Trust & Verification Center.
7. Test Request Information and Reject with a mandatory reason.
8. Resubmit as the member and then Approve & Trust as admin.
9. Confirm Trusted Profile status and member notification.
10. Confirm a non-admin request to `/api/admin` returns 403.
