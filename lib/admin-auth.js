const crypto = require("crypto");

const COOKIE_NAME = "gas_admin_session";
const TTL_MS = 24 * 60 * 60 * 1000;

function adminPassword() {
  return String(process.env.ADMIN_ANALYTICS_PASSWORD || "").trim();
}

function hmacSecret() {
  return adminPassword();
}

function isSecureRequest(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  return proto === "https" || process.env.VERCEL_ENV === "production";
}

function passwordsMatch(provided, expected) {
  const a = Buffer.from(String(provided || ""), "utf8");
  const b = Buffer.from(String(expected || ""), "utf8");
  const len = Math.max(a.length, b.length, 1);
  const aa = Buffer.alloc(len);
  const bb = Buffer.alloc(len);
  a.copy(aa);
  b.copy(bb);
  const sameBytes = crypto.timingSafeEqual(aa, bb);
  return Boolean(expected) && a.length === b.length && sameBytes;
}

function signSession() {
  const secret = hmacSecret();
  if (!secret) throw new Error("ADMIN_ANALYTICS_PASSWORD is not set.");
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    iat: Date.now(),
    exp: Date.now() + TTL_MS
  })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifySession(token) {
  const secret = hmacSecret();
  if (!secret || !token) return null;
  const parts = String(token).split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch (_error) {
    return null;
  }
  if (!data || data.v !== 1 || typeof data.exp !== "number" || data.exp < Date.now()) return null;
  return data;
}

function readCookie(req, name) {
  const header = String(req.headers.cookie || "");
  const parts = header.split(";");
  for (let i = 0; i < parts.length; i += 1) {
    const piece = parts[i].trim();
    const eq = piece.indexOf("=");
    if (eq === -1) continue;
    if (piece.slice(0, eq) === name) return decodeURIComponent(piece.slice(eq + 1));
  }
  return "";
}

function cookieHeader(value, req, maxAgeSec) {
  const parts = [
    `${COOKIE_NAME}=${value}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Strict",
    `Max-Age=${maxAgeSec}`
  ];
  if (isSecureRequest(req)) parts.push("Secure");
  return parts.join("; ");
}

function setSessionCookie(req, res, token) {
  res.setHeader("Set-Cookie", cookieHeader(encodeURIComponent(token), req, Math.floor(TTL_MS / 1000)));
}

function clearSessionCookie(req, res) {
  res.setHeader("Set-Cookie", cookieHeader("", req, 0));
}

function getSession(req) {
  return verifySession(readCookie(req, COOKIE_NAME));
}

module.exports = {
  COOKIE_NAME,
  adminPassword,
  passwordsMatch,
  signSession,
  getSession,
  setSessionCookie,
  clearSessionCookie
};
