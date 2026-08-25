import fs from "fs";
import { query } from "./src/db.js";

async function run() {
  console.log("Reading migration file...");
  const sql = fs.readFileSync("../../db/migrations/014_standardize_offices.sql", "utf-8");
  console.log("Applying migration...");
  await query(sql);
  console.log("Migration 014 applied successfully.");
  process.exit(0);
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
