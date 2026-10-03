const { getSessionUser, accountForUser } = require("../lib/auth");
const { createPolarCheckout, polarToken } = require("../lib/polar-checkout");
const { send, bearerToken, preflight } = require("../lib/http");

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== "POST") {
    send(req, res, 405, { ok: false, error: "POST only" });
    return;
  }
  if (!polarToken()) {
    send(req, res, 503, { ok: false, error: "Polar API token is not configured." });
    return;
  }

  const token = bearerToken(req);
  if (!token) {
    send(req, res, 401, { ok: false, error: "Sign in required." });
    return;
  }

  try {
    const user = await getSessionUser(token);
    if (!user) {
      send(req, res, 401, { ok: false, error: "Session expired. Sign in again." });
      return;
    }
    const account = await accountForUser(user);
    const url = await createPolarCheckout({
      email: account.email,
      googleSub: account.googleSub
    });
    send(req, res, 200, { ok: true, url, email: account.email });
  } catch (error) {
    console.error("Checkout create failed:", error && error.message);
    send(req, res, 400, {
      ok: false,
      error: error && error.message ? error.message : "Could not start checkout."
    });
  }
};
