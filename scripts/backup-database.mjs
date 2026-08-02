import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = path.resolve(process.env.BACKUP_DIR || "backups");
const target = path.join(dir, `mangalsaath-full-${stamp}.json`);
const checksumTarget = `${target}.sha256`;

const readers = {
  applicationState: () => prisma.applicationState.findMany(),
  users: () => prisma.user.findMany(),
  memberProfiles: () => prisma.memberProfile.findMany(),
  sessions: () => prisma.sessionRecord.findMany(),
  interests: () => prisma.interestRecord.findMany(),
  messages: () => prisma.messageRecord.findMany(),
  blocks: () => prisma.blockRecord.findMany(),
  reports: () => prisma.reportRecord.findMany(),
  relationalMigrationRuns: () => prisma.relationalMigrationRun.findMany(),
  businessSettings: () => prisma.businessSetting.findMany(),
  membershipPlans: () => prisma.membershipPlan.findMany(),
  planFeatures: () => prisma.planFeature.findMany(),
  coupons: () => prisma.coupon.findMany(),
  couponPlans: () => prisma.couponPlan.findMany(),
  couponRedemptions: () => prisma.couponRedemption.findMany(),
  paymentTransactions: () => prisma.paymentTransaction.findMany(),
  userMemberships: () => prisma.userMembership.findMany(),
  homepageSections: () => prisma.homepageSection.findMany(),
  adminMemberNotes: () => prisma.adminMemberNote.findMany(),
  adminAuditLogs: () => prisma.adminAuditLog.findMany(),
  photoModerationEvents: () => prisma.photoModerationEvent.findMany()
};

try {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const data = {};
  for (const [name, read] of Object.entries(readers)) data[name] = await read();
  const payload = {
    format: "mangalsaath-relational-backup-v1",
    createdAt: new Date().toISOString(),
    schemaProvider: "mysql",
    tableCounts: Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, rows.length])),
    data
  };
  const json = JSON.stringify(payload, null, 2);
  fs.writeFileSync(target, json, { mode: 0o600, flag: "wx" });
  const checksum = crypto.createHash("sha256").update(json).digest("hex");
  fs.writeFileSync(checksumTarget, `${checksum}  ${path.basename(target)}\n`, { mode: 0o600, flag: "wx" });
  console.log(`Full relational backup created: ${target}`);
  console.log(`SHA-256: ${checksum}`);
  console.log(`Records exported: ${Object.values(payload.tableCounts).reduce((sum, count) => sum + count, 0)}`);
} finally {
  await prisma.$disconnect();
}
