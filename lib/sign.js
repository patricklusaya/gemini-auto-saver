const { createPrivateKey, sign } = require("crypto");

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function pemFromEnv(value) {
  const pem = String(value || "")
    .replace(/\\n/g, "\n")
    .trim();
  if (!pem.includes("BEGIN") || !pem.includes("PRIVATE KEY")) {
    throw new Error("LICENSE_PRIVATE_KEY must be a PEM private key.");
  }
  return pem;
}

/**
 * Build a GAS1 key the extension can verify locally.
 * Extra fields (order, email) are ignored by the verifier.
 */
function signProLicense({ orderId, email }) {
  const payloadObj = {
    tier: "pro",
    product: "gemini-auto-saver",
    v: 1,
    order: String(orderId),
    email: String(email || "").trim().toLowerCase()
  };
  const payload = Buffer.from(JSON.stringify(payloadObj));
  const privateKey = createPrivateKey(pemFromEnv(process.env.LICENSE_PRIVATE_KEY));
  const signature = sign("sha256", payload, {
    key: privateKey,
    dsaEncoding: "ieee-p1363"
  });
  return `GAS1.${b64url(payload)}.${b64url(signature)}`;
}

module.exports = { signProLicense };
