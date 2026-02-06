import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { pool } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function init() {
  const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL or DATABASE_PUBLIC_URL is required. Set it in .env or Railway.");
    process.exit(1);
  }
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  console.log("Schema applied successfully.");
  await pool.end();
}

init().catch((err) => {
  console.error(err);
  process.exit(1);
});
