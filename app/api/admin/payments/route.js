import { NextResponse } from "next/server";
import { readDb, writeDb, uid } from "@/lib/db";
import { requireAdmin, ADMIN_PERMISSIONS, isAdminAuthorizationError } from "@/lib/admin-auth";
import { appendAdminAudit } from "@/lib/admin-audit";
import { useRelationalAdmin, serializeRecord } from "@/lib/admin-core";
import { activateMembership } from "@/lib/payment-engine";
import { prisma } from "@/lib/prisma";
import { cleanText, rateLimit } from "@/lib/security";

function failure(error) {
  if (isAdminAuthorizationError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("Admin payment review failed", error);
  return NextResponse.json({ error: "Unable to review this payment." }, { status: 500 });
}

export async function POST(request) {
  const limited = rateLimit(request, { key: "admin-payment-review", limit: 30, windowMs: 60_000 });
  if (!limited.allowed) return NextResponse.json({ error: "Too many payment review attempts. Please wait." }, { status: 429 });

  try {
    const { user: admin } = await requireAdmin(request, {
      permission: ADMIN_PERMISSIONS.PAYMENTS_REVIEW,
      requireDualOtp: true
    });
    const body = await request.json();
    const transactionId = cleanText(body.transactionId, 64);
    const action = cleanText(body.action, 20);
    const note = cleanText(body.note, 500);

    if (!transactionId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "A valid transaction and action are required." }, { status: 400 });
    }
    if (action === "reject" && !note) {
      return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
    }

    if (!useRelationalAdmin()) return legacyReview(admin, { transactionId, action, note });

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: { plan: true, user: true }
    });
    if (!transaction) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
    if (transaction.status !== "pending") {
      return NextResponse.json({ error: "This payment has already been reviewed." }, { status: 409 });
    }
    if (transaction.gateway !== "manual-upi") {
      return NextResponse.json({ error: "Online gateway payments are verified automatically." }, { status: 400 });
    }
    if (!transaction.user || !transaction.plan) {
      return NextResponse.json({ error: "Associated member or plan is unavailable." }, { status: 409 });
    }

    if (action === "reject") {
      const updated = await prisma.$transaction(async (tx) => {
        const changed = await tx.paymentTransaction.updateMany({
          where: { id: transaction.id, status: "pending" },
          data: {
            status: "rejected",
            reviewedBy: admin.id,
            reviewedAt: new Date(),
            verificationMetadata: {
              ...(transaction.verificationMetadata || {}),
              reviewNote: note,
              reviewedBy: admin.id,
              reviewedAt: new Date().toISOString()
            }
          }
        });
        if (changed.count !== 1) throw new Error("PAYMENT_ALREADY_REVIEWED");
        return tx.paymentTransaction.findUnique({ where: { id: transaction.id } });
      });
      await appendAdminAudit({
        actorUserId: admin.id,
        action: "payment.rejected",
        entityType: "PaymentTransaction",
        entityId: transaction.id,
        metadata: { note, userId: transaction.userId, planId: transaction.planId, amountPaise: transaction.amountPaise },
        request
      });
      return NextResponse.json({ message: "Payment rejected.", transaction: serializeRecord(updated) });
    }

    const updated = await activateMembership({
      paymentId: transaction.id,
      reviewedBy: admin.id,
      verificationMetadata: {
        ...(transaction.verificationMetadata || {}),
        verifiedBy: "manual-admin-review",
        reviewNote: note || null,
        reviewedAt: new Date().toISOString()
      }
    });
    await appendAdminAudit({
      actorUserId: admin.id,
      action: "payment.approved",
      entityType: "PaymentTransaction",
      entityId: transaction.id,
      metadata: { note, userId: transaction.userId, planId: transaction.planId, amountPaise: transaction.amountPaise },
      request
    });
    return NextResponse.json({ message: "Payment approved and membership activated.", transaction: serializeRecord(updated) });
  } catch (error) {
    if (error?.message === "PAYMENT_ALREADY_REVIEWED") {
      return NextResponse.json({ error: "This payment has already been reviewed." }, { status: 409 });
    }
    return failure(error);
  }
}

async function legacyReview(admin, { transactionId, action, note }) {
  const db = await readDb();
  const transaction = (db.transactions || []).find((item) => item.id === transactionId);
  if (!transaction) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  if (transaction.status !== "pending") return NextResponse.json({ error: "This payment has already been reviewed." }, { status: 409 });
  const plan = (db.plans || []).find((item) => item.id === transaction.planId);
  const user = (db.users || []).find((item) => item.id === transaction.userId);
  if (!plan || !user) return NextResponse.json({ error: "Associated plan or member is unavailable." }, { status: 409 });

  const now = new Date().toISOString();
  transaction.status = action === "approve" ? "paid" : "rejected";
  transaction.updatedAt = now;
  transaction.reviewedBy = admin.id;
  transaction.reviewedAt = now;
  transaction.reviewNote = note || null;

  if (action === "approve") {
    (db.subscriptions || []).filter((item) => item.userId === user.id && item.status === "active").forEach((item) => {
      item.status = "replaced";
      item.updatedAt = now;
    });
    const expiresAt = plan.durationDays > 0 ? new Date(Date.now() + plan.durationDays * 86_400_000).toISOString() : null;
    db.subscriptions.push({ id: uid("sub"), userId: user.id, planId: plan.id, status: "active", startsAt: now, expiresAt, transactionId: transaction.id, createdAt: now });
    user.membership = plan.name;
    user.membershipPlanId = plan.id;
  }
  await writeDb(db);
  return NextResponse.json({ message: action === "approve" ? "Payment approved and membership activated." : "Payment rejected.", transaction });
}
