const { clearSessionCookie } = require("../../lib/admin-auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, POST");
    res.end("Method not allowed");
    return;
  }
  clearSessionCookie(req, res);
  res.statusCode = 302;
  res.setHeader("Location", "/admin");
  res.setHeader("Cache-Control", "no-store");
  res.end();
};
