const { issuePaidLicense } = require("../lib/issue");
const { verifyPolarWebhook } = require("../lib/polar-signature");

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    json(res, 200, { ok: true, service: "polar-webhook" });
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { ok: false, error: "POST only" });
    return;
  }

  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    json(res, 500, { ok: false, error: "Webhook secret is not configured." });
    return;
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (_error) {
    json(res, 400, { ok: false, error: "Could not read body." });
    return;
  }

  if (!verifyPolarWebhook(rawBody, req.headers, secret)) {
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

  const eventName = payload && payload.type;
  if (eventName !== "order.paid") {
    json(res, 200, { ok: true, ignored: true, event: eventName || null });
    return;
  }

  const data = payload.data || {};
  const customer = data.customer || {};
  const orderId = data.id || data.number;
  const email = String(customer.email || data.email || "").trim();
  const status = String(data.status || "").toLowerCase();
  const reason = String(data.billing_reason || "purchase");
  const productId = data.product_id != null
    ? String(data.product_id)
    : data.product && data.product.id != null
      ? String(data.product.id)
      : "";
  const expectedProduct = String(process.env.POLAR_PRODUCT_ID || "").trim();

  if (expectedProduct && productId && productId !== expectedProduct) {
    json(res, 200, { ok: true, skipped: "other_product" });
    return;
  }

  if (reason && reason !== "purchase") {
    json(res, 200, { ok: true, skipped: "not_purchase", reason });
    return;
  }

  if (status && status !== "paid") {
    json(res, 200, { ok: true, skipped: "not_paid", status });
    return;
  }

  if (!email || !orderId) {
    json(res, 200, { ok: true, skipped: "missing_email_or_order" });
    return;
  }

  try {
    await issuePaidLicense({
      orderId,
      email,
      source: "Polar"
    });
    console.log("Issued Pro license for Polar order", String(orderId));
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
