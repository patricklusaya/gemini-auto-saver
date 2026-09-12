const SOURCE_LABELS = {
  yt01: "Long YouTube Tutorial",
  yt02: "Short YouTube Tutorial",
  devto: "DEV.to Article"
};

const RANGES = {
  all: "",
  "7d": " WHERE timestamp > NOW() - INTERVAL '7' DAY",
  "30d": " WHERE timestamp > NOW() - INTERVAL '30' DAY"
};

function buildSql(range) {
  const where = RANGES[range] != null ? RANGES[range] : RANGES.all;
  return [
    "SELECT",
    "  blob1 AS source,",
    "  SUM(_sample_interval * double1) AS clicks",
    "FROM gemini_link_clicks",
    where.trim(),
    "GROUP BY blob1",
    "ORDER BY clicks DESC"
  ].filter(Boolean).join("\n");
}

function labelFor(source) {
  const key = String(source || "").trim();
  return SOURCE_LABELS[key] || key || "unknown";
}

function toClicks(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function parseRows(payload) {
  const rows = Array.isArray(payload && payload.data)
    ? payload.data
    : Array.isArray(payload && payload.result)
      ? payload.result
      : [];
  return rows.map(function (row) {
    const source = String(row.source != null ? row.source : row.blob1 || "").trim();
    return {
      source: source || "unknown",
      campaign: labelFor(source),
      clicks: toClicks(row.clicks)
    };
  }).filter(function (row) {
    return Boolean(row.source);
  });
}

function summarize(rows) {
  const bySource = {};
  rows.forEach(function (row) {
    bySource[row.source] = (bySource[row.source] || 0) + row.clicks;
  });
  const listed = Object.keys(SOURCE_LABELS);
  const cards = [
    {
      key: "total",
      label: "Total Clicks",
      clicks: rows.reduce(function (sum, row) { return sum + row.clicks; }, 0)
    }
  ].concat(listed.map(function (key) {
    return {
      key: key,
      label: SOURCE_LABELS[key],
      clicks: bySource[key] || 0
    };
  }));
  return { cards: cards, rows: rows, total: cards[0].clicks };
}

async function queryLinkClicks(range) {
  const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const token = String(process.env.CLOUDFLARE_API_TOKEN || "").trim();
  if (!accountId || !token) {
    const error = new Error("Cloudflare analytics is not configured.");
    error.code = "not_configured";
    throw error;
  }

  const selected = RANGES[range] != null ? range : "all";
  const sql = buildSql(selected);
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/analytics_engine/sql`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain"
    },
    body: sql
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (_error) {
    payload = { raw: true };
  }

  if (!response.ok || (payload && payload.success === false) || payload.error) {
    const detail = payload && (payload.error || (payload.errors && payload.errors[0] && payload.errors[0].message));
    console.error("[admin-analytics] Cloudflare SQL failed", response.status, detail || "no detail");
    const error = new Error("Analytics data is temporarily unavailable.");
    error.code = "upstream";
    throw error;
  }

  const parsed = parseRows(payload);
  const summary = summarize(parsed);
  return {
    range: selected,
    updatedAt: new Date().toISOString(),
    ...summary
  };
}

module.exports = {
  SOURCE_LABELS,
  buildSql,
  queryLinkClicks
};
