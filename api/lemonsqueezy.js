const crypto = require("crypto");
const { signProLicense } = require("../lib/sign");
const { sendLicenseEmail } = require("../lib/email");

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function signaturesMatch(rawBody, header, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
  const signature = Buffer.from(header || "", "utf8");
  if (!signature.length || digest.length !== signature.length) return false;
  return crypto.timingSafeEqual(digest, signature);
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    json(res, 200, { ok: true, service: "lemon-squeezy-webhook" });
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { ok: false, error: "POST only" });
    return;
  }

  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    json(res, 500, { ok: false, error: "Webhook secret is not configured." });
    return;
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (error) {
    json(res, 400, { ok: false, error: "Could not read body." });
    return;
  }

  const header = req.headers["x-signature"] || req.headers["X-Signature"];
  if (!signaturesMatch(rawBody, header, secret)) {
    json(res, 400, { ok: false, error: "Invalid signature." });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch (_error) {
    json(res, 400, { ok: false, error: "Invalid JSON." });
    return;
  }

  const eventName = payload && payload.meta && payload.meta.event_name;
  if (eventName !== "order_created") {
    json(res, 200, { ok: true, ignored: true, event: eventName || null });
    return;
  }

  const data = payload.data || {};
  const attrs = data.attributes || {};
  const item = attrs.first_order_item || {};
  const orderId = data.id || attrs.order_number || item.order_id;
  const email = String(attrs.user_email || "").trim();
  const status = String(attrs.status || "").toLowerCase();
  const productId = item.product_id != null ? String(item.product_id) : "";
  const expectedProduct = String(process.env.LEMON_SQUEEZY_PRODUCT_ID || "").trim();

  if (process.env.REQUIRE_LIVE_ORDERS === "true" && attrs.test_mode) {
    json(res, 200, { ok: true, skipped: "test_mode" });
    return;
  }

  if (expectedProduct && productId && productId !== expectedProduct) {
    json(res, 200, { ok: true, skipped: "other_product" });
    return;
  }

  if (status !== "paid") {
    json(res, 200, { ok: true, skipped: "not_paid", status });
    return;
  }

  if (!email || !orderId) {
    json(res, 200, { ok: true, skipped: "missing_email_or_order" });
    return;
  }

  try {
    const licenseKey = signProLicense({ orderId, email });
    await sendLicenseEmail({ to: email, licenseKey, orderId });
    console.log("Issued Pro license for order", String(orderId));
    json(res, 200, { ok: true, emailed: true });
  } catch (error) {
    console.error("License issue failed:", error && error.message);
    json(res, 500, { ok: false, error: "Could not issue license." });
  }
};

module.exports.config = {
  api: {
    bodyParser: false
  }
};
