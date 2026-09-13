/**
 * Node checks for admin analytics helpers.
 * Run: node test-admin-analytics.js
 */
"use strict";

const assert = require("assert");
const { labelFor, normalizeRange, buildSql } = require("./lib/cloudflare-analytics");
const {
  ratePercent,
  averageSize,
  parseFailureJson,
  aggregateFailures,
  summarizeUsers
} = require("./lib/cloudflare-telemetry");

assert.strictEqual(labelFor("yt01"), "Long YouTube Tutorial");
assert.strictEqual(labelFor("promtfelix01"), "promtfelix01");
assert.strictEqual(labelFor("reddit01"), "reddit01");

assert.strictEqual(normalizeRange("7d"), "7d");
assert.strictEqual(normalizeRange("24h"), "24h");
assert.strictEqual(normalizeRange("nope"), "7d");
assert.ok(buildSql("7d").includes("INTERVAL '7' DAY"));
assert.ok(buildSql("24h").includes("INTERVAL '24' HOUR"));
assert.ok(!buildSql("all").includes("WHERE"));
assert.ok(buildSql("7d").includes("gemini_link_clicks"));
assert.ok(!buildSql("7d").includes("CLOUDFLARE_API_TOKEN"));

assert.strictEqual(ratePercent(3322, 3322 + 159), 95.4);
assert.strictEqual(ratePercent(0, 0), 0);
assert.strictEqual(ratePercent(119, 127), 93.7);
assert.strictEqual(averageSize(3481, 119), 29.3);
assert.strictEqual(averageSize(10, 0), 0);

assert.deepStrictEqual(parseFailureJson(""), {});
assert.deepStrictEqual(parseFailureJson("not-json"), {});
assert.deepStrictEqual(parseFailureJson("{\"generation_timeout\":2,\"evil\":9}"), {
  generation_timeout: 2
});

const failures = aggregateFailures([
  { failures_json: "{\"generation_timeout\":2,\"no_new_image\":1}", weight: 1 },
  { failures_json: "{\"download_failed\":1,\"prompt\":\"secret\"}", weight: 2 }
]);
assert.strictEqual(failures[0].key, "generation_timeout");
assert.strictEqual(failures[0].count, 2);
const download = failures.find(function (row) { return row.key === "download_failed"; });
assert.strictEqual(download.count, 2);
assert.ok(!failures.some(function (row) { return row.key === "evil"; }));
assert.ok(!JSON.stringify(failures).includes("secret"));

const users = summarizeUsers([
  { batch_runs: 1 },
  { batch_runs: 4 },
  { batch_runs: 2 }
]);
assert.strictEqual(users.batchUsers, 3);
assert.strictEqual(users.repeatUsers, 2);

console.log("admin analytics tests passed");
