import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const source = path.resolve(process.env.JSON_DATABASE_PATH || "data/db.json");

try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (!fs.existsSync(source)) throw new Error(`JSON database not found: ${source}`);
  const payload = JSON.parse(fs.readFileSync(source, "utf8"));
  const existing = await prisma.applicationState.findUnique({ where: { id: 1 } });
  if (existing && process.env.FORCE_JSON_IMPORT !== "true") {
    throw new Error("MySQL already contains application data. Set FORCE_JSON_IMPORT=true only after taking a backup.");
  }
  await prisma.applicationState.upsert({
    where: { id: 1 },
    create: { id: 1, payload },
    update: { payload, version: { increment: 1 } }
  });
  console.log(`Imported ${source} into MySQL successfully.`);
} finally {
  await prisma.$disconnect();
}
