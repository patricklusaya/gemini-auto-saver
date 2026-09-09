# Gemini Auto Image Saver — website

Public landing page, privacy policy, and Pro checkout webhook for [Gemini Auto Image Saver](https://github.com/patricklusaya/gemini-auto-saver).

The marketing pages are static. The only server code is `api/lemonsqueezy.js`, which receives a Lemon Squeezy order, signs a `GAS1` license, and emails it. The browser extension never calls this API.

```text
.
├── index.html
├── thanks.html
├── help.html
├── privacy.html
├── css/styles.css
├── js/site-config.js
├── api/lemonsqueezy.js
├── lib/sign.js
├── lib/email.js
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

## Pro checkout (Lemon Squeezy)

The extension verifies licenses locally. It cannot receive webhooks. Flow:

1. Customer pays on Lemon Squeezy.
2. Lemon Squeezy POSTs `order_created` to `/api/lemonsqueezy`.
3. The function verifies `X-Signature` (HMAC-SHA256 of the **raw** body).
4. If the order status is `paid`, it signs a unique `GAS1` key and emails it with Resend.
5. The customer pastes the key in Extension → Settings.

### Environment variables (Vercel)

Copy `.env.example`. Set these in the Vercel project:

| Name | Required | Purpose |
| --- | --- | --- |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | yes | Signing secret from Lemon Squeezy → Settings → Webhooks |
| `LICENSE_PRIVATE_KEY` | yes | Full PEM from `gemini-auto-image-saver/keys/private.pem`. Never commit this file. If the Vercel UI is one line, replace newlines with `\n`. |
| `RESEND_API_KEY` | yes | From [resend.com](https://resend.com) |
| `LICENSE_FROM_EMAIL` | no | Defaults to `Gemini Auto Image Saver <onboarding@resend.dev>` for Resend testing (can only email your Resend account). Switch to your verified domain for real customers. |
| `SITE_URL` | no | Defaults to `https://gemini-auto-saver.vercel.app` |
| `LEMON_SQUEEZY_PRODUCT_ID` | no | Ignore orders for other products in the same store |
| `REQUIRE_LIVE_ORDERS` | no | Set to `true` to skip Lemon Squeezy test-mode orders |

Do **not** put `private.pem` in this repo or in the extension package.

### Lemon Squeezy dashboard

1. Product: one-time Pro license. Turn **off** Lemon Squeezy’s built-in license keys so customers are not emailed a second key format.
2. Checkout success / redirect URL: `https://gemini-auto-saver.vercel.app/thanks`
3. Settings → Webhooks:
   - URL: `https://gemini-auto-saver.vercel.app/api/lemonsqueezy`
   - Event: `order_created`
   - Signing secret: the same value as `LEMON_SQUEEZY_WEBHOOK_SECRET`
4. Run a test checkout. You should get a `GAS1....` email. Paste it in the extension Settings.

### Buy button on this site

Paste the Lemon Squeezy checkout / buy URL into `js/site-config.js`:

```js
window.GAS_SITE = {
  checkoutUrl: "https://YOUR-STORE.lemonsqueezy.com/checkout/buy/YOUR-VARIANT"
};
```

Until that is set, the Buy Pro button stays hidden.

## Local preview

The HTML pages:

```powershell
python -m http.server 8765
```

Then visit `http://127.0.0.1:8765/`. The webhook only runs on Vercel (or another Node host) with the env vars set.
