import fs from "node:fs";
const backup = fs.readFileSync("scripts/backup-database.mjs", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const required = [
  "user.findMany", "memberProfile.findMany", "sessionRecord.findMany",
  "interestRecord.findMany", "messageRecord.findMany", "blockRecord.findMany",
  "reportRecord.findMany", "businessSetting.findMany", "membershipPlan.findMany",
  "planFeature.findMany", "coupon.findMany", "couponPlan.findMany",
  "couponRedemption.findMany", "paymentTransaction.findMany", "userMembership.findMany",
  "homepageSection.findMany", "adminMemberNote.findMany", "adminAuditLog.findMany",
  "photoModerationEvent.findMany"
];
for (const token of required) {
  if (!backup.includes(token)) throw new Error(`Full relational backup is missing ${token}`);
}
for (const token of ["sha256", 'mode: 0o600', 'flag: "wx"', "tableCounts", "mangalsaath-relational-backup-v1"]) {
  if (!backup.includes(token)) throw new Error(`Backup safety control missing: ${token}`);
}
if (!/^1\.6\.\d+$/.test(pkg.version)) throw new Error(`Unexpected package version ${pkg.version}`);
console.log("LC-008 Audit 04 backup completeness and safety checks passed.");
