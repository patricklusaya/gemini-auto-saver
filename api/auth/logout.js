const { deleteSession } = require("../../lib/auth");
const { send, bearerToken, preflight } = require("../../lib/http");

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== "POST") {
    send(req, res, 405, { ok: false, error: "POST only" });
    return;
  }
  try {
    await deleteSession(bearerToken(req));
    send(req, res, 200, { ok: true });
  } catch (error) {
    console.error("Logout failed:", error && error.message);
    send(req, res, 200, { ok: true });
  }
};
