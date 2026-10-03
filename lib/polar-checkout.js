const DEFAULT_TEST_LINK = "polar_c_c1Ctp7ptpGoFOGnCkmhTcnSQRmTia68EC7tan1L3IeJ";

function polarApiBase() {
  const explicit = String(process.env.POLAR_API_BASE || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.POLAR_SANDBOX === "false") return "https://api.polar.sh";
  return "https://sandbox-api.polar.sh";
}

function polarToken() {
  return String(process.env.POLAR_ACCESS_TOKEN || "").trim();
}

function polarErrorMessage(body, fallback) {
  const detail = body && body.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (!item) return "";
      if (typeof item === "string") return item;
      return item.msg || item.message || "";
    }).filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  if (body && body.error) return String(body.error);
  if (body && body.message) return String(body.message);
  return fallback || "Polar checkout failed.";
}

async function polarFetch(path, options) {
  const token = polarToken();
  if (!token) throw new Error("POLAR_ACCESS_TOKEN is not configured.");
  const response = await fetch(polarApiBase() + path, {
    method: (options && options.method) || "GET",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: options && options.body ? JSON.stringify(options.body) : undefined
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(polarErrorMessage(body));
  return body;
}

async function resolveProductIds() {
  const checkoutProduct = String(process.env.POLAR_CHECKOUT_PRODUCT_ID || "").trim();
  if (checkoutProduct) return [checkoutProduct];
  const linkId = String(process.env.POLAR_CHECKOUT_LINK_ID || DEFAULT_TEST_LINK).trim();
  const link = await polarFetch("/v1/checkout-links/" + encodeURIComponent(linkId));
  const products = (link.products || [])
    .map((item) => (item && (item.id || item.product_id)) || item)
    .filter(Boolean)
    .map(String);
  if (!products.length) throw new Error("That Polar checkout link has no products.");
  return products;
}

async function findCustomer({ email, googleSub }) {
  if (googleSub) {
    const byExternal = await polarFetch(
      "/v1/customers/?limit=1&external_id=" + encodeURIComponent(googleSub)
    );
    if (byExternal.items && byExternal.items[0]) return byExternal.items[0];
  }
  const byEmail = await polarFetch(
    "/v1/customers/?limit=1&email=" + encodeURIComponent(email)
  );
  return byEmail.items && byEmail.items[0] ? byEmail.items[0] : null;
}

async function upsertPolarCustomer({ email, googleSub }) {
  const existing = await findCustomer({ email, googleSub });
  if (existing && existing.id) {
    if (existing.email !== email || (googleSub && existing.external_id !== googleSub)) {
      return polarFetch("/v1/customers/" + existing.id, {
        method: "PATCH",
        body: {
          email,
          external_id: googleSub || existing.external_id || null
        }
      });
    }
    return existing;
  }
  return polarFetch("/v1/customers/", {
    method: "POST",
    body: {
      email,
      external_id: googleSub || undefined
    }
  });
}

async function createPolarCheckout({ email, googleSub }) {
  const products = await resolveProductIds();
  const customer = await upsertPolarCustomer({ email, googleSub });
  if (!customer || !customer.id) throw new Error("Polar did not create a customer.");
  const site = String(process.env.SITE_URL || "https://www.geminiautosaver.com").replace(/\/$/, "");
  const checkout = await polarFetch("/v1/checkouts/", {
    method: "POST",
    body: {
      products,
      customer_id: customer.id,
      customer_email: email,
      success_url: site + "/thanks?checkout_id={CHECKOUT_ID}",
      metadata: { source: "extension", google_email: email }
    }
  });
  if (!checkout || !checkout.url) throw new Error("Polar did not return a checkout URL.");
  return checkout.url;
}

module.exports = { polarToken, createPolarCheckout };
