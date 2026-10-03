const { getSessionUser, accountForUser } = require("../lib/auth");
const { consumeFreePrompt, syncFreePrompts } = require("../lib/free-prompts");
const { send, bearerToken, preflight, readJson } = require("../lib/http");

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== "POST") {
    send(req, res, 405, { ok: false, error: "POST only" });
    return;
  }

  const token = bearerToken(req);
  if (!token) {
    send(req, res, 401, { ok: false, error: "Sign in required." });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch (_error) {
    send(req, res, 400, { ok: false, error: "Invalid JSON." });
    return;
  }

  try {
    const user = await getSessionUser(token);
    if (!user) {
      send(req, res, 401, { ok: false, error: "Session expired. Sign in again." });
      return;
    }
    const account = await accountForUser(user);
    if (account.pro) {
      send(req, res, 200, {
        ok: true,
        pro: true,
        freePromptsUsed: account.freePromptsUsed,
        freePromptsLimit: account.freePromptsLimit,
        freePromptsRemaining: account.freePromptsRemaining
      });
      return;
    }
    const usage = body && body.consume
      ? await consumeFreePrompt(user.id)
      : await syncFreePrompts(user.id, body && body.used);
    send(req, res, usage.ok === false ? 403 : 200, {
      ok: usage.ok !== false,
      upgrade: !!usage.upgrade,
      freePromptsUsed: usage.freePromptsUsed,
      freePromptsLimit: usage.freePromptsLimit,
      freePromptsRemaining: usage.freePromptsRemaining
    });
  } catch (error) {
    console.error("POST /api/free-prompt failed:", error && error.message);
    send(req, res, 500, { ok: false, error: "Could not update free prompt usage." });
  }
};
