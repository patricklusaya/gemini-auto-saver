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

- **Visual style:** Minimal workshop / instruction sheet. Cool paper tinted from
  the icon, one blue accent sampled from the mark, no fake UI chrome
- **Mood & tone:** Direct, practical, unhurried
- **Design personality:** Corporate-clean with a technical edge (grotesque + mono
  paths, not editorial serif)
- **Design concept (one sentence — the Step 2.7 commitment):** a dense Chrome-extension
  product page — compact hero (not a stretched viewport), three numbered beats,
  a two-column facts/price band, and an install list; logo blues; path chip as
  the only product artifact; zero mock popups
- **Adversarial-review verdict:** Cover the brand name and it still reads as a
  local batch tool. Weakness found: the 100svh hero left a dead field of paper
  around a thin column — that is what made it feel unfinished. Fixed by packing
  the first screen and alternating surface bands.
- **Reference style used:** Named exemplars: Linear’s density (tight nav, no
  empty hero well), Stripe’s restraint (one accent, section bands, no mesh).
  Move adapted: hero is short and the next section starts in the same viewport
- **Voice & UX copy:** Plain verbs. Headline says the job. CTA labels: **Install**
  (primary), **How it works** (secondary), **Buy Pro** (checkout only). No
  “Elevate / Seamless / Next-gen.” Errors and help copy name the fix (refresh
  Gemini, turn off “Ask where to save”)

## 3. Color system

Restrained strategy: cool neutrals tinted toward the icon’s indigo + one accent
sampled from the PNG (`#326af3` bright blue → `#424ce2` indigo). The brief
overrides the “don’t use AI-startup purple” reflex because the user asked the
site to match the existing logo. Page stays light; no purple-on-dark mesh.

| Role | Color | Hex | Usage |
|---|---|---|---|
| 60% — Dominant | Cool paper | `#f4f6fb` | Page background, sticky nav |
| 30% — Secondary | Board | `#e8ebf4` | Footer, path chip, raised blocks |
| 10% — Accent | Icon blue | `#326af3` | Primary buttons (sampled from icon, ~341,341) |
| Ink | Cool near-black | `#14161f` | Headings, links, focus ring |
| Muted | Cool gray | `#3d4456` | Body, supporting copy |
| Accent hover | Icon indigo | `#424ce2` | Button hover; link hover (sampled ~682,682) |
| Accent ink | White | `#ffffff` | Text on primary buttons — same as the icon glyph |

**Computed contrast (WCAG 2.x relative luminance):**
- Ink `#14161f` on paper: **16.68:1** (AA body)
- Muted `#3d4456` on paper: **8.99:1** (AA body)
- Muted on board `#e8ebf4`: **8.16:1** (AA body)
- Accent ink `#ffffff` on accent `#326af3`: **4.68:1** (AA body)
- Accent ink on hover `#424ce2`: **6.24:1** (AA body)
- Hover indigo `#424ce2` on paper: **5.77:1** (AA body — used for link hover)
- Bright accent `#326af3` on paper: **4.32:1** — not used as body text; buttons only

**Usage rules:**
- Backgrounds: paper only at page level; board for footer and the download-path chip
- Text: ink for headings and default links; muted for body/supporting (never lighter)
- Buttons: filled icon-blue + white label; hover fills icon-indigo; ghost = ink outline on paper
- Cards: none. Elevation is a flat board fill, not a drop shadow
- Highlights / focus: `2px solid #14161f`, offset 3px, `:focus-visible` only
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

- **Container widths:** `--wide: min(1040px, calc(100% - 48px))` for landing;
  `--page: min(720px, calc(100% - 40px))` for legal/help
- **Section spacing:** bands `52px` vertical padding (`40px` under 720px). Hero
  `56px / 48px` (not viewport-tall). Footer `20px`
- **Grid rules:** three-column steps; two-column facts/price from 860px up. No
  left-copy / right-visual hero split
- **Page anatomy / section order:** sticky header → compact hero → how it works
  (3 steps + path) → files + price split → install → footer
- **Conversion / CTA flow:** primary goal = Install. Filled icon-blue. Repeats in
  nav, hero, and after How it works. Install section is the final conversion
  (instructions). Secondary = ghost “How it works”. Checkout = “Buy Pro”
- **Surface-specific flows:** Help uses a compact TOC + native `<details>`
  accordion. Privacy/thanks use the legal article measure
- **Hero composition:** oversized-typographic, left-aligned in a short block
  (`padding` only — **no** `min-height: 100svh`). Brief override: empty
  viewport centering made the site look unfinished. Headline still fits in the
  first viewport because the block is short. Not a split
- **Full-screen sections:** none. Every section is content-height
- **Horizontal card rails / scroll section(s):** none
- **Mobile-first behavior:** below 720px, nav stays one row (Menu + Install);
  steps and split stack to one column
- **Breakpoints:** 375 / 720 / 860 / 1280
- **Alignment rules:** left rag. Header and bands are full-bleed; inner wrap is
  centered. Footer space-between

## 6. Component system

- **Component base / library:** native HTML + one CSS file. No shadcn, no icon kit
- **Chart / data-viz library:** none
- **Buttons:** `.btn` filled accent; `.btn.ghost` ink outline. States: default,
  hover (darker fill / board fill), `:focus-visible` ink ring, `:active` scale
  0.98. No disabled buttons on the marketing site
- **Cards:** not used
- **Badges:** not used. No sparkle/AI pills
- **Navbar:** sticky full-bleed bar, paper + surface hairline, wordmark + icon
  28×28, text links muted, one Install button. Below 720px, secondary links
  collapse into a native `<details>` Menu
- **Footer:** board fill, caption size, help/privacy links
- **Forms:** none on the static site (checkout is Polar or Lemon Squeezy)
- **Inputs:** none
- **Feature sections:** prose + optional path chip or spec table
- **CTA sections:** Install is a heading + numbered list, not a marketing banner

## 7. Card & section style

- **Chosen style:** borderless / flat bands. Path chip is a rounded board
  rectangle. How/install sit on paper; files+price sit on board
- **Radius:** `--radius: 8px` (buttons, path, icon crop)
- **Shadow / elevation:** none — bands separate by background shift
- **Gradients:** none
- **Glassmorphism:** none
- **Rule:** do not nest surfaces. Do not add a fake browser/popup frame
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
- **Async feedback:** checkout is a full navigation to Polar or Lemon Squeezy (no in-page
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

- **Contrast rules:** body/supporting ≥ 4.5:1 (muted 8.99:1). Button label 4.68:1
  on `#326af3`. Recompute if tokens change
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

- **Approved palette (the only colors allowed):** `#f4f6fb`, `#e8ebf4`, `#14161f`,
  `#3d4456`, `#326af3`, `#424ce2`, `#ffffff`
- **Pure `#000`/`#fff` used?** `#ffffff` on buttons only — it is the icon glyph
  color, documented as a logo match, not a default
- **Concept-test verdict (from §2):** still an instruction sheet with a file path.
  Blues come from the PNG, not a generic AI gradient page. Weakness (warm
  vermillion vs blue icon) fixed
- **Project-specific exceptions to the gate:** no trust bar / social proof (no
  customers to show honestly). No product screenshot (user asked the popup mock
  removed). Hero is the only full-viewport section so 700px laptops are not
  padded into empty bands. “Buy Pro” shares the primary button style because it
  is a different intent, not a second Install. Logo-matching blue/indigo is an
  explicit brief override of the “AI purple” reflex; the page stays light and
  has no decorative gradient. Hero is **not** `min-height: 100svh`: the user
  asked to kill empty space, so the first viewport is packed (hero + start of
  How it works) instead of a vertically centered lonely column

## 13. Future page instructions

Reuse these colors, type tokens, spacing, button classes, path chip, spec table,
and legal-article layout. Do not add a serif, a dark mesh background, a fake
extension popup, gradient text, or a left-text/right-image hero unless this file
is updated first.

## 14. Update policy

If colors, type, components, motion, or image rules change, update this file in
the same change so it never drifts from the live UI.
