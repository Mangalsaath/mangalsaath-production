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
  console.error("Demo inbox reply API error", error);
  return NextResponse.json({ error: "Unable to send the demo reply." }, { status: 500 });
}

export async function POST(request) {
  const limited = rateLimit(request, {
    key: "admin-demo-inbox-reply",
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many reply attempts. Please wait." }, { status: 429 });
  }

  try {
    const { user: admin } = await requireAdmin(request, {
      permission: ADMIN_PERMISSIONS.DEMO_PROFILES_WRITE,
      requireDualOtp: true,
    });
    if (String(admin.role || "").toLowerCase() !== "super_admin") {
      return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
    }

    const control = await getDemoProfileControl();
    if (!control.enabled || !control.allowMessages) {
      return NextResponse.json(
        { error: "Enable controlled demo messaging before replying." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const messageId = cleanText(body.messageId, 64);
    const text = cleanText(body.text, 1000);
    if (!messageId || !text) {
      return NextResponse.json({ error: "Message and reply text are required." }, { status: 400 });
    }

    const source = await prisma.messageRecord.findUnique({ where: { id: messageId } });
    if (!source) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    const recipientDemo = await prisma.memberProfile.findUnique({
      where: { userId: source.toUserId },
      include: { user: true },
    });
    if (!recipientDemo?.isDemoProfile) {
      return NextResponse.json(
        { error: "Only messages received by a synthetic demo profile can be replied to here." },
        { status: 403 },
      );
    }

    const targetProfile = await prisma.memberProfile.findUnique({
      where: { userId: source.fromUserId },
      include: { user: true },
    });
    if (!targetProfile) {
      return NextResponse.json({ error: "The sender profile is no longer available." }, { status: 404 });
    }

    const accepted = await prisma.interestRecord.findFirst({
      where: {
        status: "Accepted",
        OR: [
          { fromUserId: recipientDemo.userId, toUserId: targetProfile.userId },
          { fromUserId: targetProfile.userId, toUserId: recipientDemo.userId },
        ],
      },
    });
    if (!accepted) {
      return NextResponse.json(
        { error: "An accepted interest is required before replying." },
        { status: 403 },
      );
    }

    const reply = await prisma.messageRecord.create({
      data: {
        id: uid("demo_message"),
        fromUserId: recipientDemo.userId,
        toUserId: targetProfile.userId,
        profileId: targetProfile.id,
        text,
        read: false,
      },
    });

    await prisma.messageRecord.update({
      where: { id: source.id },
      data: { read: true, readAt: new Date() },
    });

    await appendAdminAudit({
      actorUserId: admin.id,
      action: "demo.message.replied",
      entityType: "MessageRecord",
      entityId: reply.id,
      metadata: {
        sourceMessageId: source.id,
        fromDemoProfileId: recipientDemo.id,
        toProfileId: targetProfile.id,
      },
      request,
    });

    return NextResponse.json(
      { message: "Reply sent as the synthetic demo profile.", record: reply },
      { status: 201 },
    );
  } catch (error) {
    return fail(error);
  }
}
