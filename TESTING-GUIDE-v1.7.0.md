# Testing Guide – v1.7.0

## Build
1. Run `npm install`.
2. Run `npm run build`.
3. Confirm all application and API routes compile successfully.

## Interest lifecycle
1. Log in as a member.
2. Send an interest from Discover.
3. Log in as the receiving member and open Interests.
4. Accept or decline the pending interest.
5. Confirm the sender receives a notification.
6. Test withdrawal from the Sent list.

## Messaging
1. Confirm messaging is blocked until an interest is accepted.
2. After acceptance, open Messages or use the Message action.
3. Send a message and verify it appears in the conversation.
4. Log in as the recipient and verify the unread badge.
5. Open the conversation and confirm messages are marked read.

## Notifications
1. Open Alerts.
2. Mark one notification as read.
3. Use Mark all as read.
4. Confirm the navigation badge updates.

## Responsive review
Test Interests, Messages and Alerts at desktop, tablet and mobile widths.
