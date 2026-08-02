import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const SENSITIVE_KEY = /(password|passcode|otp|token|secret|authorization|cookie|signature|api.?key|private.?key)/i;

function safeValue(value, depth = 0) {
  if (depth > 5) return "[truncated]";
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
    return typeof value === "string" && value.length > 1000 ? `${value.slice(0, 1000)}…` : value;
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((entry) => safeValue(entry, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, entry]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[redacted]" : safeValue(entry, depth + 1)
    ]));
  }
  return String(value);
}

function requestMeta(request) {
  if (!request) return { ip: null, userAgent: null };
  return {
    ip: String(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "")
      .split(",")[0].trim().slice(0, 100) || null,
    userAgent: String(request.headers.get("user-agent") || "").slice(0, 500) || null
  };
}

export function buildAdminAuditData({ actorUserId, action, entityType = null, entityId = null, metadata = null, request = null }) {
  if (!action || String(action).length > 120) throw new Error("A valid audit action is required.");
  const meta = requestMeta(request);
  return {
    id: `aal_${crypto.randomBytes(12).toString("hex")}`,
    actorUserId: actorUserId || null,
    action: String(action),
    entityType: entityType ? String(entityType).slice(0, 80) : null,
    entityId: entityId ? String(entityId).slice(0, 64) : null,
    metadata: metadata == null ? undefined : safeValue(metadata),
    ip: meta.ip,
    userAgent: meta.userAgent
  };
}

export async function appendAdminAudit(input, client = prisma) {
  return client.adminAuditLog.create({ data: buildAdminAuditData(input) });
}
