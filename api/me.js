const { getSessionUser, accountForUser } = require("../lib/auth");
const { findPaidPolarOrder, polarToken } = require("../lib/polar-checkout");
const { recordPaid } = require("../lib/entitlements");
const { send, bearerToken, preflight } = require("../lib/http");

async function syncPolarIfNeeded(user, account) {
  if (account.pro || !polarToken()) return account;
  try {
    const paid = await findPaidPolarOrder({
      email: user.email,
      googleSub: user.google_sub
    });
    if (!paid || !paid.orderId) return account;
    await recordPaid({
      orderId: paid.orderId,
      email: paid.email || user.email,
      source: paid.source
    });
    return accountForUser(user);
  } catch (error) {
    console.error("Polar entitlement sync failed:", error && error.message);
    return account;
  }
}

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
    let account = await accountForUser(user);
    account = await syncPolarIfNeeded(user, account);
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
