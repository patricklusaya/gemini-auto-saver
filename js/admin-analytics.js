(function () {
  var statusEl = document.getElementById("status");
  var cardsEl = document.getElementById("cards");
  var rowsEl = document.getElementById("rows");
  var updatedEl = document.getElementById("updated");
  var rangeEl = document.getElementById("range");
  var refreshEl = document.getElementById("refresh");

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

  async function load() {
    statusEl.hidden = false;
    statusEl.textContent = "Loading…";
    cardsEl.hidden = true;
    var range = rangeEl.value || "all";
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
      rowsEl.innerHTML = "<tr><td colspan=\"3\" class=\"admin-empty\">No data</td></tr>";
      return;
    }

    statusEl.hidden = true;
    cardsEl.hidden = false;
    cardsEl.innerHTML = (data.cards || []).map(function (card) {
      return "<article class=\"admin-card\"><span>" + escapeHtml(card.label) + "</span><strong>" + escapeHtml(card.clicks) + "</strong></article>";
    }).join("");

    var rows = data.rows || [];
    rowsEl.innerHTML = rows.length
      ? rows.map(function (row) {
        return "<tr><td><code>" + escapeHtml(row.source) + "</code></td><td>" + escapeHtml(row.campaign) + "</td><td>" + escapeHtml(row.clicks) + "</td></tr>";
      }).join("")
      : "<tr><td colspan=\"3\" class=\"admin-empty\">No clicks in this range yet.</td></tr>";

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
