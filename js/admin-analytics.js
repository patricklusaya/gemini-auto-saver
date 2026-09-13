(function () {
  var statusEl = document.getElementById("status");
  var cardsEl = document.getElementById("cards");
  var rowsEl = document.getElementById("rows");
  var updatedEl = document.getElementById("updated");
  var rangeEl = document.getElementById("range");
  var refreshEl = document.getElementById("refresh");
  var acquisitionErrorEl = document.getElementById("acquisitionError");
  var productErrorEl = document.getElementById("productError");
  var productCardsEl = document.getElementById("productCards");
  var trendRowsEl = document.getElementById("trendRows");
  var failureRowsEl = document.getElementById("failureRows");
  var versionRowsEl = document.getElementById("versionRows");

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatWhen(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (_error) {
      return iso || "";
    }
  }

  function formatNumber(value) {
    if (value === "—" || value == null || value === "") return "—";
    var n = Number(value);
    if (!Number.isFinite(n)) return escapeHtml(value);
    return n.toLocaleString();
  }

  function cardHtml(card) {
    var shown = card.display != null ? card.display : (card.clicks != null ? card.clicks : card.value);
    var text = card.display != null ? escapeHtml(card.display) : formatNumber(shown);
    return "<article class=\"admin-card\"><span>" + escapeHtml(card.label) + "</span><strong>" + text + "</strong></article>";
  }

  function emptyRow(cols, message) {
    return "<tr><td colspan=\"" + cols + "\" class=\"admin-empty\">" + escapeHtml(message) + "</td></tr>";
  }

  function showError(el, message) {
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = message;
  }

  function renderAcquisition(data) {
    var acquisition = data.acquisition || {
      ok: data.ok,
      cards: data.cards,
      rows: data.rows,
      error: data.error
    };

    if (!acquisition.ok) {
      showError(acquisitionErrorEl, acquisition.error || "Acquisition analytics could not be loaded. Try refreshing.");
      cardsEl.hidden = true;
      rowsEl.innerHTML = emptyRow(3, "Acquisition data is unavailable.");
      return;
    }

    showError(acquisitionErrorEl, "");
    cardsEl.hidden = false;
    cardsEl.innerHTML = (acquisition.cards || data.cards || []).map(cardHtml).join("");

    var rows = acquisition.rows || data.rows || [];
    rowsEl.innerHTML = rows.length
      ? rows.map(function (row) {
        return "<tr><td><code>" + escapeHtml(row.source) + "</code></td><td>" + escapeHtml(row.campaign) + "</td><td>" + formatNumber(row.clicks) + "</td></tr>";
      }).join("")
      : emptyRow(3, "No clicks in this range yet.");
  }

  function renderProduct(product) {
    if (!product || !product.ok) {
      showError(productErrorEl, (product && product.error) || "Product telemetry could not be loaded. Try refreshing.");
      if (productCardsEl) productCardsEl.hidden = true;
      if (trendRowsEl) trendRowsEl.innerHTML = emptyRow(5, "Product telemetry is unavailable.");
      if (failureRowsEl) failureRowsEl.innerHTML = emptyRow(3, "Product telemetry is unavailable.");
      if (versionRowsEl) versionRowsEl.innerHTML = emptyRow(2, "Product telemetry is unavailable.");
      return;
    }

    showError(productErrorEl, "");
    productCardsEl.hidden = false;
    productCardsEl.innerHTML = (product.cards || []).map(cardHtml).join("");

    var trend = product.trend || [];
    trendRowsEl.innerHTML = product.trendAvailable === false
      ? emptyRow(5, "Daily trend could not be loaded.")
      : trend.length
        ? trend.map(function (row) {
          return "<tr><td>" + escapeHtml(row.day) + "</td><td>" + formatNumber(row.batches_started) + "</td><td>" + formatNumber(row.batches_completed) + "</td><td>" + formatNumber(row.successful) + "</td><td>" + formatNumber(row.failed) + "</td></tr>";
        }).join("")
        : emptyRow(5, "No batch activity in this range yet.");

    var failures = product.failures || [];
    failureRowsEl.innerHTML = product.failuresAvailable === false
      ? emptyRow(3, "Failure breakdown could not be loaded.")
      : failures.length
        ? failures.map(function (row) {
          return "<tr><td>" + escapeHtml(row.label) + "</td><td>" + formatNumber(row.count) + "</td><td>" + escapeHtml(Number(row.percent).toFixed(1) + "%") + "</td></tr>";
        }).join("")
        : emptyRow(3, "No failures recorded for this period.");

    var versions = product.versions || [];
    versionRowsEl.innerHTML = product.versionsAvailable === false
      ? emptyRow(2, "Extension versions could not be loaded.")
      : versions.length
        ? versions.map(function (row) {
          return "<tr><td><code>" + escapeHtml(row.version) + "</code></td><td>" + formatNumber(row.batch_runs) + "</td></tr>";
        }).join("")
        : emptyRow(2, "No batch runs in this range yet.");
  }

  async function load() {
    statusEl.hidden = false;
    statusEl.textContent = "Loading…";
    cardsEl.hidden = true;
    if (productCardsEl) productCardsEl.hidden = true;
    var range = rangeEl.value || "7d";
    var response;
    try {
      response = await fetch("/api/admin/analytics?range=" + encodeURIComponent(range), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
    } catch (_error) {
      statusEl.textContent = "Analytics data is temporarily unavailable.";
      return;
    }

    if (response.status === 401) {
      location.replace("/admin");
      return;
    }

    var data;
    try {
      data = await response.json();
    } catch (_error) {
      statusEl.textContent = "Analytics data is temporarily unavailable.";
      return;
    }

    if (!data || !data.ok) {
      statusEl.textContent = (data && data.error) || "Analytics data is temporarily unavailable.";
      rowsEl.innerHTML = emptyRow(3, "No data");
      if (trendRowsEl) trendRowsEl.innerHTML = emptyRow(5, "No data");
      if (failureRowsEl) failureRowsEl.innerHTML = emptyRow(3, "No data");
      if (versionRowsEl) versionRowsEl.innerHTML = emptyRow(2, "No data");
      return;
    }

    statusEl.hidden = true;
    renderAcquisition(data);
    renderProduct(data.product);
    updatedEl.textContent = data.updatedAt ? "Last updated: " + formatWhen(data.updatedAt) : "";
  }

  refreshEl.addEventListener("click", function () {
    load();
  });
  rangeEl.addEventListener("change", function () {
    load();
  });
  load();
})();
