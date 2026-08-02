import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const state = await prisma.applicationState.findUnique({ where: { id: 1 } });
  if (!state) throw new Error("ApplicationState row 1 was not found.");
  const db = state.payload || {};
  const expected = {
    settings: Object.keys(db.settings || {}).length,
    plans: Array.isArray(db.plans) ? db.plans.length : 0,
    coupons: Array.isArray(db.coupons) ? db.coupons.length : 0,
    transactions: Array.isArray(db.transactions) ? db.transactions.length : 0,
    homepageOffers: Array.isArray(db.homepageOffers) ? db.homepageOffers.length : 0,
    auditLogs: Array.isArray(db.adminAuditLogs) ? db.adminAuditLogs.length : 0
  };
  const actual = {
    settings: await prisma.businessSetting.count(),
    plans: await prisma.membershipPlan.count(),
    coupons: await prisma.coupon.count(),
    transactions: await prisma.paymentTransaction.count(),
    homepageOffers: await prisma.homepageSection.count({ where: { sectionKey: { startsWith: "offer:" } } }),
    auditLogs: await prisma.adminAuditLog.count()
  };
  const results = Object.fromEntries(Object.keys(expected).map((key) => [key, { expected: expected[key], actual: actual[key], ok: actual[key] >= expected[key] }]));
  console.log(JSON.stringify(results, null, 2));
  if (Object.values(results).some((entry) => !entry.ok)) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
