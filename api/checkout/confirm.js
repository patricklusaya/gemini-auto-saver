const { confirmPolarCheckout, polarToken } = require("../../lib/polar-checkout");
const { issuePaidLicense } = require("../../lib/issue");
const { send, preflight } = require("../../lib/http");

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== "GET" && req.method !== "POST") {
    send(req, res, 405, { ok: false, error: "GET or POST only" });
    return;
  }
  if (!polarToken()) {
    send(req, res, 503, { ok: false, error: "Polar API token is not configured." });
    return;
  }

  const url = new URL(req.url, "https://www.geminiautosaver.com");
  let checkoutId = String(url.searchParams.get("checkout_id") || "").trim();
  if (!checkoutId && req.method === "POST") {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      checkoutId = String(body.checkout_id || "").trim();
    } catch (_error) {
      send(req, res, 400, { ok: false, error: "Invalid JSON." });
      return;
    }
  }
  if (!checkoutId) {
    send(req, res, 400, { ok: false, error: "Missing checkout_id." });
    return;
  }

  try {
    const result = await confirmPolarCheckout(checkoutId);
    if (!result.paid) {
      send(req, res, 200, { ok: true, paid: false, status: result.status || null });
      return;
    }
    await issuePaidLicense({
      orderId: result.orderId,
      email: result.email,
      source: result.source
    });
    send(req, res, 200, { ok: true, paid: true, email: result.email });
  } catch (error) {
    console.error("Checkout confirm failed:", error && error.message);
    send(req, res, 400, {
      ok: false,
      error: error && error.message ? error.message : "Could not confirm Polar checkout."
    });
  }
};
