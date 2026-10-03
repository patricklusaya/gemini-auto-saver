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
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

loadLocalEnv();
const { ensureSchema, isConfigured } = require("../lib/db");

ensureSchema()
  .then((ok) => {
    if (!isConfigured()) {
      console.error("DATABASE_URL missing");
      process.exit(1);
    }
    console.log(ok ? "schema ready" : "schema skipped");
  })
  .catch((error) => {
    console.error("migrate failed:", error.message || error);
    process.exit(1);
  });
