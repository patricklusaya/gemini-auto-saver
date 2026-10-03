const WEB_ORIGINS = [
  "https://www.geminiautosaver.com",
  "https://geminiautosaver.com",
  "https://gemini-auto-saver.vercel.app"
];

function allowOrigin(req) {
  const origin = String(req.headers.origin || "").trim();
  if (!origin) return "";
  if (WEB_ORIGINS.includes(origin)) return origin;
  if (origin.startsWith("chrome-extension://")) return origin;
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return origin;
  return "";
}

function setCors(req, res) {
  const origin = allowOrigin(req);
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function send(req, res, status, body) {
  setCors(req, res);
  json(res, status, body);
}

function readJson(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body);
  }
  if (typeof req.body === "string") {
    return Promise.resolve(JSON.parse(req.body || "{}"));
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function bearerToken(req) {
  const header = String(req.headers.authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function preflight(req, res) {
  if (req.method !== "OPTIONS") return false;
  setCors(req, res);
  res.statusCode = 204;
  res.end();
  return true;
}

module.exports = { setCors, json, send, readJson, bearerToken, preflight };
