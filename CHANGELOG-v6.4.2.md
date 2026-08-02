# MangalSaath v6.4.2 — Safety Center

## Launch-critical additions

- Added member blocking and unblocking records.
- Added member reporting with controlled categories, detail validation and duplicate-open-report prevention.
- Blocked members are removed from each other’s search results and profile detail access.
- Blocked members cannot send interests or messages to one another.
- Existing pending/accepted interests are closed as `Blocked` when a member is blocked.
- Conversations with blocked members no longer appear in the member message list.
- Added administrator report queue data and report resolution/dismissal actions.
- Added visible Report and Block controls on public profile detail pages.
- Added audit records for submitted and reviewed safety reports.

## Data model note

This release adds `blocks` and `reports` to the transitional application-state payload. These records must be normalized into relational tables during v6.5.0 Relational Core.
