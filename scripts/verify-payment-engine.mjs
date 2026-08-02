import fs from "node:fs";
const required=["lib/payment-engine.js","app/api/payments/order/route.js","app/api/payments/verify/route.js","app/api/payments/webhook/route.js","app/api/payments/coupon/route.js"];
for(const file of required){if(!fs.existsSync(file))throw new Error(`Missing ${file}`)}
const schema=fs.readFileSync("prisma/schema.prisma","utf8");
for(const model of ["UserMembership","PaymentTransaction","CouponRedemption"]){if(!schema.includes(`model ${model}`))throw new Error(`Missing Prisma model ${model}`)}
console.log("Payment engine structure verified.");
