const crypto = require("crypto");
const { isConfigured, getSql, ensureSchema, newId } = require("./db");
const { attachGoogleSub, findActivePro, licenseFor, normalizeEmail } = require("./entitlements");

const SESSION_DAYS = 180;

function googleClientId() {
  return String(process.env.GOOGLE_CLIENT_ID || "").trim();
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function assertGoogleAudience(payload) {
  const clientId = googleClientId();
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not configured.");
  const audience = String(payload.aud || payload.azp || "").trim();
  if (audience !== clientId) throw new Error("This Google sign-in is for a different app.");
}

function identityFromPayload(payload) {
  if (payload.email_verified !== "true" && payload.email_verified !== true) {
    throw new Error("That Google email is not verified.");
  }
  const email = normalizeEmail(payload.email);
  const sub = String(payload.sub || "").trim();
  if (!email || !sub) throw new Error("Google did not return an email.");
  return { email, googleSub: sub };
}

async function verifyGoogleIdToken(idToken) {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  if (!response.ok) throw new Error("Google could not verify that sign-in.");
  const payload = await response.json();
  assertGoogleAudience(payload);
  return identityFromPayload(payload);
}

async function verifyGoogleAccessToken(accessToken) {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!response.ok) throw new Error("Google could not verify that sign-in.");
  const payload = await response.json();
  assertGoogleAudience(payload);
  if (payload.email && payload.sub) return identityFromPayload(payload);
  const profile = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: "Bearer " + accessToken }
  });
  if (!profile.ok) throw new Error("Google did not return an email.");
  const user = await profile.json();
  return identityFromPayload({
    email: user.email,
    email_verified: user.email_verified,
    sub: user.sub
  });
}

async function verifyGoogleCredential({ idToken, accessToken }) {
  if (idToken) return verifyGoogleIdToken(idToken);
  if (accessToken) return verifyGoogleAccessToken(accessToken);
  throw new Error("Missing Google sign-in token.");
}

async function upsertUser({ email, googleSub }) {
  await ensureSchema();
  const sql = getSql();
  const existing = await sql`SELECT * FROM gas_users WHERE google_sub = ${googleSub} LIMIT 1`;
  if (existing[0]) {
    if (existing[0].email !== email) {
      await sql`UPDATE gas_users SET email = ${email} WHERE id = ${existing[0].id}`;
      existing[0].email = email;
    }
    return existing[0];
  }
  const user = { id: newId(), google_sub: googleSub, email };
  await sql`
    INSERT INTO gas_users (id, google_sub, email)
    VALUES (${user.id}, ${user.google_sub}, ${user.email})
  `;
  return user;
}

async function createSession(userId) {
  await ensureSchema();
  const sql = getSql();
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await sql`
    INSERT INTO gas_sessions (token_hash, user_id, expires_at)
    VALUES (${hashToken(token)}, ${userId}, ${expires.toISOString()})
  `;
  return token;
}

async function getSessionUser(token) {
  if (!token || !isConfigured()) return null;
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT u.id, u.google_sub, u.email
    FROM gas_sessions s
    JOIN gas_users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashToken(token)}
      AND s.expires_at > now()
    LIMIT 1
  `;
  return rows[0] || null;
}

async function deleteSession(token) {
  if (!token || !isConfigured()) return;
  await ensureSchema();
  const sql = getSql();
  await sql`DELETE FROM gas_sessions WHERE token_hash = ${hashToken(token)}`;
}

async function accountForUser(user) {
  await attachGoogleSub(user.email, user.google_sub);
  const entitlement = await findActivePro({
    email: user.email,
    googleSub: user.google_sub
  });
  const pro = !!(entitlement && entitlement.status === "active");
  return {
    email: user.email,
    googleSub: user.google_sub,
    pro,
    licenseKey: pro ? licenseFor(entitlement) : null
  };
}

async function signInWithGoogle(credential) {
  if (!isConfigured()) throw new Error("DATABASE_URL is not configured.");
  const identity = await verifyGoogleCredential(
    typeof credential === "string" ? { idToken: credential } : credential || {}
  );
  const user = await upsertUser(identity);
  const token = await createSession(user.id);
  const account = await accountForUser(user);
  return { token, ...account };
}

module.exports = {
  googleClientId,
  signInWithGoogle,
  getSessionUser,
  deleteSession,
  accountForUser
};
