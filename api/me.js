const { getSessionUser, accountForUser } = require("../lib/auth");
const { send, bearerToken, preflight } = require("../lib/http");

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== "GET") {
    send(req, res, 405, { ok: false, error: "GET only" });
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
    send(req, res, 200, {
      ok: true,
      email: account.email,
      googleSub: account.googleSub,
      pro: account.pro,
      licenseKey: account.licenseKey
    });
  } catch (error) {
    console.error("GET /api/me failed:", error && error.message);
    send(req, res, 500, { ok: false, error: "Could not load account." });
  }
};
