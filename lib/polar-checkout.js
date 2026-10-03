const DEFAULT_TEST_LINK = "polar_cl_ntol2dKiRlYWabgQY2kXe4cF0NkBZ03XSpF8M0RMI0B";
const DEFAULT_TEST_PRODUCT = "ec66c91f-852a-493f-b081-1ea10f8fe50a";

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

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function collectUuids(node, found) {
  if (!node) return found;
  if (typeof node === "string") {
    if (isUuid(node)) found.push(node);
    return found;
  }
  if (Array.isArray(node)) {
    node.forEach((item) => collectUuids(item, found));
    return found;
  }
  if (typeof node === "object") {
    ["id", "product_id"].forEach((key) => {
      if (isUuid(node[key])) found.push(node[key]);
    });
    if (node.product) collectUuids(node.product, found);
    if (node.products) collectUuids(node.products, found);
  }
  return found;
}

function productIdsFrom(record) {
  return Array.from(new Set(collectUuids(record && record.products ? record.products : record, [])));
}

function linkMatches(link, publicId) {
  const blob = [
    link && link.id,
    link && link.url,
    link && link.client_secret,
    link && link.client_id,
    link && link.slug
  ].join(" ");
  return blob.indexOf(publicId) !== -1;
}

async function resolveProductIds() {
  const checkoutProduct = String(process.env.POLAR_CHECKOUT_PRODUCT_ID || DEFAULT_TEST_PRODUCT).trim();
  if (isUuid(checkoutProduct)) return [checkoutProduct];

  const publicId = String(process.env.POLAR_CHECKOUT_LINK_ID || DEFAULT_TEST_LINK).trim();
  let linkCount = 0;
  let productCount = 0;

  try {
    const listed = await polarFetch("/v1/checkout-links/?limit=100");
    const items = listed.items || [];
    linkCount = items.length;
    let match = items.find((link) => linkMatches(link, publicId)) || items[0];
    if (match && isUuid(match.id)) {
      try {
        match = await polarFetch("/v1/checkout-links/" + match.id);
      } catch (_error) {
        /* list payload is enough */
      }
    }
    const fromLink = productIdsFrom(match);
    if (fromLink.length) return fromLink;
  } catch (error) {
    if (!/insufficient_scope/i.test(String(error && error.message))) throw error;
  }

  try {
    const catalog = await polarFetch("/v1/products/?limit=100");
    const fromCatalog = (catalog.items || []).map((item) => item && item.id).filter(isUuid);
    productCount = fromCatalog.length;
    if (fromCatalog.length) return [fromCatalog[0]];
  } catch (error) {
    if (!/insufficient_scope/i.test(String(error && error.message))) throw error;
  }

  throw new Error(
    "Could not find a Polar product UUID for checkout. Use a sandbox Organization token for test.polar.sh, enable products:read, or set POLAR_CHECKOUT_PRODUCT_ID to the product UUID from Polar → Products. links=" +
      linkCount +
      " products=" +
      productCount
  );
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
  const products = (await resolveProductIds()).filter(isUuid);
  if (!products.length) throw new Error("Could not find a Polar product UUID for checkout.");
  let customer = null;
  try {
    customer = await upsertPolarCustomer({ email, googleSub });
  } catch (error) {
    if (!/insufficient_scope/i.test(String(error && error.message))) throw error;
  }
  const site = String(process.env.SITE_URL || "https://www.geminiautosaver.com").replace(/\/$/, "");
  const payload = {
    products,
    customer_email: email,
    success_url: site + "/thanks?checkout_id={CHECKOUT_ID}",
    metadata: { source: "extension", google_email: email }
  };
  if (customer && customer.id) payload.customer_id = customer.id;
  const checkout = await polarFetch("/v1/checkouts/", {
    method: "POST",
    body: payload
  });
  if (!checkout || !checkout.url) throw new Error("Polar did not return a checkout URL.");
  return checkout.url;
}

module.exports = { polarToken, createPolarCheckout };
