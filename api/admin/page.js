const fs = require("fs");
const path = require("path");
const { getSession } = require("../../lib/admin-auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (!getSession(req)) {
    res.statusCode = 302;
    res.setHeader("Location", "/admin");
    res.end();
    return;
  }

  const file = path.join(__dirname, "..", "..", "lib", "admin-analytics-page.html");
  let html;
  try {
    html = fs.readFileSync(file, "utf8");
  } catch (error) {
    console.error("[admin-analytics] Missing analytics page template", error.message);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Analytics page is temporarily unavailable.");
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
};
