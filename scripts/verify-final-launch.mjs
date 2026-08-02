import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "package.json",
  "package-lock.json",
  ".env.example",
  "next.config.mjs",
  "prisma/schema.prisma",
  "FINAL-LAUNCH-AUDIT-v1.6.2.md",
  "HOSTINGER-LAUNCH-CHECKLIST-v1.6.2.md"
];

for (const file of requiredFiles) {
  if (!existsSync(file)) throw new Error(`Missing final-release file: ${file}`);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
if (pkg.version !== "1.6.2" || lock.version !== "1.6.2" || lock.packages?.[""]?.version !== "1.6.2") {
  throw new Error("Final release version is not consistently set to 1.6.2.");
}

const forbiddenRootFiles = readdirSync(".").filter((name) =>
  /^\.env(?:\..+)?$/i.test(name) && name !== ".env.example"
);
if (forbiddenRootFiles.length) {
  throw new Error(`Secret-bearing environment files must not be packaged: ${forbiddenRootFiles.join(", ")}`);
}

const checks = [
  ["node", ["scripts/check-project.mjs"]],
  ["node", ["scripts/verify-launch-readiness.mjs"]],
  ["node", ["scripts/verify-lc006-lc007.mjs"]],
  ["node", ["scripts/verify-lc008-static.mjs"]],
  ["node", ["scripts/verify-lc008-audit03.mjs"]],
  ["node", ["scripts/verify-lc008-audit04.mjs"]],
  ["node", ["scripts/verify-lc008-audit05.mjs"]],
  ["node", ["scripts/verify-lc008-audit06.mjs"]]
];

for (const [command, args] of checks) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("MangalSaath v1.6.2 Final Launch Candidate static certification passed.");
