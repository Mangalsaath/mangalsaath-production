import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const databaseRows = await prisma.$queryRawUnsafe("SELECT DATABASE() AS db");
  const databaseName = databaseRows?.[0]?.db;
  if (!databaseName) throw new Error("Unable to determine active database.");

  const columns = await prisma.$queryRawUnsafe(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'member_profiles' AND COLUMN_NAME = 'mangalNumber' LIMIT 1",
    databaseName,
  );

  if (!columns.length) {
    console.log("[Mangal ID] Adding nullable mangalNumber column for existing profile rows...");
    await prisma.$executeRawUnsafe("ALTER TABLE member_profiles ADD COLUMN mangalNumber INT NULL");
    console.log("[Mangal ID] Nullable mangalNumber column added successfully.");
  } else {
    console.log("[Mangal ID] mangalNumber column already exists; no schema preparation needed.");
  }
}

main()
  .catch((error) => {
    console.error("[Mangal ID] Safe column preparation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
