# CLIENT-CHECKLIST.md

Per-client personalization checklist for spinning up a new site from this
template. This is the **exhaustive** list — every file that contains a
placeholder, a hardcoded domain, a stock color, or boilerplate text. Work top
to bottom; the site renders fine even half-finished (a bad spec shows a calm
error screen, never a blank page), so nothing crashes if you skip ahead — but
the SEO/sharing items must be done before the site is public.

> Companion to `AGENTS.md` (architecture: how the engine works) and `README.md`
> (human quick-start). This file answers one question only: **what do I change
> for each new client?**
>
> The template fingerprint `Built from m-remis/static-web-template` is
> intentional. Do not remove it unless the repository owner explicitly asks for
> a white-label build (see §0.1).

---

## How content works (read this first)

There is **no content in the HTML or the JS.** Everything the visitor sees is
rendered at runtime from a single file: **`site-spec.json`**. The engine
(`engine.js`) fetches it on load and builds the brand, the nav tabs, every
section, the footer, the socials, the backgrounds, and even the document
`<head>` metadata from it.

So ~90% of a new client is **one file: `site-spec.json`.** The rest of this
checklist is the long tail — favicon, manifest, sitemap, robots, colors, deploy
— the stuff that ships wrong silently because the page works without it.

```text
edit site-spec.json  →  node launch-check.js  →  fix every error  →  deploy
```

---

## 0. One-shot audit before you start (and before you deploy)

The real gate is the validator — run it from the repo root:

```bash
node launch-check.js
```

It catches placeholder text, fake contact data (`r@r.sk`, `+421 000…`, IČO/DIČ
of `0`), broken/missing asset paths, manifest icon paths, a domain that doesn't
match across files, and a missing `og:image`. Drive it to `PASS` before
shipping. Full details (every check, the flags, the error codes) are in
`LAUNCH-CHECK.md`.

A quick grep is still useful as a second pass for stock strings the validator's
heuristics might not know:

```bash
grep -rni "example.com\|m-remis.github.io/static-web-template\|lorem ipsum\|Times Square\|name@example.com" \
  --exclude-dir=.git --exclude=CLIENT-CHECKLIST.md .
```

Re-run both right before pushing. Do **not** add `m-remis/static-web-template`
or `Built from m-remis/static-web-template` to the audit grep — those are
intentional fingerprint strings, not client placeholders.

---

## 0.1. Template fingerprint — leave this alone

The template intentionally includes a small fingerprint:

```text
Built from m-remis/static-web-template
```

and the repository identifier:

```text
m-remis/static-web-template
```

Do not remove it during client cleanup. Do not replace it with the client's
name. Do not treat it as forgotten boilerplate. It is source attribution and a
searchable marker for sites built from this template. Keep it in source
comments or documentation; it does not need to be visible in the UI unless a
visible credit was explicitly requested. It currently lives in `index.html`,
`404.html`, `engine.js`, `styles.css`, `README.md`, `AGENTS.md`, and this file.

Before deploy, verify it still exists somewhere intentional:

```bash
grep -rni "Built from m-remis/static-web-template\|m-remis/static-web-template" \
  --exclude-dir=.git .
```

---

## 1. Content — `site-spec.json` (the 90%)

This is the bulk of the work and almost the only file you touch for a typical
client. The full shape and every block type are documented in `AGENTS.md`
("The block engine") and in the long comment at the top of `engine.js` — keep
both open while editing. Validate after every change:

```bash
node -e "JSON.parse(require('fs').readFileSync('site-spec.json','utf8'))"
```

### 1a. Top-level fields

- [ ] **`brand`** — the business name. Appears in the header and footer and is
  reused in the metadata strings (§1b). One value, rendered in many places.
- [ ] **`brandImage`** *(optional)* — path to a logo PNG (e.g.
  `assets/logo.png`) that replaces the header brand **text**. Keep `brand` set:
  it becomes the logo's alt text and still drives the footer copyright and
  metadata. A monochrome black-on-transparent logo is auto-inverted to white in
  dark theme (same `--mono-icon-filter` as card icons); a colored logo needs
  that filter overridden for `.brand__img` in `styles.css`.
- [ ] **`footer.note`** — footer tagline. `footer.year` is optional; the engine
  fills the current year if you omit it.
- [ ] **`socials[]`** — array of `{ label, icon, url }`. Give each a **distinct
  `label`** (it doubles as the `aria-label`). `icon` must match a key in the
  `SOCIAL_ICONS` map in `engine.js` (currently `instagram`, `youtube`, `email`,
  `phone`). Remove platforms the client doesn't have.
    - [ ] **New platform?** Add an inline SVG to `SOCIAL_ICONS` in `engine.js`
      **and** a `.socials__link--<icon> svg { color: … }` brand-tint rule in
      `styles.css`, then reference the key here. (See `AGENTS.md` → "Socials".)
- [ ] **`backgrounds[]`** — paths under `assets/background/`, cycled with a
  crossfade. Each path must match a file you actually drop in (§4). A missing
  file fails silently to a plain background — it won't crash, but you get no
  image.

### 1b. Metadata — `site-spec.json` → `meta` (the SEO single source of truth)

`renderHead()` writes the document `<head>` from `meta` at runtime, so this —
not `index.html` — is the real source for title/description/OG/canonical. The
matching tags in `index.html` are only a crawler fallback (§3).

- [ ] **`meta.lang`** — e.g. `"sk"`. Sets `<html lang>`.
- [ ] **`meta.domain`** — the canonical URL, e.g. `"https://www.rustcust.sk/"`.
  Drives `og:url` and the canonical link, and `launch-check` makes the sitemap
  and robots agree with it. **Must be the real domain.**
- [ ] **`meta.title`** — page title + `og:title`.
- [ ] **`meta.description`** — meta description + `og:description` fallback.
- [ ] **`meta.ogDescription`** — optional; only if you want the social text to
  differ from `description`.
- [ ] **`meta.author`**.
- [ ] **`meta.themeColor`** — the **initial** browser chrome color; match your
  dark `--bg-base` (§5). `applyTheme()` then keeps it in sync with the active
  theme at runtime.
- [ ] **`meta.ogType`** — usually `"website"`.
- [ ] **`meta.ogImage`** — path to the social-share preview image. **Until this
  is set (or an `og:image` exists in `index.html`), `launch-check` fails** — no
  share preview is an error, not a warning. Make a real one.
- [ ] **`meta.twitterCard`** — `"summary"` or `"summary_large_image"`.
- [ ] **`meta.analytics`** (optional) — the footer visitor count. Shape:
  `{ countUrl, countLabel?, dashboardUrl? }` (e.g. a GoatCounter
  `/counter/TOTAL.json` endpoint). Omit the whole object for no count and no
  request. Note the actual *tracking* script is a separate `<script>` in
  `index.html` (§3) — this object only controls the displayed number.

### 1c. Sections + blocks (`meta.sections[]`)

`sections` is an **ordered array** — the order IS the nav order and the page
order. Each entry is `{ id, label, title?, blocks: [...] }`:

- [ ] **`id`** — unique, URL-hash-friendly (letters/numbers/`-`/`_`). Used as
  the tab id and the URL hash. There is **no** separate nav list and **no**
  per-id render branch anymore — renaming an id is safe; just keep it unique.
- [ ] **`label`** — the nav tab text. Missing label = blank tab (warned).
- [ ] **`title`** — optional `<h2>` at the top of the section. A section that
  leads with a `hero` block usually omits it.
- [ ] **`blocks[]`** — ordered content blocks, each `{ "type": …, … }`.
  Reorder a section by reordering its blocks. Supported types: `hero`, `text`,
  `cards`, `links`, `map`, `slideshow`, `table`, `faq`, `gallery`, `photo` —
  shapes in `AGENTS.md` and the `engine.js` header comment.

Per-block placeholders to hunt down for a new client:

- [ ] **`hero`** — `eyebrow` / `title` / `lead`. `<em>…</em>` in `title`/`lead`
  renders in the accent color. Authored HTML only, never client-supplied raw
  input. Don't leave a stub lead — short hero copy is warned.
- [ ] **`text`** — replace any template prose. `<em>`/`<a>` allowed. If a `text`
  block has a real outbound link, make sure it's the client's, not the
  template author's.
- [ ] **`cards`** — `items[]` of `{ title, body, meta?, url?, icon? }`. With
  `linked: true`, each card with a `url` becomes a link; replace `#`/dummy URLs.
  An `icon` path adds a monochrome icon to the left of the text (vertically centered) — a **black PNG on a
  transparent background** (skull-badge style), pointing at a real file in
  `assets/`. It is auto-inverted to white in dark theme, so one asset covers
  both themes. Cards do not take background photos.
- [ ] **`links`** (contact rows) — prefer **`use`**: a list of keys resolved
  against `business`/`socials` (e.g. `"use": ["phone","email","instagram"]`),
  so a number/handle is typed once in `business` and reused. You can also add
  explicit `items[]` of `{ label, handle, url, icon?, kind? }`. A `use` key that
  matches nothing is warned (`LINK_USE_UNRESOLVED`). Rows show a small kind
  label ("Telefón", "Instagram", …) over the value automatically for known
  icons — set `kind` on inline items to control it. `"layout": "grid"` renders
  up to a handful of contacts as side-by-side tiles instead of stacked rows.
  **Replace the template
  `r@r.sk` / `+421 000 000 00` defaults in `business`** — both are caught as
  fake by `launch-check`.
- [ ] **`map`** — `mode: "embed"` (Google Maps → Share → Embed → copy the
  iframe `src` into `embed`) or `mode: "static"` (themed card, no iframe).
  `url`/`embed` can be omitted to **fall back to `business.mapUrl`/`mapEmbed`**
  (the single-source-of-truth path). Set `label`/`address` for the accessible
  fallback text. **Any template default location must be replaced.**
- [ ] **`table`** (e.g. a price list) — `headings[]` + `rows[][]`. The last
  column is right-aligned/accent-styled, which reads as a price column. A
  pricing-looking section with no price-like content (`€`, `od`, `dohodou`, …)
  is warned.
- [ ] **`faq`** (accordion) — `items[]` of `{ q, a }` (both required). `q` is
  plain text; `a` allows `<em>`/`<a>` (authored only). Optional `name`/`blurb`
  heading. A short answer (<15 chars) is warned.
- [ ] **`slideshow`** — `slides[]` of `{ src, title?, caption?, text? }`
  (`src` required). 1 slide = framed image; 2+ = carousel with lightbox.
- [ ] **`gallery`** — `images[]` of `{ src, title?, caption?, text? }`, optional
  `columns` (1–6). Grid of tiles sharing the slideshow's lightbox. Give images
  a `title`/`caption` — a gallery image with no text is flagged for missing alt.
- [ ] **`photo`** — single-image sugar: `{ src, title?, caption?, text? }`.

---

## 2. New block *type* (only if the client needs one)

Renaming/reordering sections is just a `site-spec.json` edit — never code. A
genuinely new **kind** of block (opening hours, FAQ accordion, pricing card,
class schedule) is the only thing that's ever real code, and it's small:

- [ ] Write `buildX(block)` in `engine.js` (pure DOM builder — reads only its
  `block` arg, never `SITE`), returning a node/fragment/`null`.
- [ ] Add `yourtype: buildX` to the `BLOCK_RENDERERS` map.
- [ ] Add the matching CSS in `styles.css`.
- [ ] Document the block's fields in the top-of-file `BLOCK TYPES` comment in
  `engine.js`, the block table in `AGENTS.md`, and `BLOCK_RULES` in
  `launch-check.js` (so the validator doesn't false-fail on the new type).
- [ ] Use `{ "type": "yourtype", … }` in any section's `blocks`.

Full walkthrough in `AGENTS.md` → "Adding a NEW block type". Once built, the
block is reusable across all future clients — growing a tested block library is
the real product value.

---

## 3. Metadata mirrors / SEO files — the easy-to-forget ones

`meta` in `site-spec.json` (§1b) is authoritative, but these files carry their
own copies for crawlers, PWA, and search, and ship wrong if you're not
deliberate. `launch-check` cross-checks most of them against `meta.domain`.

### `index.html` (static crawler fallback)

The engine overwrites these from `meta` at runtime, but crawlers/scrapers that
don't run JS see the static values — keep them roughly matching `meta`:

- [ ] `<title>`, `<meta name="description">`, `<meta name="author">`.
- [ ] `<meta name="theme-color">` — match your dark `--bg-base` (§5).
- [ ] `<meta property="og:title">` / `og:description` / **`og:url`**.
- [ ] **`<link rel="canonical">`** — must be the real domain.
- [ ] **GoatCounter script** — the `data-goatcounter="…"` attribute on the
  `<script ... src="//gc.zgo.at/count.js">` near the bottom of `<head>`. Point
  it at the client's GoatCounter (or remove the script entirely if unused).
  This is separate from `meta.analytics`, which only renders the visible count.

### `404.html`

- [ ] `<title>` (e.g. `404 — Not found · Brand`).
- [ ] `<meta name="theme-color">` — also overwritten at runtime from
  `--bg-base`, but set the static fallback to match.

### `site.webmanifest`

- [ ] `name`, `short_name`, `description`.
- [ ] `background_color`, `theme_color` — match your dark `--bg-base`.
- [ ] **Icon `src` paths must resolve as written.** They currently point at
  `assets/web-app-manifest-…png`; a root-absolute `/web-app-manifest-…png` is a
  common mistake and is a hard `launch-check` failure.

### `sitemap.xml`

- [ ] **`<loc>`** — must equal `meta.domain` (error on mismatch).

### `robots.txt`

- [ ] **`Sitemap:`** line — host must match `meta.domain`'s host.

### `LICENSE`

- [ ] Copyright line — update the name/year, or swap the license entirely if a
  client site shouldn't be MIT.

---

## 4. Assets — `assets/`

- [ ] **`assets/favicon.ico`** + `favicon-96x96.png` + `apple-touch-icon.png` —
  replace with the client's. Referenced by `index.html`/`404.html`/manifest.
- [ ] **`assets/web-app-manifest-192x192.png` / `-512x512.png`** — the PWA
  icons referenced by `site.webmanifest` (§3).
- [ ] **`assets/background/`** — the client's background image(s); every file
  must be listed in `meta.backgrounds` and vice versa.
- [ ] **`assets/slides/`** — slideshow/gallery images referenced by those
  blocks. Unreferenced files here are warned (`UNUSED_ASSET`); referenced-but-
  missing files are a hard failure.
- [ ] **Social-share image** — create the `meta.ogImage` file (§1b).
- [ ] **Sizes** — `launch-check` warns on images over ~900 KB
  (`--max-image-kb`). Compress large slides/backgrounds before shipping.

---

## 5. Colors / branding — `styles.css` (single source of truth)

All color lives in **two token blocks**: `[data-theme="dark"]` and
`[data-theme="light"]`, grouped by comment (Backgrounds, Text, Menu/nav,
Accents & lines, advanced overlay/header, Carousel). Re-skinning the whole site
— both themes, the 404 page, the browser chrome — happens here and nowhere else.

- [ ] **`--accent`** + **`--accent-soft`** (both themes) — carries most of the
  brand feel; the fastest high-impact change.
- [ ] **`--bg-base`** (both themes) — page background. If you change the dark
  one, update its mirrors: `index.html` theme-color, `404.html` theme-color,
  and `site.webmanifest` `theme_color` + `background_color` (§3).
- [ ] Remaining tokens (text, menu, border, overlays) — adjust to taste;
  defaults are a sane neutral.
- [ ] **Do NOT** inline hex into individual rules — add a named variable to
  **both** theme blocks instead.
- [ ] **Exception:** social brand colors (`.socials__link--instagram svg`, etc.)
  are intentionally the platform's brand color, identical in both themes, and
  live as per-platform rules — not in the token blocks. Leave them unless adding
  a platform (§1a).

---

## 6. Deploy — GitHub Pages (or any static host)

- [ ] Push to a repo, enable Pages (Settings → Pages → deploy from branch).
- [ ] `.nojekyll` is already present — leave it; it makes Pages serve files
  as-is (needed because directories like `animation/` would otherwise be
  Jekyll-processed).
- [ ] **Custom domain?** Create a `CNAME` file (no extension) in the repo root
  containing just the domain, e.g. `rustcust.sk`. The template ships **without**
  one on purpose. `launch-check` warns if the `CNAME` host differs from
  `meta.domain`'s host (legitimate for www↔apex redirects, so it's a warning).
- [ ] If using the default `username.github.io/repo` URL instead of a custom
  domain, `meta.domain` and the §3 mirrors must reflect *that* path.
- [ ] Works identically on Netlify / Vercel / Cloudflare Pages — point at the
  folder, no build command.

---

## 7. Verify (no build, no tests — manual + the validator)

- [ ] **Validate + preflight:**
  `node -e "JSON.parse(require('fs').readFileSync('site-spec.json','utf8'))"`,
  `node --check engine.js`, then `node launch-check.js` to `PASS`. Tip: editing
  `site-spec.json` in VS Code / IntelliJ gives live validation against
  `site-spec.schema.json` (wrong block type or field shows red as you type) —
  the fastest way to catch shape mistakes before the preflight.
- [ ] **Serve and click through** — `python3 -m http.server 8000` (not
  `file://`, which fails the fetch and shows the error screen). Check: light/dark
  toggle, every nav tab, each block type renders, the mobile menu at a narrow
  viewport, the 404 page (`/404.html`), the skull mascot, and a clean console.
- [ ] **Mobile scroll test (iOS Safari especially):** open a tab other than the
  first, scroll down, refresh — it must land at the top of that tab, not
  pre-scrolled to a card. Don't touch the `forceTop` / `scrollRestoration`
  logic; it exists for exactly this.
- [ ] **Header-fit test:** drag the window slowly across mid-widths (~640px →
  wide). The header must flip to the hamburger the instant the nav and socials
  approach, no overlap frame, and flip back when widened. Confirm the socials
  show (stacked, with labels) in the drawer in that mode.
- [ ] Re-run the §0 audit — confirm no boilerplate survived.

---

## Quick reference — every placeholder, by file

| File               | Placeholder(s) to change                                                             |
|--------------------|--------------------------------------------------------------------------------------|
| `site-spec.json`   | Everything (§1): `brand`, `meta` (incl. domain/og:image/analytics), `sections`, `socials`, `backgrounds` |
| `engine.js`        | Only for a new block type (§2) or a new social platform's `SOCIAL_ICONS` entry       |
| `styles.css`       | The two `[data-theme]` token blocks (§5); a new platform's brand-tint rule           |
| `index.html`       | Static meta fallback + canonical + the GoatCounter `data-goatcounter` (§3)           |
| `404.html`         | title, theme-color                                                                   |
| `site.webmanifest` | name, short_name, description, background_color, theme_color, icon paths             |
| `sitemap.xml`      | `<loc>` URL (= `meta.domain`)                                                        |
| `robots.txt`       | `Sitemap:` URL host (= `meta.domain` host)                                           |
| `LICENSE`          | copyright name/year (or whole license)                                               |
| `assets/`          | favicons, PWA icons, backgrounds, slides/gallery images, the `og:image`              |
| `CNAME`            | create per client (custom domain only)                                               |
| Fingerprint        | `Built from m-remis/static-web-template` — keep; do not replace or remove            |

**Hardcoded values that appear in more than one place — change together:**

- **Domain** → `meta.domain`, `index.html` (canonical + og:url), `sitemap.xml`
  `<loc>`, `robots.txt` `Sitemap:`, and `CNAME` if used. (`launch-check`
  cross-checks these.)
- **Dark bg `--bg-base`** → `styles.css` (both you change), `index.html`
  theme-color, `404.html` theme-color, `site.webmanifest` `theme_color` +
  `background_color`.
- **Business name** → `brand`, `meta.title`/`meta.description`/og, `404.html`
  title, `site.webmanifest` `name`/`short_name`.
- **Template fingerprint** → intentional; do not replace or remove.

<!-- Built from m-remis/static-web-template -->