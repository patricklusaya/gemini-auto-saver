const { signInWithGoogle, googleClientId } = require("../../lib/auth");
const { isConfigured } = require("../../lib/db");
const { send, readJson, preflight } = require("../../lib/http");

module.exports = async function handler(req, res) {
  if (preflight(req, res)) return;

  if (req.method === "GET") {
    send(req, res, 200, {
      ok: true,
      googleConfigured: !!googleClientId(),
      databaseConfigured: isConfigured()
    });
    return;
  }

  if (req.method !== "POST") {
    send(req, res, 405, { ok: false, error: "POST only" });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch (_error) {
    send(req, res, 400, { ok: false, error: "Invalid JSON." });
    return;
  }

  const idToken = String((body && body.idToken) || "").trim();
  const accessToken = String((body && body.accessToken) || "").trim();
  if (!idToken && !accessToken) {
    send(req, res, 400, { ok: false, error: "Missing Google sign-in token." });
    return;
  }

  try {
    const account = await signInWithGoogle({ idToken, accessToken });
    send(req, res, 200, {
      ok: true,
      token: account.token,
      email: account.email,
      googleSub: account.googleSub,
      pro: account.pro,
      licenseKey: account.licenseKey,
      freePromptsUsed: account.freePromptsUsed,
      freePromptsLimit: account.freePromptsLimit,
      freePromptsRemaining: account.freePromptsRemaining
    });
  } catch (error) {
    console.error("Google sign-in failed:", error && error.message);
    send(req, res, 400, {
      ok: false,
      error: error && error.message ? error.message : "Could not sign in with Google."
    });
  }
};
