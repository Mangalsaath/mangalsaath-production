# v6.6.1 Test Checklist
- Send interest once; repeat request returns already sent.
- Recipient can accept or reject; sender cannot respond.
- Sender can withdraw pending or accepted interest.
- Chat is rejected before acceptance and enabled after acceptance.
- Message length 1–1000 characters is enforced.
- Unread counter increases and PATCH marks messages read.
- Blocking either direction hides communication and prevents new actions.
- Set `COMMUNICATION_STORAGE_MODE=legacy` and confirm rollback path.
- Run `npm run db:communication:verify` and `npm run build`.
