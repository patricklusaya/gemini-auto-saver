(function () {
  var url = window.GAS_SITE && window.GAS_SITE.checkoutUrl;
  document.querySelectorAll("[data-checkout]").forEach(function (el) {
    if (url) el.setAttribute("href", url);
    else el.hidden = true;
  });
})();
