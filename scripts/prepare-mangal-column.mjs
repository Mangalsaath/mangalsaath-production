import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function columnExists(databaseName, columnName) {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'member_profiles' AND COLUMN_NAME = ? LIMIT 1",
    databaseName,
    columnName,
  );
  return rows.length > 0;
}

async function addColumnIfMissing(databaseName, columnName, definition) {
  if (await columnExists(databaseName, columnName)) {
    console.log(`[Profile schema] ${columnName} already exists.`);
    return;
  }
  console.log(`[Profile schema] Adding ${columnName}...`);
  await prisma.$executeRawUnsafe(`ALTER TABLE member_profiles ADD COLUMN ${columnName} ${definition}`);
  console.log(`[Profile schema] ${columnName} added successfully.`);
}

async function main() {
  const databaseRows = await prisma.$queryRawUnsafe("SELECT DATABASE() AS db");
  const databaseName = databaseRows?.[0]?.db;
  if (!databaseName) throw new Error("Unable to determine active database.");

  await addColumnIfMissing(databaseName, "mangalNumber", "INT NULL");
  await addColumnIfMissing(databaseName, "demoClientReference", "VARCHAR(120) NULL");
  await addColumnIfMissing(databaseName, "demoInternalNotes", "TEXT NULL");
  await addColumnIfMissing(databaseName, "fatherName", "VARCHAR(180) NULL");
  await addColumnIfMissing(databaseName, "fatherStatus", "VARCHAR(60) NULL");
  await addColumnIfMissing(databaseName, "fatherOccupation", "VARCHAR(180) NULL");
  await addColumnIfMissing(databaseName, "motherName", "VARCHAR(180) NULL");
  await addColumnIfMissing(databaseName, "motherStatus", "VARCHAR(60) NULL");
  await addColumnIfMissing(databaseName, "motherOccupation", "VARCHAR(180) NULL");
  await addColumnIfMissing(databaseName, "familyType", "VARCHAR(80) NULL");
  await addColumnIfMissing(databaseName, "familyLocation", "VARCHAR(180) NULL");
  await addColumnIfMissing(databaseName, "familyValues", "VARCHAR(120) NULL");
  await addColumnIfMissing(databaseName, "brothersDetails", "TEXT NULL");
  await addColumnIfMissing(databaseName, "sistersDetails", "TEXT NULL");
}

main()
  .catch((error) => {
    console.error("[Profile schema] Safe column preparation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
