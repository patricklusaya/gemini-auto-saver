# Gemini Auto Image Saver — website

Public landing page and privacy policy for [Gemini Auto Image Saver](https://github.com/patricklusaya/gemini-auto-saver).

This is a static site. No Node build is required.

```text
.
├── index.html
├── privacy.html
├── css/styles.css
├── assets/icon128.png
├── vercel.json
└── README.md
```

## Live URLs (after Vercel)

Import this GitHub repo in Vercel. The usual URLs are:

```text
https://gemini-auto-saver.vercel.app/
https://gemini-auto-saver.vercel.app/privacy
```

Use the privacy URL in the Chrome Web Store listing.

If Vercel assigns a different project name, copy the URL from the Vercel dashboard.

## Deploy on Vercel

1. Push this folder to [patricklusaya/gemini-auto-saver](https://github.com/patricklusaya/gemini-auto-saver).
2. Open [vercel.com/new](https://vercel.com/new).
3. Import the `gemini-auto-saver` GitHub repository.
4. Leave **Framework Preset** as Other. Leave **Build Command** empty. Leave **Output Directory** empty.
5. Click Deploy.

Later pushes to `main` will republish automatically.

## Chrome Web Store fields

After the site is live:

- Homepage: `https://gemini-auto-saver.vercel.app/`
- Privacy policy: `https://gemini-auto-saver.vercel.app/privacy`

Also set `homepage_url` in the extension `manifest.json` to the homepage URL.

## Local preview

Open `index.html` in a browser, or from this folder:

```powershell
python -m http.server 8765
```

Then visit `http://127.0.0.1:8765/`.
