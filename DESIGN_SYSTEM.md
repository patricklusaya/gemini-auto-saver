# DESIGN_SYSTEM.md

The official design reference for Gemini Auto Image Saver’s marketing site. Every
future page, section, and component must follow this file.

---

## 1. Project overview

- **Website / product name:** Gemini Auto Image Saver
- **Website type:** Product landing + checkout support pages (help, privacy, thanks)
- **Surface profile:** Landing / Marketing (hybrid: Help/Privacy are Content/Docs)
- **Platform:** Web (static HTML/CSS, Vercel)
- **Target users:** People who generate many Gemini images from prompt lists (stories,
  ads, stills) and need numbered files on disk
- **Main design goal:** In one glance, explain that the extension batch-runs image
  prompts in Gemini and downloads the files — then get the visitor to Install

## 2. Brand direction

- **Visual style:** Minimal workshop / instruction sheet. Light paper, one rust
  accent, no fake UI chrome
- **Mood & tone:** Direct, practical, unhurried
- **Design personality:** Corporate-clean with a technical edge (grotesque + mono
  paths, not editorial serif)
- **Design concept (one sentence — the Step 2.7 commitment):** a one-column
  instruction sheet for a local Chrome tool — oversized job-in-the-headline type,
  a real download path as the only “product shot,” vermillion used only on
  buttons, zero mock popups
- **Adversarial-review verdict:** Cover the brand name and it still reads as a
  local batch-download utility, not generic “AI SaaS.” Weakness found: the old
  dark-serif page plus a fake Auto Save popup made the job opaque and looked like
  AI-premium theater — removed the mock, switched to light paper + Hanken Grotesk,
  and rewrote the hero as a single job sentence
- **Reference style used:** Web galleries were not browsed this pass. Named
  exemplars: Linear’s density (tight nav, no card soup), Stripe’s restraint (one
  accent, long measure, no decorative mesh), a printed spec sheet (path as the
  artifact). Moves adapted: one primary button style; left-aligned type in a
  centered column instead of a left-text/right-mockup split; mono only for
  filenames
- **Voice & UX copy:** Plain verbs. Headline says the job. CTA labels: **Install**
  (primary), **How it works** (secondary), **Buy Pro** (checkout only). No
  “Elevate / Seamless / Next-gen.” Errors and help copy name the fix (refresh
  Gemini, turn off “Ask where to save”)

## 3. Color system

Restrained strategy: tinted warm neutrals + one accent.

| Role | Color | Hex | Usage |
|---|---|---|---|
| 60% — Dominant | Paper | `#f7f6f2` | Page background, sticky nav |
| 30% — Secondary | Board | `#eeece6` | Footer, path chip, raised blocks |
| 10% — Accent | Vermillion | `#c43b1a` | Primary buttons only |
| Ink | Near-black warm | `#1b1916` | Headings, links, focus ring |
| Muted | Warm gray | `#4a4640` | Body, supporting copy |
| Accent hover | Deep rust | `#b13218` | Primary button hover |
| Accent ink | Warm paper | `#fffaf7` | Text on primary buttons |

**Computed contrast (WCAG 2.x relative luminance):**
- Ink `#1b1916` on paper: **16.22:1** (AA body)
- Muted `#4a4640` on paper: **8.66:1** (AA body)
- Muted on board `#eeece6`: **7.93:1** (AA body)
- Accent ink `#fffaf7` on accent `#c43b1a`: **5.08:1** (AA body)
- Accent `#c43b1a` on paper: **4.87:1** (AA body — allowed for hover link color)
- Accent hover `#b13218` on paper: **5.82:1**

**Usage rules:**
- Backgrounds: paper only at page level; board for footer and the download-path chip
- Text: ink for headings and default links; muted for body/supporting (never lighter)
- Buttons: filled vermillion + accent-ink label; ghost = ink outline on paper
- Cards: none. Elevation is a flat board fill, not a drop shadow
- Highlights / focus: `2px solid #1b1916`, offset 3px, `:focus-visible` only
- Separation: background shift (paper → board) and spacing. Hairline dividers only
  on the spec table and help `<details>` — not for elevating cards
- **Dark mode:** not shipped. Do not invert these tokens without a full AA re-check

## 4. Typography system

- **Brand personality (drives the font choice):** corporate-clean / technical
- **Font family / pairing:** Hanken Grotesk (headings + body) + IBM Plex Mono
  (paths, code, filenames)
- **Why these fonts fit the personality:** Hanken is a self-hostable grotesque with
  slightly wide, workmanlike proportions — not Inter, not a serif “premium”
  default. Plex Mono is for the file path, which is the product
- **Type scale:**
  - display / h1: `clamp(2rem, 1.15rem + 3.2vw, 3rem)`
  - h2: `clamp(1.35rem, 1.15rem + 0.8vw, 1.65rem)`
  - h3: `1.2rem`
  - body-lg: `1.125rem` (hero lede)
  - body: `1.0625rem` (17px at 16px root)
  - body-sm: `1rem` (nav, notes — never below 16px)
  - caption: `0.875rem` (footer, legal meta)
  - button: `1rem` / weight 600
- **Body text:** 17px, line-height 1.55
- **Line-height / line-length:** ~1.5 body; measure `42rem` (~67ch). Hero lede
  max ~38ch
- **Button text style:** Grotesk 600, 16px, no letter-spacing, one line, ≤3 words
  on the primary (`Install`)
- **Responsive rules:** display/h2 use `clamp()`. Hero must stay inside `100svh`
  at ~700px and ~800px laptop heights. Do not truncate. Root `html` font-size is
  `100%` so `rem` tokens do not compound

## 5. Layout system

- **Container widths:** `--wide: min(880px, calc(100% - 40px))` for landing;
  `--page: min(720px, calc(100% - 40px))` for legal/help
- **Section spacing:** `--space-5` (64px) below sections; hero padding
  `--space-4` / `--space-5`
- **Grid rules:** one column. No 12-column grid. No left-copy / right-visual split
- **Page anatomy / section order:** sticky nav → oversized hero → how it works
  (path artifact) → how files are saved (spec table) → price → install → footer.
  No trust logos, no testimonial wall, no zigzag features
- **Conversion / CTA flow:** primary goal = Install. Primary style = filled
  vermillion. Repeats in nav, hero, after How it works, and as the Install
  section itself. Secondary = ghost “How it works”. Checkout = “Buy Pro” (different
  intent, same button style because it is the only paid action)
- **Surface-specific flows:** Help uses a compact TOC + native `<details>`
  accordion. Privacy/thanks use the legal article measure. No store listing/PDP
- **Hero composition:** oversized-typographic, left-aligned inside a vertically
  centered column (`min-height: calc(100svh - 64px); display: grid; place-items: center`).
  Striking move: the headline *is* the explanation; there is no product screenshot.
  Not a split. Headline target: ≤2 lines on desktop
- **Full-screen sections:** only the hero is viewport-tall. Later sections are
  content-height so a 700px laptop is not a slideshow of sparse panels
- **Horizontal card rails / scroll section(s):** none
- **Mobile-first behavior:** below 720px, nav stays one row (Menu + Install);
  hero inner goes full width; buttons wrap; no custom hamburger JS
- **Breakpoints:** 375 / 720 / 1280. Height checks at ~700 and ~800
- **Alignment rules:** left rag in the centered column. Tables left-aligned. Footer
  space-between

## 6. Component system

- **Component base / library:** native HTML + one CSS file. No shadcn, no icon kit
- **Chart / data-viz library:** none
- **Buttons:** `.btn` filled accent; `.btn.ghost` ink outline. States: default,
  hover (darker fill / board fill), `:focus-visible` ink ring, `:active` scale
  0.98. No disabled buttons on the marketing site
- **Cards:** not used
- **Badges:** not used. No sparkle/AI pills
- **Navbar:** sticky, paper background, wordmark + icon 28×28, text links muted,
  one Install button. Same pattern on inner pages (Install points at
  `index.html#install`). Below 720px, secondary links collapse into a native
  `<details>` Menu so the bar stays one row; Install stays visible
- **Footer:** board fill, caption size, help/privacy links
- **Forms:** none on the static site (checkout is Lemon Squeezy)
- **Inputs:** none
- **Feature sections:** prose + optional path chip or spec table
- **CTA sections:** Install is a heading + numbered list, not a marketing banner

## 7. Card & section style

- **Chosen style:** borderless / flat. Path chip is a rounded board rectangle
- **Radius:** `--radius: 6px` (buttons and path only)
- **Shadow / elevation:** none
- **Gradients:** none
- **Glassmorphism:** none
- **Rule:** do not nest surfaces. Do not add a fake browser/popup frame

## 8. Icon system

- **Icon library:** none. The only mark is `assets/icon128.png` (the extension icon)
- **Icon size:** 28×28 in the wordmark; always `width`/`height` set
- **Icon color:** as drawn in the PNG
- **Usage rules:** decorative `alt=""`. Do not introduce Lucide/emoji as structure

## 9. Image & asset rules

- **Logo:** user-provided PNG extension icon, transparent, 128 source, displayed 28
- **User-provided images:** the icon only
- **AI-generated images:** none on the site
- **Stock images:** none
- **Crop style:** n/a
- **Radius:** none on the icon
- **Visual treatment:** no mockups, no generated “screenshot of the popup”

## 10. Animation & interaction system

- **Animation library:** CSS-only
- **Hover states:** links ink ← muted; buttons fill → `--accent-hover`
- **Section reveal behavior:** none (no scroll-fade)
- **Horizontal-scroll behavior:** none
- **Button interaction:** hover color; active `transform: scale(0.98)`
- **Cursor pointer rules:** `cursor: pointer` on buttons and summary rows
- **Interaction states:** default / hover / `:focus-visible` / `:active`. Disabled
  not used
- **Async feedback:** checkout is a full navigation to Lemon Squeezy (no in-page
  spinner). Help is static
- **Toast / inline message system:** none
- **Form feedback:** n/a
- **Data view states:** n/a
- **Reduced-motion support:** button transition disabled under
  `prefers-reduced-motion`
- **Performance (targets via the nine levers, not measured this pass):** Google
  Fonts with `display=swap`; no hero image LCP (text is LCP); below-fold is HTML;
  no JS animation; icon has width/height; two small scripts at end of body;
  animate only `transform` on press. Target LCP < 2.5s, CLS < 0.1, INP < 200ms

### Experience tier — 3D / WebGL system

- **Experience tier:** Standard (DOM + CSS). No 3D

## 11. Accessibility rules

- **Contrast rules:** body/supporting ≥ 4.5:1 (muted 8.66:1). Button label 5.08:1.
  Recompute if tokens change
- **Focus states:** `:focus-visible` ink ring on links and buttons. Skip link
  revealed with `:focus-visible`
- **Keyboard navigation:** skip-to-content → `#main`; native details/summary on
  Help; tab order matches visual order
- **Semantics & ARIA:** `header`/`nav`/`main`/`footer`; one `h1` per page; Help
  accordion is native `<details>`
- **System adaptation:** reduced-motion; no RTL yet; body ≥ 16px
- **Text readability:** measure capped; hero lede short
- Never rely on color alone — button labels are text

## 12. Anti-AI-slop rules

Canonical gate: ui-ux-kit `SKILL.md` pre-flight + landing §B1.

- **Approved palette (the only colors allowed):** `#f7f6f2`, `#eeece6`, `#1b1916`,
  `#4a4640`, `#c43b1a`, `#b13218`, `#fffaf7`
- **Pure `#000`/`#fff` used?** No
- **Concept-test verdict (from §2):** still distinctive as an instruction sheet
  with a file path, not a purple AI dashboard. Weakness (fake popup + serif
  headline) fixed
- **Project-specific exceptions to the gate:** no trust bar / social proof (no
  customers to show honestly). No product screenshot (user asked the popup mock
  removed). Hero is the only full-viewport section so 700px laptops are not
  padded into empty bands. “Buy Pro” shares the primary button style because it
  is a different intent, not a second Install

## 13. Future page instructions

Reuse these colors, type tokens, spacing, button classes, path chip, spec table,
and legal-article layout. Do not add a serif, a dark mesh background, a fake
extension popup, gradient text, or a left-text/right-image hero unless this file
is updated first.

## 14. Update policy

If colors, type, components, motion, or image rules change, update this file in
the same change so it never drifts from the live UI.
