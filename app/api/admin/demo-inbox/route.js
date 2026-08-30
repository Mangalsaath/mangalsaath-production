import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uid } from "@/lib/db";
import {
  ADMIN_PERMISSIONS,
  isAdminAuthorizationError,
  requireAdmin,
} from "@/lib/admin-auth";
import { appendAdminAudit } from "@/lib/admin-audit";
import { cleanText, rateLimit } from "@/lib/security";
import { getDemoProfileControl } from "@/lib/demo-profile-control";

function fail(error) {
  if (isAdminAuthorizationError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Demo inbox API error", error);
  return NextResponse.json({ error: "Unable to complete the demo inbox request." }, { status: 500 });
}

async function requireSuperAdmin(request, permission) {
  const result = await requireAdmin(request, { permission, requireDualOtp: true });
  if (String(result.user.role || "").toLowerCase() !== "super_admin") {
    throw Object.assign(new Error("Super Admin access required."), {
      status: 403,
      name: "AdminAuthorizationError",
    });
  }
  return result;
}

async function getDemoProfile(profileId) {
  const profile = await prisma.memberProfile.findUnique({
    where: { id: String(profileId || "") },
    include: { user: true },
  });
  return profile?.isDemoProfile ? profile : null;
}

async function getTargetProfile(profileId) {
  return prisma.memberProfile.findUnique({
    where: { id: String(profileId || "") },
    include: { user: true },
  });
}

export async function GET(request) {
  try {
    await requireSuperAdmin(request, ADMIN_PERMISSIONS.DEMO_PROFILES_READ);
    const profiles = await prisma.memberProfile.findMany({
      where: { isDemoProfile: true },
      select: {
        id: true,
        userId: true,
        name: true,
        city: true,
        state: true,
        gender: true,
        demoVisible: true,
        demoVisibleFrom: true,
        demoVisibleUntil: true,
      },
      orderBy: { name: "asc" },
      take: 1100,
    });
    const demoUserIds = profiles.map((profile) => profile.userId);
    const [interests, messages, control] = await Promise.all([
      demoUserIds.length
        ? prisma.interestRecord.findMany({
            where: {
              OR: [
                { fromUserId: { in: demoUserIds } },
                { toUserId: { in: demoUserIds } },
              ],
            },
            include: { sender: true, recipient: true },
            orderBy: { createdAt: "desc" },
            take: 300,
          })
        : [],
      demoUserIds.length
        ? prisma.messageRecord.findMany({
            where: {
              OR: [
                { fromUserId: { in: demoUserIds } },
                { toUserId: { in: demoUserIds } },
              ],
            },
            include: { sender: true, recipient: true },
            orderBy: { createdAt: "desc" },
            take: 500,
          })
        : [],
      getDemoProfileControl(),
    ]);

    return NextResponse.json(
      {
        control: {
          enabled: control.enabled,
          allowInterests: control.allowInterests,
          allowMessages: control.allowMessages,
        },
        profiles,
        interests,
        messages,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request) {
  const limited = rateLimit(request, {
    key: "admin-demo-inbox",
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many demo inbox actions. Please wait." },
      { status: 429 },
    );
  }

  try {
    const { user: admin } = await requireSuperAdmin(
      request,
      ADMIN_PERMISSIONS.DEMO_PROFILES_WRITE,
    );
    const body = await request.json();
    const action = cleanText(body.action, 50);
    const control = await getDemoProfileControl();

    if (!control.enabled && action !== "interest-response") {
      return NextResponse.json(
        { error: "Enable the controlled demo before initiating synthetic profile interactions." },
        { status: 403 },
      );
    }

    if (action === "interest-response") {
      const interestId = cleanText(body.interestId, 64);
      const responseAction = cleanText(body.response, 20);
      if (!["accept", "reject"].includes(responseAction)) {
        return NextResponse.json({ error: "Invalid interest response." }, { status: 400 });
      }
      const interest = await prisma.interestRecord.findUnique({
        where: { id: interestId },
      });
      if (!interest) {
        return NextResponse.json({ error: "Interest not found." }, { status: 404 });
      }
      const recipientDemo = await prisma.memberProfile.findUnique({
        where: { userId: interest.toUserId },
        select: { isDemoProfile: true, id: true },
      });
      if (!recipientDemo?.isDemoProfile) {
        return NextResponse.json(
          { error: "Only interests received by a synthetic demo profile can be handled here." },
          { status: 403 },
        );
      }
      const updated = await prisma.interestRecord.update({
        where: { id: interest.id },
        data: {
          status: responseAction === "accept" ? "Accepted" : "Rejected",
        },
      });
      await appendAdminAudit({
        actorUserId: admin.id,
        action: `demo.interest.${responseAction}ed`,
        entityType: "InterestRecord",
        entityId: updated.id,
        metadata: { demoProfileId: recipientDemo.id },
        request,
      });
      return NextResponse.json({
        message: `Interest ${updated.status.toLowerCase()} as the demo profile.`,
        interest: updated,
      });
    }

    if (action === "send-interest") {
      if (!control.allowInterests) {
        return NextResponse.json(
          { error: "Demo interests are disabled in Super Admin controls." },
          { status: 403 },
        );
      }
      const fromProfile = await getDemoProfile(body.fromProfileId);
      const toProfile = await getTargetProfile(body.toProfileId);
      if (!fromProfile || !toProfile) {
        return NextResponse.json({ error: "Source or target profile not found." }, { status: 404 });
      }
      if (fromProfile.userId === toProfile.userId) {
        return NextResponse.json({ error: "A profile cannot send interest to itself." }, { status: 400 });
      }
      const existing = await prisma.interestRecord.findFirst({
        where: {
          fromUserId: fromProfile.userId,
          toUserId: toProfile.userId,
          status: { not: "Withdrawn" },
        },
        orderBy: { createdAt: "desc" },
      });
      if (existing) {
        return NextResponse.json({
          message: "Interest already exists.",
          interest: existing,
          alreadySent: true,
        });
      }
      const created = await prisma.interestRecord.create({
        data: {
          id: uid("demo_interest"),
          fromUserId: fromProfile.userId,
          toUserId: toProfile.userId,
          profileId: toProfile.id,
          status: "Pending",
        },
      });
      await appendAdminAudit({
        actorUserId: admin.id,
        action: "demo.interest.sent",
        entityType: "InterestRecord",
        entityId: created.id,
        metadata: {
          fromDemoProfileId: fromProfile.id,
          toProfileId: toProfile.id,
        },
        request,
      });
      return NextResponse.json(
        { message: "Interest sent as the selected demo profile.", interest: created },
        { status: 201 },
      );
    }

    if (action === "send-message") {
      if (!control.allowMessages) {
        return NextResponse.json(
          { error: "Demo messaging is disabled in Super Admin controls." },
          { status: 403 },
        );
      }
      const fromProfile = await getDemoProfile(body.fromProfileId);
      const toProfile = await getTargetProfile(body.toProfileId);
      const text = cleanText(body.text, 1000);
      if (!fromProfile || !toProfile) {
        return NextResponse.json({ error: "Source or target profile not found." }, { status: 404 });
      }
      if (!text) {
        return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
      }
      const accepted = await prisma.interestRecord.findFirst({
        where: {
          status: "Accepted",
          OR: [
            { fromUserId: fromProfile.userId, toUserId: toProfile.userId },
            { fromUserId: toProfile.userId, toUserId: fromProfile.userId },
          ],
        },
      });
      if (!accepted) {
        return NextResponse.json(
          { error: "An accepted interest is required before messaging." },
          { status: 403 },
        );
      }
      const created = await prisma.messageRecord.create({
        data: {
          id: uid("demo_message"),
          fromUserId: fromProfile.userId,
          toUserId: toProfile.userId,
          profileId: toProfile.id,
          text,
          read: false,
        },
      });
      await appendAdminAudit({
        actorUserId: admin.id,
        action: "demo.message.sent",
        entityType: "MessageRecord",
        entityId: created.id,
        metadata: {
          fromDemoProfileId: fromProfile.id,
          toProfileId: toProfile.id,
        },
        request,
      });
      return NextResponse.json(
        { message: "Message sent as the selected demo profile.", record: created },
        { status: 201 },
      );
    }

    return NextResponse.json({ error: "Invalid demo inbox action." }, { status: 400 });
  } catch (error) {
    return fail(error);
  }
}
