import {
  openDatabase,
  provisionOwner,
  prune,
  backupDatabase,
} from "./database.mjs";
process.umask(0o077);
const db = openDatabase(process.env.DATABASE_PATH);
try {
  const command = process.argv[2];
  if (command === "owner") {
    await provisionOwner(db, {
      slug: process.env.SHOP_SLUG || "miami-auto-care",
      name: process.env.SHOP_NAME || "Miami Auto Care",
      email: process.env.OWNER_EMAIL || "",
      password: process.env.OWNER_PASSWORD || "",
    });
    console.log(
      "Owner provisioned. Any existing sessions for this owner were revoked. Remove OWNER_PASSWORD from the environment after provisioning.",
    );
  } else if (command === "prune") {
    const days = Number(process.env.LEAD_RETENTION_DAYS || 90);
    if (!Number.isInteger(days) || days < 7 || days > 3650)
      throw new Error("Retention must be 7–3650 days.");
    console.log(`Deleted ${prune(db, days)} expired leads.`);
  } else if (command === "backup") {
    if (!process.env.BACKUP_PATH)
      throw new Error(
        "Set BACKUP_PATH to a new backup file outside the public directory.",
      );
    await backupDatabase(db, process.env.BACKUP_PATH);
    console.log(
      "Database snapshot saved. Protect and expire backups separately.",
    );
  } else
    throw new Error(
      "Usage: node --env-file=.env server/manage.mjs owner|prune|backup",
    );
} finally {
  db.close();
}
