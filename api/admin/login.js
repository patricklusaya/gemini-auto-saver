const { adminPassword, passwordsMatch, signSession, setSessionCookie } = require("../../lib/admin-auth");

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") {
    if ((req.headers["content-type"] || "").includes("application/json")) {
      return JSON.parse(req.body || "{}");
    }
    return Object.fromEntries(new URLSearchParams(req.body));
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString("utf8");
  if ((req.headers["content-type"] || "").includes("application/json")) {
    return JSON.parse(text || "{}");
  }
  return Object.fromEntries(new URLSearchParams(text));
}

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.setHeader("Cache-Control", "no-store");
  res.end();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    res.end("POST only");
    return;
  }

  const expected = adminPassword();
  if (!expected) {
    console.error("[admin-auth] ADMIN_ANALYTICS_PASSWORD is not set.");
    redirect(res, "/admin?error=config");
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch (_error) {
    redirect(res, "/admin?error=1");
    return;
  }

  const provided = body.password != null ? body.password : body.Password;
  if (!passwordsMatch(provided, expected)) {
    redirect(res, "/admin?error=1");
    return;
  }

  try {
    setSessionCookie(req, res, signSession());
    redirect(res, "/admin/analytics");
  } catch (error) {
    console.error("[admin-auth] Could not create session", error.message);
    redirect(res, "/admin?error=config");
  }
};
