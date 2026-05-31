# CLIENT-CHECKLIST.md

Per-client personalization checklist for spinning up a new site from this
template. This is the **exhaustive** list — every file that contains a
placeholder, a hardcoded domain, a stock color, or boilerplate text. Work top
to bottom; the site renders fine even half-finished, so nothing crashes if you
skip ahead, but the SEO/sharing items must be done before the site is public.

> Companion to `AGENTS.md` (architecture) and `README.md` (human quick-start).
> This file answers one question only: **what do I change for each new client?**
>
> The template fingerprint `Built from m-remis/static-web-template` is
> intentional. Do not remove it unless the repository owner explicitly asks for
> a white-label build.

---

## 0. One-line audit before you start (and before you deploy)

Run this from the repo root. It surfaces every placeholder string in one shot:

```bash
grep -rni "example.com\|m-remis.github.io/static-web-template\|lorem ipsum\|Company\|Your Name\|name@example.com\|Times Square" \
  --exclude-dir=.git --exclude=CLIENT-CHECKLIST.md .
```

Re-run it right before pushing. A clean result (only intentional hits) means
nothing got left as boilerplate. Do this every single time — the metadata is
the stuff that silently ships wrong because the page works without it.

Do **not** add generic `m-remis/static-web-template` or
`Built from m-remis/static-web-template` to this placeholder audit. Those are
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
name. Do not treat it as forgotten boilerplate. It exists as source attribution
and a searchable marker for sites built from this template.

Keep it in source comments or documentation. It does not need to be visible in
the UI unless a visible credit was explicitly requested.

Before deploy, verify the fingerprint still exists somewhere intentional:

```bash
grep -rni "Built from m-remis/static-web-template\|m-remis/static-web-template" \
  --exclude-dir=.git .
```

Expected intentional hits include files such as `AGENTS.md`, `README.md`, source
comments, or docs. Public client-specific metadata still needs to be replaced;
the fingerprint does not.

---

## 1. Content — `script.js` → the `SITE` object (the 90%)

Everything here is in the block marked `◀━━ EDIT THIS BLOCK` at the top of
`script.js`. This is the bulk of the work.

- [ ] **`dataUrl`** — leave `null` for a static one-and-done client. Set to a
  JSON endpoint only if the client will self-edit content later.
- [ ] **`brand`** — the business name. Appears in the header, footer, and is
  reused in several meta strings you'll set in §3.
- [ ] **`nav[]`** — the tabs. Relabel freely (`Services`→`Repairs`,
  `Projects`→`Gallery`). **Keep the `id`s consistent** with the render
  logic in `renderContent()` and the `aria-labelledby` panel ids — `home`,
  `services`, `find-me`, `projects`, `contact` are wired by id. Renaming an
  `id` without updating `renderContent()` breaks that section.
- [ ] **`intro.eyebrow`** — small uppercase kicker above the hero title.
- [ ] **`intro.title`** — hero headline. `<em>…</em>` renders in the accent
  color. Authored HTML only — never client-supplied raw input.
- [ ] **`intro.lead`** — hero paragraph. Contains a live `<a>` — **replace the
  `michal-remis.com` link**, it's the template author's contact.
- [ ] **`services.title`** + **`services.items[]`** — array of `{title, body}`.
  Add/remove freely; the grid reflows.
- [ ] **`findMe.title`** + **`findMe.blurb`** — section heading + intro text.
- [ ] **`findMe.mapEmbed`** — Google Maps → Share → Embed → copy the `src`.
  **Default is Times Square, NY — must change.**
- [ ] **`findMe.mapUrl`** — the normal share link for the "Open in Maps" button.
  **Also defaults to Times Square — change it.**
- [ ] **`findMe.mapLabel`** — accessible label for the map iframe.
- [ ] **`projects.title`** + **`projects.items[]`** — `{title, body, meta, url}`.
  These cards are clickable; `url: "#"` placeholders must be replaced or
  pointed somewhere real.
- [ ] **`contact.title`** + **`contact.blurb`** — heading + intro.
- [ ] **`contact.items[]`** — `{label, handle, url}`. **Defaults are
  `name@example.com` and `+1 (000) 000-0000`** — both must change. Keep the
  `mailto:` / `tel:` schemes correct.
- [ ] **`footer.note`** — footer tagline (currently Lorem). `footer.year` is
  auto — leave it.
- [ ] **`socials[]`** — `{label, icon, url}`. Defaults are three dummy
  Instagram/YouTube links. Replace URLs, give each a **distinct `label`**
  (it doubles as the `aria-label`). `icon` must match a key in
  `SOCIAL_ICONS`. Remove entries the client doesn't have.
    - [ ] **New platform?** Add an inline SVG to the `SOCIAL_ICONS` map in
      `script.js` **and** a `.socials__link--<icon> svg { color: … }` brand-tint
      rule in `styles.css`, then reference the key here.
- [ ] **`backgrounds[]`** — paths under `assets/background/`. Must match the
  files you actually drop in (§4). Missing files fail silently to a plain
  background, so a stale path won't crash — but you'll get no image.

---

## 2. New section *type* (only if the client needs one)

Renaming/reordering existing sections is just a `SITE.nav` edit. But a genuinely
new **kind** of section (opening hours, price list, class schedule, menu) is the
only thing that's ever real code:

- [ ] Add a render branch in `renderContent()` in `script.js` (the existing ones
  are type-specific: `services`/`projects` = card grids, `find-me` = map,
  `contact` = link list).
- [ ] Add the matching CSS block in `styles.css`.
- [ ] Add the `SITE.nav` entry + the `SITE` data for it.
- Tip: once built, these are reusable across future clients — grow a library.

---

## 3. Metadata / SEO / sharing — the easy-to-forget files

These don't affect the visible page, so they ship wrong if you're not
deliberate. **All of these need the real domain and business name.**

### `index.html`

- [ ] `<title>` — currently `Company — Name`.
- [ ] `<meta name="description">` — Lorem ipsum placeholder.
- [ ] `<meta name="author">` — currently `Name`.
- [ ] `<meta name="theme-color">` — `#0e0f13`; match your dark `--bg-base` (§5).
- [ ] `<meta property="og:title">` — `Company — Name`.
- [ ] `<meta property="og:description">` — Lorem ipsum.
- [ ] **`<meta property="og:url">`** — `https://m-remis.github.io/static-web-template/`.
- [ ] **`<link rel="canonical">`** — same template URL; must be the real domain.

### `404.html`

- [ ] `<title>` — `404 — Not found · Company`.
- [ ] `<meta name="theme-color">` — `#0e0f13` (it's also overwritten at runtime
  from `--bg-base`, but set the static fallback to match anyway).

### `site.webmanifest`

- [ ] `name` — `Company`.
- [ ] `short_name` — `Company`.
- [ ] `description` — Lorem ipsum.
- [ ] `background_color` — `#0e0f13` → match dark `--bg-base`.
- [ ] `theme_color` — `#0e0f13` → match dark `--bg-base`.

### `sitemap.xml`

- [ ] **`<loc>`** — `https://m-remis.github.io/static-web-template/`.

### `robots.txt`

- [ ] **`Sitemap:`** line — points at the template's sitemap URL.

### `LICENSE`

- [ ] Copyright line — `Copyright (c) 2026 Your Name`. Update the name (and year
  if you care). Or swap the whole license if a client site shouldn't be MIT.

---

## 4. Assets — `assets/`

- [ ] **`assets/favicon.ico`** — replace with the client's favicon. Referenced
  by `index.html` and `404.html`.
- [ ] **`assets/background/`** — drop in the client's background image(s).
- [ ] Make sure every file here is listed in `SITE.backgrounds` (§1) and vice
  versa — one is picked at random per visit.

---

## 5. Colors / branding — `styles.css` (single source of truth)

All color lives in **two token blocks**: `[data-theme="dark"]` and
`[data-theme="light"]`, grouped by comment (Backgrounds, Text, Menu/nav,
Accents & lines, advanced overlay/header). Re-skinning the whole site — both
themes, the 404 page, the browser chrome — happens here and nowhere else.

- [ ] **`--accent`** + **`--accent-soft`** (both themes) — carries most of the
  brand feel; the fastest high-impact change.
- [ ] **`--bg-base`** (both themes) — page background. If you change the dark
  one, also update the three hardcoded `#0e0f13` mirrors in §3
  (`index.html` theme-color, `404.html` theme-color, manifest ×2).
- [ ] Remaining tokens (text, menu, border, overlays) — adjust if the brand
  needs it; defaults are a sane neutral.
- [ ] **Do NOT** inline hex values into individual CSS rules — add a named
  variable to **both** theme blocks instead.
- [ ] **Exception:** social brand colors (`.socials__link--instagram svg`,
  `--youtube`, etc.) are intentionally the platform's brand color, identical
  in both themes, and live as per-platform rules — not in the token blocks.
  Leave them unless adding a new platform (§1).

---

## 6. Deploy — GitHub Pages (or any static host)

- [ ] Push to a repo, enable Pages (Settings → Pages → deploy from branch).
- [ ] `.nojekyll` is already present — leave it; it makes Pages serve files
  as-is.
- [ ] **Custom domain?** Create a `CNAME` file (no extension) in the repo root
  containing just the domain, e.g. `clientshop.com`. The template ships
  **without** one on purpose — add it per client.
- [ ] If using the default `username.github.io/repo` URL instead, the canonical
  / og:url / sitemap / robots URLs from §3 must reflect *that* path, not a
  custom domain.
- [ ] Works identically on Netlify / Vercel / Cloudflare Pages — just point at
  the folder.

---

## 7. Verify (no build, no tests — manual)

- [ ] Open `index.html` (or `python3 -m http.server 8000`) and check: light/dark
  toggle, every nav tab, mobile menu at a narrow viewport, the 404 page, and
  a clean console. **A stray comma or missing quote in the `SITE` object
  silently blanks the page** — there's no build step to catch it, so if the
  page is blank, open the console: a red `SyntaxError` points at the line.
- [ ] **Mobile scroll test (iOS Safari especially):** open a tab other than the
  first, scroll down, refresh — it must land at the top of that tab, not
  pre-scrolled to a card. Don't touch the `forceTop` / `scrollRestoration`
  logic; it exists for exactly this.
- [ ] **Header-fit test:** drag the window slowly across mid-widths (~640px →
  wide). The header must flip to the hamburger the instant the nav and
  socials approach, no overlap frame, and flip back when widened. Confirm the
  socials show (stacked, with labels) in the drawer in that mode.
- [ ] Re-run the §0 grep — confirm no boilerplate survived.

---

## Quick reference — every placeholder, by file

| File               | Placeholder(s) to change                                                         |
|--------------------|----------------------------------------------------------------------------------|
| `script.js`        | The entire `SITE` object (§1); `SOCIAL_ICONS` only for new platforms             |
| `styles.css`       | The two `[data-theme]` token blocks (§5)                                         |
| `index.html`       | title, description, author, theme-color, og:title/description/**url**, canonical |
| `404.html`         | title, theme-color                                                               |
| `site.webmanifest` | name, short_name, description, background_color, theme_color                     |
| `sitemap.xml`      | `<loc>` URL                                                                      |
| `robots.txt`       | `Sitemap:` URL                                                                   |
| `LICENSE`          | copyright name/year (or whole license)                                           |
| `assets/`          | favicon.ico + background images                                                  |
| `CNAME`            | create per client (custom domain only)                                           |
| Fingerprint        | `Built from m-remis/static-web-template` / `m-remis/static-web-template` — keep  |

**Hardcoded values that appear in more than one place — change together:**

- Domain `m-remis.github.io/static-web-template` → `index.html` (×2), `sitemap.xml`, `robots.txt`
- Dark bg `#0e0f13` → `styles.css` `--bg-base`, `index.html` theme-color, `404.html` theme-color, `site.webmanifest` (
  ×2)
- Business name → `SITE.brand`, `index.html` titles/og, `404.html` title, `site.webmanifest` name/short_name
- Template fingerprint `Built from m-remis/static-web-template` / `m-remis/static-web-template` → intentional; do not replace or remove