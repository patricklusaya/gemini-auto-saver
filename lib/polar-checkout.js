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
  if (!response.ok) {
    const detail = body && (body.detail || body.error || body.message);
    throw new Error(typeof detail === "string" ? detail : "Polar checkout failed.");
  }
  return body;
}

async function resolveProductIds() {
  const direct = String(process.env.POLAR_PRODUCT_ID || "").trim();
  if (direct) return [direct];
  const linkId = String(process.env.POLAR_CHECKOUT_LINK_ID || DEFAULT_TEST_LINK).trim();
  const link = await polarFetch("/v1/checkout-links/" + encodeURIComponent(linkId));
  const products = (link.products || [])
    .map((item) => (item && (item.id || item.product_id)) || item)
    .filter(Boolean)
    .map(String);
  if (!products.length) throw new Error("That Polar checkout link has no products.");
  return products;
}

async function createPolarCheckout({ email, googleSub }) {
  const products = await resolveProductIds();
  const site = String(process.env.SITE_URL || "https://www.geminiautosaver.com").replace(/\/$/, "");
  const payload = {
    products,
    customer_email: email,
    success_url: site + "/thanks?checkout_id={CHECKOUT_ID}",
    metadata: { source: "extension", google_email: email }
  };
  if (googleSub) payload.external_customer_id = String(googleSub);
  const checkout = await polarFetch("/v1/checkouts/", {
    method: "POST",
    body: payload
  });
  if (!checkout || !checkout.url) throw new Error("Polar did not return a checkout URL.");
  return checkout.url;
}

module.exports = { polarToken, createPolarCheckout };
