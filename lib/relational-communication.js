import { config } from "@/lib/config";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { toApplicationProfile } from "@/lib/relational-profile";

const uid = (prefix) => `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
const iso = (value) => value?.toISOString?.() || value;

export function relationalCommunicationEnabled() {
  return config.storage.communication !== "legacy";
}

export async function blockedUserIdsForRelational(userId) {
  const rows = await prisma.blockRecord.findMany({
    where: { active: true, OR: [{ blockerUserId: userId }, { blockedUserId: userId }] },
    select: { blockerUserId: true, blockedUserId: true }
  });
  return new Set(rows.map((row) => row.blockerUserId === userId ? row.blockedUserId : row.blockerUserId));
}

export async function isBlockedBetweenRelational(userA, userB) {
  if (!userA || !userB) return false;
  return Boolean(await prisma.blockRecord.findFirst({
    where: { active: true, OR: [
      { blockerUserId: userA, blockedUserId: userB },
      { blockerUserId: userB, blockedUserId: userA }
    ] }, select: { id: true }
  }));
}

export async function listRelationalInterests(userId) {
  const blocked = await blockedUserIdsForRelational(userId);
  const rows = await prisma.interestRecord.findMany({
    where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    orderBy: { createdAt: "desc" }
  });
  const visible = rows.filter((row) => !blocked.has(row.fromUserId === userId ? row.toUserId : row.fromUserId));
  const otherUserIds = [...new Set(visible.map((row) => row.fromUserId === userId ? row.toUserId : row.fromUserId))];
  const profiles = otherUserIds.length ? await prisma.memberProfile.findMany({ where: { userId: { in: otherUserIds } }, include: { user: true } }) : [];
  const profilesByUser = new Map(profiles.map((profile) => [profile.userId, toApplicationProfile(profile)]));
  const map = (row) => {
    const otherUserId = row.fromUserId === userId ? row.toUserId : row.fromUserId;
    return { ...row, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt), otherProfile: profilesByUser.get(otherUserId) || null };
  };
  return {
    interests: visible.filter((row) => row.fromUserId === userId).map(map),
    received: visible.filter((row) => row.toUserId === userId).map(map)
  };
}

export async function createRelationalInterest(fromUserId, profileId) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.memberProfile.findUnique({ where: { id: profileId } });
    if (!profile) return { error: "Profile not found.", status: 404 };
    if (profile.userId === fromUserId) return { error: "You cannot send interest to your own profile.", status: 400 };
    const blocked = await tx.blockRecord.findFirst({ where: { active: true, OR: [
      { blockerUserId: fromUserId, blockedUserId: profile.userId },
      { blockerUserId: profile.userId, blockedUserId: fromUserId }
    ] } });
    if (blocked) return { error: "Interest cannot be sent because one of these members has blocked the other.", status: 403 };
    const existing = await tx.interestRecord.findFirst({
      where: { fromUserId, toUserId: profile.userId, status: { not: "Withdrawn" } },
      orderBy: { createdAt: "desc" }
    });
    if (existing) return { interest: { ...existing, createdAt: iso(existing.createdAt), updatedAt: iso(existing.updatedAt) }, alreadySent: true };
    const interest = await tx.interestRecord.create({
      data: { id: uid("i"), fromUserId, toUserId: profile.userId, profileId, status: "Pending" }
    });
    return { interest: { ...interest, createdAt: iso(interest.createdAt), updatedAt: iso(interest.updatedAt) }, targetUserId: profile.userId };
  });
}

export async function updateRelationalInterest(userId, interestId, action) {
  return prisma.$transaction(async (tx) => {
    const interest = await tx.interestRecord.findUnique({ where: { id: interestId } });
    if (!interest) return { error: "Interest not found.", status: 404 };
    const received = interest.toUserId === userId;
    const sent = interest.fromUserId === userId;
    if (["accept", "reject"].includes(action) && !received) return { error: "Only the recipient can respond.", status: 403 };
    if (action === "withdraw" && !sent) return { error: "Only the sender can withdraw.", status: 403 };
    if (["accept", "reject"].includes(action) && interest.status !== "Pending") return { error: "Only pending interests can be updated.", status: 400 };
    if (action === "withdraw" && !["Pending", "Accepted"].includes(interest.status)) return { error: "This interest cannot be withdrawn.", status: 400 };
    const status = { accept: "Accepted", reject: "Rejected", withdraw: "Withdrawn" }[action];
    if (!status) return { error: "Invalid action.", status: 400 };
    const updated = await tx.interestRecord.update({ where: { id: interestId }, data: { status } });
    return { interest: { ...updated, createdAt: iso(updated.createdAt), updatedAt: iso(updated.updatedAt) }, otherUserId: received ? updated.fromUserId : updated.toUserId };
  });
}

export async function listRelationalMessages(userId) {
  const blocked = await blockedUserIdsForRelational(userId);
  const rows = await prisma.messageRecord.findMany({
    where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    orderBy: { createdAt: "asc" }
  });
  const visible = rows.filter((row) => !blocked.has(row.fromUserId === userId ? row.toUserId : row.fromUserId));
  const otherIds = [...new Set(visible.map((row) => row.fromUserId === userId ? row.toUserId : row.fromUserId))];
  const profiles = otherIds.length ? await prisma.memberProfile.findMany({ where: { userId: { in: otherIds } }, include: { user: true } }) : [];
  const byUser = new Map(profiles.map((profile) => [profile.userId, toApplicationProfile(profile)]));
  const messages = visible.map((row) => {
    const otherId = row.fromUserId === userId ? row.toUserId : row.fromUserId;
    return { ...row, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt), readAt: iso(row.readAt), otherProfile: byUser.get(otherId) || null };
  });
  return { messages, unread: messages.filter((row) => row.toUserId === userId && !row.read).length };
}

export async function createRelationalMessage(fromUserId, profileId, text) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.memberProfile.findUnique({ where: { id: profileId } });
    if (!profile) return { error: "Recipient not found.", status: 404 };
    if (profile.userId === fromUserId) return { error: "You cannot message yourself.", status: 400 };
    const blocked = await tx.blockRecord.findFirst({ where: { active: true, OR: [
      { blockerUserId: fromUserId, blockedUserId: profile.userId },
      { blockerUserId: profile.userId, blockedUserId: fromUserId }
    ] } });
    if (blocked) return { error: "Messaging is unavailable because one of these members has blocked the other.", status: 403 };
    const accepted = await tx.interestRecord.findFirst({ where: { status: "Accepted", OR: [
      { fromUserId, toUserId: profile.userId }, { fromUserId: profile.userId, toUserId: fromUserId }
    ] } });
    if (!accepted) return { error: "Messaging becomes available after an interest is accepted.", status: 403 };
    const message = await tx.messageRecord.create({ data: { id: uid("m"), fromUserId, toUserId: profile.userId, profileId, text } });
    return { message: { ...message, createdAt: iso(message.createdAt), updatedAt: iso(message.updatedAt), readAt: null }, targetUserId: profile.userId };
  });
}

export async function markRelationalMessagesRead(userId, otherUserId = null) {
  const now = new Date();
  const result = await prisma.messageRecord.updateMany({
    where: { toUserId: userId, read: false, ...(otherUserId ? { fromUserId: otherUserId } : {}) },
    data: { read: true, readAt: now }
  });
  return result.count;
}
