# Gemini Auto Image Saver — website

Public landing page, privacy policy, and Pro checkout webhook for [Gemini Auto Image Saver](https://github.com/patricklusaya/gemini-auto-saver).

The marketing pages are static. Server routes under `api/` receive checkout webhooks (Lemon Squeezy and Polar), sign a `GAS1` license, and email it. The browser extension never calls these APIs.

```text
.
├── index.html
├── thanks.html
├── help.html
├── privacy.html
├── css/styles.css
├── js/site-config.js
├── api/lemonsqueezy.js
├── api/polar.js
├── lib/sign.js
├── lib/email.js
├── lib/issue.js
├── lib/polar-signature.js
├── assets/icon128.png
├── vercel.json
└── README.md
```

## Live URLs (after Vercel)

```text
https://gemini-auto-saver.vercel.app/
https://gemini-auto-saver.vercel.app/privacy
https://gemini-auto-saver.vercel.app/help
https://gemini-auto-saver.vercel.app/thanks
https://gemini-auto-saver.vercel.app/api/lemonsqueezy
https://gemini-auto-saver.vercel.app/api/polar
```

Use the privacy URL in the Chrome Web Store listing.

## Deploy on Vercel

1. Push this folder to [patricklusaya/gemini-auto-saver](https://github.com/patricklusaya/gemini-auto-saver).
2. Open [vercel.com/new](https://vercel.com/new).
3. Import the `gemini-auto-saver` GitHub repository.
4. Leave **Framework Preset** as Other. Leave **Build Command** empty. Leave **Output Directory** empty.
5. Add the environment variables below.
6. Click Deploy.

Later pushes to `main` will republish automatically.

## Chrome Web Store fields

After the site is live:

- Homepage: `https://gemini-auto-saver.vercel.app/`
- Privacy policy: `https://gemini-auto-saver.vercel.app/privacy`

The extension `manifest.json` already uses this homepage URL.

## Pro checkout (multiple merchants of record)

The extension verifies licenses locally. It cannot receive webhooks. Both Polar and Lemon Squeezy can take payment. Each has its own webhook. Both issue the same `GAS1` key by email.

Set the live Buy Pro destination in `js/site-config.js`:

```js
window.GAS_SITE = {
  defaultMor: "polar",
  mors: {
    polar: {
      checkoutUrl: "https://buy.polar.sh/YOUR-CHECKOUT"
    },
    lemonsqueezy: {
      checkoutUrl: "https://geminiautosaver.lemonsqueezy.com/checkout/buy/YOUR-VARIANT"
    }
  }
};
```

`defaultMor` is which checkout the Buy Pro buttons open. If that URL is empty, the site uses the other non-empty checkout URL.

Flow:

1. Customer pays on the default merchant of record.
2. That provider POSTs to `/api/polar` (`order.paid`) or `/api/lemonsqueezy` (`order_created`).
3. The function verifies the signature, signs a unique `GAS1` key, and emails it with Resend.
4. The customer pastes the key in Extension → Settings.

### Environment variables (Vercel)

Copy `.env.example`. Set these in the Vercel project:

| Name | Required | Purpose |
| --- | --- | --- |
| `POLAR_WEBHOOK_SECRET` | for Polar | Signing secret from Polar → Settings → Webhooks |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | for Lemon Squeezy | Signing secret from Lemon Squeezy → Settings → Webhooks |
| `LICENSE_PRIVATE_KEY` | yes | Full PEM from `gemini-auto-image-saver/keys/private.pem`. Never commit this file. If the Vercel UI is one line, replace newlines with `\n`. |
| `RESEND_API_KEY` | yes | From [resend.com](https://resend.com) |
| `LICENSE_FROM_EMAIL` | no | Defaults to `Gemini Auto Image Saver <onboarding@resend.dev>` for Resend testing (can only email your Resend account). Switch to your verified domain for real customers. |
| `SITE_URL` | no | Defaults to `https://gemini-auto-saver.vercel.app` |
| `POLAR_PRODUCT_ID` | no | Ignore Polar orders for other products |
| `LEMON_SQUEEZY_PRODUCT_ID` | no | Ignore Lemon Squeezy orders for other products |
| `REQUIRE_LIVE_ORDERS` | no | Set to `true` to skip Lemon Squeezy test-mode orders |

Do **not** put `private.pem` in this repo or in the extension package.

### Polar dashboard

1. Product: one-time Pro license. Do **not** enable Polar’s built-in license-key benefit.
2. Success URL: `https://gemini-auto-saver.vercel.app/thanks`
3. Settings → Webhooks:
   - URL: `https://gemini-auto-saver.vercel.app/api/polar`
   - Event: **`order.paid` only** (do not select all events)
   - Signing secret: the same value as `POLAR_WEBHOOK_SECRET`
4. Paste the Polar checkout URL into `js/site-config.js` under `mors.polar.checkoutUrl`. Keep `defaultMor: "polar"`.

### Lemon Squeezy dashboard

1. Product: one-time Pro license. Turn **off** Lemon Squeezy’s built-in license keys so customers are not emailed a second key format.
2. Checkout success / redirect URL: `https://gemini-auto-saver.vercel.app/thanks`
3. Settings → Webhooks:
   - URL: `https://gemini-auto-saver.vercel.app/api/lemonsqueezy`
   - Event: `order_created`
   - Signing secret: the same value as `LEMON_SQUEEZY_WEBHOOK_SECRET`

Until a checkout URL is set for the default MoR (or any fallback MoR), the Buy Pro button stays hidden.

## Local preview

The HTML pages:

```powershell
python -m http.server 8765
```

Then visit `http://127.0.0.1:8765/`. The webhook only runs on Vercel (or another Node host) with the env vars set.
