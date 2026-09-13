const SOURCE_LABELS = {
  yt01: "Long YouTube Tutorial",
  yt02: "Short YouTube Tutorial",
  devto: "DEV.to Article"
};

const RANGE_CLAUSES = {
  "24h": "timestamp > NOW() - INTERVAL '24' HOUR",
  "7d": "timestamp > NOW() - INTERVAL '7' DAY",
  "30d": "timestamp > NOW() - INTERVAL '30' DAY",
  all: ""
};

function normalizeRange(range) {
  return RANGE_CLAUSES[range] != null ? range : "7d";
}

function timeClause(range) {
  return RANGE_CLAUSES[normalizeRange(range)] || "";
}

function timeWhere(range) {
  const clause = timeClause(range);
  return clause ? "WHERE " + clause : "";
}

function timeAnd(range) {
  const clause = timeClause(range);
  return clause ? "AND " + clause : "";
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

function parseEngineRows(payload) {
  const rows = Array.isArray(payload && payload.data)
    ? payload.data
    : Array.isArray(payload && payload.result)
      ? payload.result
      : [];
  return rows;
}

function parseRows(payload) {
  return parseEngineRows(payload).map(function (row) {
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

function buildSql(range) {
  const selected = normalizeRange(range);
  return [
    "SELECT",
    "  blob1 AS source,",
    "  SUM(_sample_interval * double1) AS clicks",
    "FROM gemini_link_clicks",
    timeWhere(selected),
    "GROUP BY blob1",
    "ORDER BY clicks DESC"
  ].filter(Boolean).join("\n");
}

function credentials() {
  const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const token = String(process.env.CLOUDFLARE_API_TOKEN || "").trim();
  if (!accountId || !token) {
    const error = new Error("Cloudflare analytics is not configured.");
    error.code = "not_configured";
    throw error;
  }
  return { accountId: accountId, token: token };
}

async function runSql(sql) {
  const creds = credentials();
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(creds.accountId)}/analytics_engine/sql`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.token}`,
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

  return parseEngineRows(payload);
}

async function queryLinkClicks(range) {
  const selected = normalizeRange(range);
  const parsed = parseRows({ data: await runSql(buildSql(selected)) });
  const summary = summarize(parsed);
  return {
    range: selected,
    updatedAt: new Date().toISOString(),
    ...summary
  };
}

module.exports = {
  SOURCE_LABELS,
  RANGE_CLAUSES,
  normalizeRange,
  timeWhere,
  timeAnd,
  labelFor,
  buildSql,
  runSql,
  queryLinkClicks
};
