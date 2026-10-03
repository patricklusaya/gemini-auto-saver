const { signProLicense } = require("./sign");
const { isConfigured, getSql, ensureSchema, newId } = require("./db");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sourceKey(source) {
  const value = String(source || "").toLowerCase();
  if (value.includes("lemon")) return "lemon";
  if (value.includes("polar")) return "polar";
  return value || "manual";
}

async function recordPaid({ email, orderId, source }) {
  if (!isConfigured()) return { stored: false };
  await ensureSchema();
  const sql = getSql();
  const cleanEmail = normalizeEmail(email);
  const order = String(orderId || "").trim();
  if (!cleanEmail || !order) return { stored: false };
  const existing = await sql`
    SELECT id FROM gas_entitlements WHERE order_id = ${order} LIMIT 1
  `;
  if (existing[0]) {
    await sql`
      UPDATE gas_entitlements
      SET email = ${cleanEmail},
          status = 'active',
          source = ${sourceKey(source)},
          updated_at = now()
      WHERE order_id = ${order}
    `;
    return { stored: true, updated: true };
  }
  await sql`
    INSERT INTO gas_entitlements (id, email, tier, status, source, order_id)
    VALUES (${newId()}, ${cleanEmail}, 'pro', 'active', ${sourceKey(source)}, ${order})
  `;
  return { stored: true, created: true };
}

async function attachGoogleSub(email, googleSub) {
  if (!isConfigured() || !googleSub) return;
  await ensureSchema();
  const sql = getSql();
  await sql`
    UPDATE gas_entitlements
    SET google_sub = ${googleSub}, updated_at = now()
    WHERE lower(email) = ${normalizeEmail(email)}
      AND (google_sub IS NULL OR google_sub = ${googleSub})
  `;
}

async function findActivePro({ email, googleSub }) {
  if (!isConfigured()) return null;
  await ensureSchema();
  const sql = getSql();
  const cleanEmail = normalizeEmail(email);
  const rows = googleSub
    ? await sql`
        SELECT * FROM gas_entitlements
        WHERE status = 'active'
          AND tier = 'pro'
          AND (google_sub = ${googleSub} OR lower(email) = ${cleanEmail})
        ORDER BY created_at DESC
        LIMIT 1
      `
    : await sql`
        SELECT * FROM gas_entitlements
        WHERE status = 'active'
          AND tier = 'pro'
          AND lower(email) = ${cleanEmail}
        ORDER BY created_at DESC
        LIMIT 1
      `;
  return rows[0] || null;
}

function licenseFor(row) {
  if (!row || row.status !== "active" || row.tier !== "pro") return null;
  return signProLicense({
    orderId: row.order_id,
    email: row.email
  });
}

module.exports = { recordPaid, attachGoogleSub, findActivePro, licenseFor, normalizeEmail };
