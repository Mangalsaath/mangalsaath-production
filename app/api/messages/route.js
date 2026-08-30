import { NextResponse } from "next/server";
import { readDb, writeDb, uid, getUser, consumeFeature } from "@/lib/db";
import { blockedUserIdsFor, isBlockedBetween } from "@/lib/safety";
import {
  relationalCommunicationEnabled,
  listRelationalMessages,
  createRelationalMessage,
  markRelationalMessagesRead,
} from "@/lib/relational-communication";
import { prisma } from "@/lib/prisma";
import {
  demoProfileInteractionAllowed,
  getDemoProfileControl,
} from "@/lib/demo-profile-control";

const now = () => new Date().toISOString();

async function demoMessageAllowed(profileId) {
  const profile = await prisma.memberProfile.findUnique({
    where: { id: String(profileId || "") },
    select: {
      isDemoProfile: true,
      demoVisible: true,
      demoVisibleFrom: true,
      demoVisibleUntil: true,
    },
  });
  if (!profile?.isDemoProfile) return { allowed: true };
  const control = await getDemoProfileControl();
  return {
    allowed: demoProfileInteractionAllowed(profile, control, "message"),
    isDemoProfile: true,
  };
}

export async function GET(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (relationalCommunicationEnabled()) {
    return NextResponse.json(await listRelationalMessages(user.id));
  }

  const db = await readDb();
  const blockedIds = blockedUserIdsFor(db, user.id);
  const messages = db.messages
    .filter(
      (message) =>
        (message.fromUserId === user.id || message.toUserId === user.id) &&
        !blockedIds.has(
          message.fromUserId === user.id ? message.toUserId : message.fromUserId,
        ),
    )
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const enriched = messages.map((message) => {
    const otherId =
      message.fromUserId === user.id ? message.toUserId : message.fromUserId;
    const profile = db.profiles.find((item) => item.userId === otherId);
    return {
      ...message,
      otherProfile: profile
        ? {
            id: profile.id,
            name: profile.name,
            initials: profile.initials,
            verified: profile.verified,
            primaryPhotoData: profile.primaryPhotoData,
          }
        : null,
    };
  });
  return NextResponse.json({
    messages: enriched,
    unread: messages.filter((message) => message.toUserId === user.id && !message.read).length,
  });
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { profileId, text } = await request.json();
  const clean = String(text || "").trim();
  if (!clean) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  if (clean.length > 1000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  }

  if (relationalCommunicationEnabled()) {
    const demoGate = await demoMessageAllowed(profileId);
    if (!demoGate.allowed) {
      return NextResponse.json(
        { error: "Messaging is disabled for this controlled demo profile." },
        { status: 403 },
      );
    }

    const db = await readDb();
    const quota = consumeFeature(db, user.id, "messages");
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: `Your ${quota.plan?.name || "Free"} plan message limit has been reached. Upgrade to continue.`,
        },
        { status: 403 },
      );
    }
    const result = await createRelationalMessage(
      user.id,
      String(profileId || ""),
      clean,
    );
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    db.notifications = db.notifications || [];
    db.notifications.unshift({
      id: uid("n"),
      userId: result.targetUserId,
      type: "message_received",
      title: "New message",
      body: `${user.firstName} ${user.lastName} sent you a message.`,
      profileId: db.profiles.find((profile) => profile.userId === user.id)?.id || null,
      read: false,
      createdAt: now(),
    });
    await writeDb(db);
    return NextResponse.json({ message: result.message }, { status: 201 });
  }

  const db = await readDb();
  const profile = db.profiles.find((item) => item.id === profileId);
  if (!profile) return NextResponse.json({ error: "Recipient not found." }, { status: 404 });
  if (profile.userId === user.id) {
    return NextResponse.json({ error: "You cannot message yourself." }, { status: 400 });
  }
  if (isBlockedBetween(db, user.id, profile.userId)) {
    return NextResponse.json(
      { error: "Messaging is unavailable because one of these members has blocked the other." },
      { status: 403 },
    );
  }
  const accepted = db.interests.some(
    (interest) =>
      interest.status === "Accepted" &&
      ((interest.fromUserId === user.id && interest.toUserId === profile.userId) ||
        (interest.fromUserId === profile.userId && interest.toUserId === user.id)),
  );
  if (!accepted) {
    return NextResponse.json(
      { error: "Messaging becomes available after an interest is accepted." },
      { status: 403 },
    );
  }
  const quota = consumeFeature(db, user.id, "messages");
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: `Your ${quota.plan?.name || "Free"} plan message limit has been reached. Upgrade to continue.`,
      },
      { status: 403 },
    );
  }
  const createdAt = now();
  const message = {
    id: uid("m"),
    fromUserId: user.id,
    toUserId: profile.userId,
    profileId,
    text: clean,
    read: false,
    createdAt,
    updatedAt: createdAt,
  };
  db.messages.push(message);
  await writeDb(db);
  return NextResponse.json({ message }, { status: 201 });
}

export async function PATCH(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { otherUserId } = await request.json();
  if (relationalCommunicationEnabled()) {
    return NextResponse.json({
      changed: await markRelationalMessagesRead(
        user.id,
        otherUserId ? String(otherUserId) : null,
      ),
    });
  }

  const db = await readDb();
  let changed = 0;
  db.messages = db.messages.map((message) => {
    if (
      message.toUserId === user.id &&
      (!otherUserId || message.fromUserId === otherUserId) &&
      !message.read
    ) {
      changed += 1;
      return { ...message, read: true, readAt: now(), updatedAt: now() };
    }
    return message;
  });
  await writeDb(db);
  return NextResponse.json({ changed });
}
