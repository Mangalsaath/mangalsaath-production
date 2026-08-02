export function isBlockedBetween(db, userA, userB) {
  if (!userA || !userB) return false;
  return (db.blocks || []).some((block) => block.active !== false && ((block.blockerUserId === userA && block.blockedUserId === userB) || (block.blockerUserId === userB && block.blockedUserId === userA)));
}

export function blockedUserIdsFor(db, userId) {
  const ids = new Set();
  for (const block of db.blocks || []) {
    if (block.active === false) continue;
    if (block.blockerUserId === userId) ids.add(block.blockedUserId);
    if (block.blockedUserId === userId) ids.add(block.blockerUserId);
  }
  return ids;
}

export function sanitizeReport(report) {
  return {
    id: report.id,
    targetUserId: report.targetUserId,
    targetProfileId: report.targetProfileId || null,
    category: report.category,
    details: report.details,
    status: report.status,
    createdAt: report.createdAt,
    reviewedAt: report.reviewedAt || null
  };
}
