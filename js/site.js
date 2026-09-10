(function () {
  var cfg = window.GAS_SITE || {};
  var mors = cfg.mors || {};
  var preferred = mors[cfg.defaultMor] && mors[cfg.defaultMor].checkoutUrl;
  var url = preferred || "";
  if (!url) {
    Object.keys(mors).forEach(function (id) {
      if (!url && mors[id] && mors[id].checkoutUrl) url = mors[id].checkoutUrl;
    });
  }
  document.querySelectorAll("[data-checkout]").forEach(function (el) {
    if (url) el.setAttribute("href", url);
    else el.hidden = true;
  });
})();
