const crypto = require("crypto");

function header(headers, name) {
  if (!headers) return "";
  return headers[name] || headers[name.toLowerCase()] || "";
}

function timingEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (!left.length || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function secretToStandardKey(secret) {
  const value = String(secret || "").trim();
  if (value.startsWith("whsec_")) {
    return Buffer.from(value.slice("whsec_".length), "base64");
  }
  return Buffer.from(value, "utf8");
}

function standardWebhookOk(rawBody, headers, secret) {
  const id = header(headers, "webhook-id");
  const timestamp = header(headers, "webhook-timestamp");
  const signatures = header(headers, "webhook-signature");
  if (!id || !timestamp || !signatures) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 5 * 60) return false;

  const body = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
  const signed = `${id}.${timestamp}.${body}`;
  const expected = crypto
    .createHmac("sha256", secretToStandardKey(secret))
    .update(signed)
    .digest("base64");
  const expectedHeader = `v1,${expected}`;
  return signatures.split(/\s+/).some((part) => timingEqual(part, expectedHeader));
}

function polarHmacOk(rawBody, headers, secret) {
  const signatures = header(headers, "webhook-signature");
  if (!signatures) return false;
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody));
  const digest = crypto.createHmac("sha256", String(secret || "")).update(body).digest("hex");
  return signatures.split(/\s+/).some((part) => {
    const token = part.includes(",") ? part.split(",")[1] : part;
    return timingEqual(token, digest) || timingEqual(part, digest);
  });
}

function verifyPolarWebhook(rawBody, headers, secret) {
  if (!secret) return false;
  return standardWebhookOk(rawBody, headers, secret) || polarHmacOk(rawBody, headers, secret);
}

module.exports = { verifyPolarWebhook };
