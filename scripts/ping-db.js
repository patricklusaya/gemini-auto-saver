const fs = require("fs");
const path = require("path");

function loadLocalEnv() {
  const file = path.join(__dirname, "..", ".env.local");
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadLocalEnv();
const { neon } = require("@neondatabase/serverless");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }
  const sql = neon(url);
  const rows = await sql`select current_database() as db, now() as now`;
  console.log("connected", rows[0].db, String(rows[0].now));
}

main().catch((error) => {
  console.error("db ping failed:", error.message || error);
  process.exit(1);
});
