const { getSession } = require("../../lib/admin-auth");
const { normalizeRange, queryLinkClicks } = require("../../lib/cloudflare-analytics");
const { queryProductTelemetry } = require("../../lib/cloudflare-telemetry");

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function safeError(error, fallback) {
  if (error && error.code === "not_configured") return "Analytics is not configured.";
  return fallback;
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
  const range = normalizeRange(url.searchParams.get("range") || "7d");

  const acquisition = await queryLinkClicks(range).then(function (data) {
    return {
      ok: true,
      range: data.range,
      total: data.total,
      cards: data.cards,
      rows: data.rows
    };
  }).catch(function (error) {
    return {
      ok: false,
      error: safeError(error, "Acquisition analytics could not be loaded. Try refreshing.")
    };
  });

  const product = await queryProductTelemetry(range).then(function (data) {
    return {
      ok: true,
      range: data.range,
      cards: data.cards,
      failures: data.failures,
      versions: data.versions,
      trend: data.trend,
      usersAvailable: data.usersAvailable,
      failuresAvailable: data.failuresAvailable,
      versionsAvailable: data.versionsAvailable,
      trendAvailable: data.trendAvailable
    };
  }).catch(function (error) {
    return {
      ok: false,
      error: safeError(error, "Product telemetry could not be loaded. Try refreshing.")
    };
  });

  if (!acquisition.ok && !product.ok && /not configured/i.test(acquisition.error || "")) {
    json(res, 503, { ok: false, error: "Analytics is not configured." });
    return;
  }

  json(res, 200, {
    ok: true,
    range: range,
    updatedAt: new Date().toISOString(),
    total: acquisition.ok ? acquisition.total : 0,
    cards: acquisition.ok ? acquisition.cards : [],
    rows: acquisition.ok ? acquisition.rows : [],
    acquisition: acquisition,
    product: product
  });
};
