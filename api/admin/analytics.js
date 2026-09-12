const { getSession } = require("../../lib/admin-auth");
const { queryLinkClicks } = require("../../lib/cloudflare-analytics");

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    json(res, 405, { ok: false, error: "GET only" });
    return;
  }

  if (!getSession(req)) {
    json(res, 401, { ok: false, error: "Sign in required." });
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const range = url.searchParams.get("range") || "all";

  try {
    const data = await queryLinkClicks(range);
    json(res, 200, {
      ok: true,
      range: data.range,
      updatedAt: data.updatedAt,
      total: data.total,
      cards: data.cards,
      rows: data.rows
    });
  } catch (error) {
    if (error.code === "not_configured") {
      json(res, 503, { ok: false, error: "Analytics is not configured." });
      return;
    }
    json(res, 502, { ok: false, error: "Analytics data is temporarily unavailable." });
  }
};
