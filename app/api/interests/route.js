import { NextResponse } from "next/server";
import { readDb, writeDb, uid, getUser, consumeFeature } from "@/lib/db";
import { blockedUserIdsFor, isBlockedBetween } from "@/lib/safety";
import {
  relationalCommunicationEnabled,
  listRelationalInterests,
  createRelationalInterest,
  updateRelationalInterest,
} from "@/lib/relational-communication";
import { prisma } from "@/lib/prisma";
import {
  demoProfileInteractionAllowed,
  getDemoProfileControl,
} from "@/lib/demo-profile-control";

const now = () => new Date().toISOString();

function notify(db, userId, type, title, body, profileId) {
  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: uid("n"),
    userId,
    type,
    title,
    body,
    profileId,
    read: false,
    createdAt: now(),
  });
}

async function demoInterestAllowed(profileId) {
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
    allowed: demoProfileInteractionAllowed(profile, control, "interest"),
    isDemoProfile: true,
  };
}

export async function GET(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (relationalCommunicationEnabled()) {
    return NextResponse.json(await listRelationalInterests(user.id));
  }

  const db = await readDb();
  const blockedIds = blockedUserIdsFor(db, user.id);
  const addOtherProfile = (interest) => ({
    ...interest,
    otherProfile:
      db.profiles.find((profile) =>
        profile.userId ===
        (interest.fromUserId === user.id ? interest.toUserId : interest.fromUserId)
      ) || null,
  });
  const sent = db.interests
    .filter((interest) => interest.fromUserId === user.id && !blockedIds.has(interest.toUserId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(addOtherProfile);
  const received = db.interests
    .filter(
      (interest) =>
        (interest.toUserId === user.id ||
          db.profiles.find((profile) => profile.id === interest.profileId)?.userId === user.id) &&
        !blockedIds.has(interest.fromUserId),
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(addOtherProfile);
  return NextResponse.json({ interests: sent, received });
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Please log in to send interest." }, { status: 401 });
  }
  const { profileId } = await request.json();

  if (relationalCommunicationEnabled()) {
    const demoGate = await demoInterestAllowed(profileId);
    if (!demoGate.allowed) {
      return NextResponse.json(
        { error: "Interests are disabled for this controlled demo profile." },
        { status: 403 },
      );
    }

    const db = await readDb();
    const quota = consumeFeature(db, user.id, "interests");
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: `Your ${quota.plan?.name || "Free"} plan interest limit has been reached. Upgrade to continue.`,
        },
        { status: 403 },
      );
    }

    const result = await createRelationalInterest(user.id, String(profileId || ""));
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    if (result.alreadySent) {
      return NextResponse.json({
        interest: result.interest,
        alreadySent: true,
        message: "Interest already sent.",
      });
    }

    notify(
      db,
      result.targetUserId,
      "interest_received",
      "New interest",
      `${user.firstName} ${user.lastName} sent you an interest.`,
      db.profiles.find((profile) => profile.userId === user.id)?.id || null,
    );
    db.activities.unshift({
      id: uid("a"),
      type: "interest_sent",
      userId: user.id,
      targetUserId: result.targetUserId,
      profileId,
      description: `${user.firstName} ${user.lastName} sent an interest`,
      createdAt: now(),
    });
    await writeDb(db);
    return NextResponse.json(
      { interest: result.interest, message: "Interest sent successfully." },
      { status: 201 },
    );
  }

  const db = await readDb();
  const profile = db.profiles.find((item) => item.id === profileId);
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  if (isBlockedBetween(db, user.id, profile.userId)) {
    return NextResponse.json(
      { error: "Interest cannot be sent because one of these members has blocked the other." },
      { status: 403 },
    );
  }
  if (profile.userId === user.id) {
    return NextResponse.json({ error: "You cannot send interest to your own profile." }, { status: 400 });
  }
  const existing = db.interests.find(
    (interest) =>
      interest.fromUserId === user.id &&
      interest.profileId === profileId &&
      interest.status !== "Withdrawn",
  );
  if (existing) {
    return NextResponse.json({
      interest: existing,
      alreadySent: true,
      message: "Interest already sent.",
    });
  }
  const quota = consumeFeature(db, user.id, "interests");
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: `Your ${quota.plan?.name || "Free"} plan interest limit has been reached. Upgrade to continue.`,
      },
      { status: 403 },
    );
  }
  const createdAt = now();
  const interest = {
    id: uid("i"),
    fromUserId: user.id,
    toUserId: profile.userId,
    profileId,
    status: "Pending",
    createdAt,
    updatedAt: createdAt,
  };
  db.interests.push(interest);
  notify(
    db,
    profile.userId,
    "interest_received",
    "New interest",
    `${user.firstName} ${user.lastName} sent you an interest.`,
    db.profiles.find((item) => item.userId === user.id)?.id || null,
  );
  await writeDb(db);
  return NextResponse.json({ interest, message: "Interest sent successfully." }, { status: 201 });
}

export async function PATCH(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { interestId, action } = await request.json();

  if (relationalCommunicationEnabled()) {
    const result = await updateRelationalInterest(
      user.id,
      String(interestId || ""),
      String(action || ""),
    );
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const db = await readDb();
    const actorProfile = db.profiles.find((profile) => profile.userId === user.id);
    notify(
      db,
      result.otherUserId,
      `interest_${result.interest.status.toLowerCase()}`,
      `Interest ${result.interest.status.toLowerCase()}`,
      `${actorProfile?.name || "A member"} ${result.interest.status.toLowerCase()} the interest.`,
      actorProfile?.id || null,
    );
    await writeDb(db);
    return NextResponse.json({
      interest: result.interest,
      message: `Interest ${result.interest.status.toLowerCase()} successfully.`,
    });
  }

  const db = await readDb();
  const interest = db.interests.find((item) => item.id === interestId);
  if (!interest) return NextResponse.json({ error: "Interest not found." }, { status: 404 });
  const received = interest.toUserId === user.id;
  const sent = interest.fromUserId === user.id;
  if (["accept", "reject"].includes(action) && !received) {
    return NextResponse.json({ error: "Only the recipient can respond." }, { status: 403 });
  }
  if (action === "withdraw" && !sent) {
    return NextResponse.json({ error: "Only the sender can withdraw." }, { status: 403 });
  }
  const map = { accept: "Accepted", reject: "Rejected", withdraw: "Withdrawn" };
  if (!map[action]) return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  interest.status = map[action];
  interest.updatedAt = now();
  await writeDb(db);
  return NextResponse.json({
    interest,
    message: `Interest ${interest.status.toLowerCase()} successfully.`,
  });
}
