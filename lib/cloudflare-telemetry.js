const { normalizeRange, timeWhere, timeAnd, runSql } = require("./cloudflare-analytics");

const FAILURE_KEYS = [
  "generation_timeout",
  "no_new_image",
  "gemini_generation_error",
  "download_failed",
  "download_timeout",
  "tab_closed",
  "page_not_ready",
  "batch_state_error",
  "user_stopped",
  "unknown"
];

const FAILURE_LABELS = {
  generation_timeout: "Generation timeout",
  no_new_image: "No new image",
  gemini_generation_error: "Gemini generation error",
  download_failed: "Download failed",
  download_timeout: "Download timeout",
  tab_closed: "Gemini tab closed",
  page_not_ready: "Page not ready",
  batch_state_error: "Batch state error",
  user_stopped: "User stopped",
  unknown: "Unknown"
};

function toCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function roundCount(value) {
  return Math.round(toCount(value));
}

function ratePercent(numerator, denominator) {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function averageSize(promptsAttempted, batchesCompleted) {
  if (!batchesCompleted || batchesCompleted <= 0) return 0;
  return Math.round((promptsAttempted / batchesCompleted) * 10) / 10;
}

function parseFailureJson(raw) {
  if (!raw || typeof raw !== "string") return {};
  const text = raw.trim();
  if (!text || text === "{}") return {};
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (_error) {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out = {};
  FAILURE_KEYS.forEach(function (key) {
    const n = Number(parsed[key]);
    if (Number.isFinite(n) && n > 0) out[key] = n;
  });
  return out;
}

function aggregateFailures(rows) {
  const totals = {};
  FAILURE_KEYS.forEach(function (key) { totals[key] = 0; });

  (rows || []).forEach(function (row) {
    const weight = toCount(row.weight != null ? row.weight : row._sample_interval);
    const parsed = parseFailureJson(row.failures_json != null ? row.failures_json : row.blob5);
    FAILURE_KEYS.forEach(function (key) {
      if (parsed[key]) totals[key] += parsed[key] * (weight || 1);
    });
  });

  const total = FAILURE_KEYS.reduce(function (sum, key) { return sum + totals[key]; }, 0);
  return FAILURE_KEYS.map(function (key) {
    return {
      key: key,
      label: FAILURE_LABELS[key],
      count: roundCount(totals[key]),
      percent: ratePercent(totals[key], total)
    };
  }).filter(function (row) {
    return row.count > 0;
  }).sort(function (a, b) {
    return b.count - a.count;
  });
}

function summarizeUsers(rows) {
  const list = rows || [];
  let repeat = 0;
  list.forEach(function (row) {
    if (toCount(row.batch_runs) > 1) repeat += 1;
  });
  return {
    batchUsers: list.length,
    repeatUsers: repeat
  };
}

function buildTotalsSql(range) {
  return [
    "SELECT",
    "  blob1 AS event,",
    "  SUM(_sample_interval) AS events,",
    "  SUM(_sample_interval * double1) AS prompt_count,",
    "  SUM(_sample_interval * double2) AS successful,",
    "  SUM(_sample_interval * double3) AS failed,",
    "  SUM(_sample_interval * double5) AS duration_seconds",
    "FROM gemini_extension_telemetry",
    timeWhere(range),
    "GROUP BY blob1"
  ].filter(Boolean).join("\n");
}

function buildUsersSql(range) {
  return [
    "SELECT",
    "  blob2,",
    "  SUM(_sample_interval) AS batch_runs",
    "FROM gemini_extension_telemetry",
    "WHERE blob1 = 'batch_started'",
    timeAnd(range),
    "GROUP BY blob2"
  ].filter(Boolean).join("\n");
}

function buildVersionsSql(range) {
  return [
    "SELECT",
    "  blob3 AS version,",
    "  SUM(_sample_interval) AS batch_runs",
    "FROM gemini_extension_telemetry",
    "WHERE blob1 = 'batch_started'",
    timeAnd(range),
    "GROUP BY blob3",
    "ORDER BY batch_runs DESC"
  ].filter(Boolean).join("\n");
}

function buildFailuresSql(range) {
  return [
    "SELECT",
    "  blob5 AS failures_json,",
    "  SUM(_sample_interval) AS weight",
    "FROM gemini_extension_telemetry",
    "WHERE blob1 IN ('batch_completed', 'batch_stopped')",
    timeAnd(range),
    "GROUP BY blob5"
  ].filter(Boolean).join("\n");
}

function buildSizeSql(range) {
  return [
    "SELECT",
    "  double1 AS prompt_count,",
    "  SUM(_sample_interval) AS batches",
    "FROM gemini_extension_telemetry",
    "WHERE blob1 = 'batch_started'",
    timeAnd(range),
    "GROUP BY double1",
    "ORDER BY prompt_count ASC"
  ].filter(Boolean).join("\n");
}

function sizeBucket(count) {
  const n = roundCount(count);
  if (n <= 1) return { key: "1", label: "1 prompt" };
  if (n === 2) return { key: "2", label: "2 prompts" };
  if (n === 3) return { key: "3", label: "3 prompts" };
  if (n <= 6) return { key: "4-6", label: "4–6 prompts" };
  if (n <= 10) return { key: "7-10", label: "7–10 prompts" };
  if (n <= 20) return { key: "11-20", label: "11–20 prompts" };
  return { key: "21+", label: "21+ prompts" };
}

function parseSizeHistogram(rows) {
  const order = ["1", "2", "3", "4-6", "7-10", "11-20", "21+"];
  const labels = {
    "1": "1 prompt",
    "2": "2 prompts",
    "3": "3 prompts",
    "4-6": "4–6 prompts",
    "7-10": "7–10 prompts",
    "11-20": "11–20 prompts",
    "21+": "21+ prompts"
  };
  const buckets = {};
  order.forEach(function (key) {
    buckets[key] = { key: key, label: labels[key], batches: 0 };
  });

  let total = 0;
  let overThree = 0;
  const exact = [];
  (rows || []).forEach(function (row) {
    const count = roundCount(row.prompt_count != null ? row.prompt_count : row.double1);
    const batches = roundCount(row.batches);
    if (batches <= 0) return;
    total += batches;
    if (count > 3) overThree += batches;
    exact.push({ prompt_count: count, batches: batches });
    const bucket = sizeBucket(count);
    buckets[bucket.key].batches += batches;
  });

  exact.sort(function (a, b) { return a.prompt_count - b.prompt_count; });
  let walked = 0;
  let median = 0;
  const midpoint = total / 2;
  exact.forEach(function (row) {
    if (median) return;
    walked += row.batches;
    if (walked >= midpoint) median = row.prompt_count;
  });

  return {
    rows: order.map(function (key) {
      return {
        key: key,
        label: buckets[key].label,
        batches: buckets[key].batches,
        percent: ratePercent(buckets[key].batches, total)
      };
    }).filter(function (row) {
      return row.batches > 0;
    }),
    total: total,
    median: median,
    overThree: overThree,
    overThreePercent: ratePercent(overThree, total)
  };
}

function buildTrendSql(range) {
  return [
    "SELECT",
    "  formatDateTime(timestamp, '%Y-%m-%d') AS day,",
    "  blob1 AS event,",
    "  SUM(_sample_interval) AS events,",
    "  SUM(_sample_interval * double2) AS successful,",
    "  SUM(_sample_interval * double3) AS failed",
    "FROM gemini_extension_telemetry",
    timeWhere(range),
    "GROUP BY day, event",
    "ORDER BY day ASC"
  ].filter(Boolean).join("\n");
}

function emptyTotals() {
  return {
    batches_started: 0,
    batches_completed: 0,
    batches_stopped: 0,
    batches_interrupted: 0,
    prompts_attempted: 0,
    successful: 0,
    failed: 0,
    total_duration_seconds: 0
  };
}

function readTotals(rows) {
  const totals = emptyTotals();
  (rows || []).forEach(function (row) {
    const event = String(row.event != null ? row.event : row.blob1 || "");
    const events = roundCount(row.events);
    if (event === "batch_started") totals.batches_started += events;
    if (event === "batch_completed") {
      totals.batches_completed += events;
      totals.prompts_attempted += roundCount(row.prompt_count);
      totals.successful += roundCount(row.successful);
      totals.failed += roundCount(row.failed);
      totals.total_duration_seconds += roundCount(row.duration_seconds);
    }
    if (event === "batch_stopped") totals.batches_stopped += events;
    if (event === "batch_interrupted") totals.batches_interrupted += events;
  });
  return totals;
}

function productCards(totals, users) {
  const successDenom = totals.successful + totals.failed;
  const successRate = ratePercent(totals.successful, successDenom);
  const completionRate = ratePercent(totals.batches_completed, totals.batches_started);
  const avg = averageSize(totals.prompts_attempted, totals.batches_completed);

  return [
    { key: "batch_users", label: "Batch Users", value: users.batchUsers },
    { key: "repeat_users", label: "Repeat Batch Users", value: users.repeatUsers },
    { key: "batches_started", label: "Batches Started", value: totals.batches_started },
    { key: "batches_completed", label: "Batches Completed", value: totals.batches_completed },
    { key: "completion_rate", label: "Completion Rate", value: completionRate, display: completionRate.toFixed(1) + "%" },
    { key: "avg_batch_size", label: "Avg Batch Size", value: avg, display: avg.toFixed(1) },
    { key: "median_batch_size", label: "Median Batch Size", value: users.medianSize == null ? "—" : users.medianSize },
    { key: "over_three", label: "Batches larger than 3", value: users.overThreePercent == null ? "—" : users.overThreePercent, display: users.overThreePercent == null ? "—" : Number(users.overThreePercent).toFixed(1) + "%" },
    { key: "prompts_attempted", label: "Prompts Attempted", value: totals.prompts_attempted },
    { key: "successful", label: "Successful", value: totals.successful },
    { key: "failed", label: "Failed", value: totals.failed },
    { key: "success_rate", label: "Success Rate", value: successRate, display: successRate.toFixed(1) + "%" }
  ];
}

function formatDay(value) {
  if (!value) return "";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toISOString().slice(0, 10);
}

function parseTrend(rows) {
  const byDay = {};
  (rows || []).forEach(function (row) {
    const day = formatDay(row.day != null ? row.day : row.t);
    if (!day) return;
    if (!byDay[day]) {
      byDay[day] = {
        day: day,
        batches_started: 0,
        batches_completed: 0,
        successful: 0,
        failed: 0
      };
    }
    const event = String(row.event != null ? row.event : row.blob1 || "");
    const events = roundCount(row.events);
    if (event === "batch_started") byDay[day].batches_started += events;
    if (event === "batch_completed") {
      byDay[day].batches_completed += events;
      byDay[day].successful += roundCount(row.successful);
      byDay[day].failed += roundCount(row.failed);
    }
  });
  return Object.keys(byDay).sort().map(function (day) {
    return byDay[day];
  });
}

function parseVersions(rows) {
  return (rows || []).map(function (row) {
    const version = String(row.version != null ? row.version : row.blob3 || "").trim() || "unknown";
    return {
      version: version,
      batch_runs: roundCount(row.batch_runs)
    };
  }).filter(function (row) {
    return row.batch_runs > 0;
  });
}

async function settledRows(sql) {
  try {
    return { ok: true, rows: await runSql(sql) };
  } catch (error) {
    if (error.code === "not_configured") throw error;
    return { ok: false, rows: [] };
  }
}

async function loadTrend(range) {
  const primary = await settledRows(buildTrendSql(range));
  if (primary.ok) return primary;
  return settledRows([
    "SELECT",
    "  toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day,",
    "  blob1 AS event,",
    "  SUM(_sample_interval) AS events,",
    "  SUM(_sample_interval * double2) AS successful,",
    "  SUM(_sample_interval * double3) AS failed",
    "FROM gemini_extension_telemetry",
    timeWhere(range),
    "GROUP BY day, blob1",
    "ORDER BY day ASC"
  ].filter(Boolean).join("\n"));
}

async function queryProductTelemetry(range) {
  const selected = normalizeRange(range);
  const totalsResult = await settledRows(buildTotalsSql(selected));
  if (!totalsResult.ok) {
    const error = new Error("Product telemetry could not be loaded. Try refreshing.");
    error.code = "upstream";
    throw error;
  }

  const [usersResult, versionsResult, failuresResult, trendResult, sizeResult] = await Promise.all([
    settledRows(buildUsersSql(selected)),
    settledRows(buildVersionsSql(selected)),
    settledRows(buildFailuresSql(selected)),
    loadTrend(selected),
    settledRows(buildSizeSql(selected))
  ]);

  const totals = readTotals(totalsResult.rows);
  const users = usersResult.ok ? summarizeUsers(usersResult.rows) : { batchUsers: null, repeatUsers: null };
  const sizes = sizeResult.ok ? parseSizeHistogram(sizeResult.rows) : { rows: [], total: 0, median: 0, overThree: 0, overThreePercent: 0 };
  const cards = productCards(totals, {
    batchUsers: users.batchUsers == null ? "—" : users.batchUsers,
    repeatUsers: users.repeatUsers == null ? "—" : users.repeatUsers,
    medianSize: sizeResult.ok ? sizes.median : null,
    overThreePercent: sizeResult.ok ? sizes.overThreePercent : null
  });

  return {
    range: selected,
    updatedAt: new Date().toISOString(),
    totals: totals,
    cards: cards,
    failures: failuresResult.ok ? aggregateFailures(failuresResult.rows) : [],
    versions: versionsResult.ok ? parseVersions(versionsResult.rows) : [],
    trend: trendResult.ok ? parseTrend(trendResult.rows) : [],
    sizes: sizes,
    usersAvailable: usersResult.ok,
    failuresAvailable: failuresResult.ok,
    versionsAvailable: versionsResult.ok,
    trendAvailable: trendResult.ok,
    sizesAvailable: sizeResult.ok
  };
}

module.exports = {
  FAILURE_KEYS,
  FAILURE_LABELS,
  ratePercent,
  averageSize,
  parseFailureJson,
  aggregateFailures,
  summarizeUsers,
  productCards,
  readTotals,
  parseSizeHistogram,
  queryProductTelemetry
};
