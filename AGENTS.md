# AGENTS.md

Guidance for AI coding agents working in this repository. Humans should read
`README.md` instead; this file exists so an agent can make correct changes
without rediscovering the structure each time.

## Start here (routing)

Pick the doc that matches your task — don't guess from filenames:

- **Changing what the site says** (text, tabs, contact, prices, images, socials,
  metadata) → it's almost always a `site-spec.json` edit. Read "The golden rule"
  and "The block engine" below.
- **Setting up a brand-new client site** → `CLIENT-CHECKLIST.md` (the per-client
  fill-in list, file by file).
- **Changing behavior or adding a content block type** → this file, sections
  "The block engine" and "Key functions in `engine.js`".
- **Checking a site is safe to ship** → run `node launch-check.js`; details in
  `LAUNCH-CHECK.md`.

Once you know the task, read its row in **"Workflows"** (right below) before
editing — it lists every file the change obligates, not just the obvious one.

**Hard rules (do not violate):**
1. No build step, no framework, no bundler, no npm dependency for the runtime
   site. Vanilla HTML/CSS/JS served as files.
2. Content is **never** hardcoded in `index.html` or `engine.js`. It lives in
   `site-spec.json`. The HTML is an empty shell.
3. Don't remove the `Built from m-remis/static-web-template` fingerprint.
4. After any change, validate: `node -e "JSON.parse(require('fs').readFileSync('site-spec.json','utf8'))"`,
   `node --check engine.js`, then `node launch-check.js`. (`site-spec.json` is
   also schema-checked live in the editor against `site-spec.schema.json` — keep
   that schema in sync when you add a block type or field.) Make the smallest
   change that satisfies the request; don't reformat unrelated code.

## Workflows (what a change obligates)

Most mistakes here are not wrong edits — they are *incomplete* ones: the code
changes but a doc, a mirror file, or the validator is left describing the old
world. This section maps each kind of task to the **full** set of edits it
requires, so a change lands consistent instead of drifting.

The rule of thumb: **if you change a fact, change every place that states it.**
A block type is stated in four places; a domain in five; a color in five. Pick
your task below and do the whole row, not just the first cell.

| If you're changing… | Go to workflow |
|---|---|
| site text, tabs, contact, prices, images, socials | **A — Content edit** |
| adding/removing/renaming a block *type* | **B — New block type** |
| a builder's accepted fields (no new type) | **C — Block fields change** |
| colors / theme tokens | **D — Theme/color edit** |
| domain, title, description, OG, metadata | **E — Metadata/domain edit** |
| a `launch-check.js` rule or category | **F — Validator change** |
| any engine behavior (tabs, menu, header-fit, …) | **G — Behavior change** |

Every workflow ends with the same gate: run the three validators from Hard Rule
4 and reach `launch-check` `PASS` (or only-expected warnings).

### Workflow A — Content edit (the 90% case)

**Trigger:** change what the site *says* — copy, a tab, a price row, a contact
handle, a slideshow image, a social link.

1. Edit `site-spec.json` only. Nothing in `engine.js`/`styles.css`/`index.html`
   should need to move for a pure content change.
2. If you added a social platform that isn't in `SOCIAL_ICONS` yet, that's not
   content — switch to **Workflow B**'s icon note.

**Ripple — also update:** usually nothing. Content lives in one file by design.
**Done when:** JSON parses, `launch-check` passes, the affected tab renders.

### Workflow B — Adding (or removing/renaming) a block *type*

**Trigger:** a genuinely new *kind* of content (e.g. `hours`, `faq`, `cta`), or
removing/renaming an existing type. This is the one content task that is real
code, and it touches **four places that must agree**.

> **Start from the skeleton:** `_block-template.md` has all four pieces
> (builder, CSS, validator stub, spec example) pre-written to the house style —
> copy it and rename `example` → your type rather than hand-writing from
> scratch. The steps below are what that template fills in.

1. **Engine:** write `buildX(block)` in `engine.js` (pure DOM builder — reads
   only its `block` arg, never `SITE`), and add `yourtype: buildX` to the
   `BLOCK_RENDERERS` map.
2. **Styles:** add the block's CSS in `styles.css`, themed via existing tokens.
3. **Engine docs (in-file):** add the block's shape to the `BLOCK TYPES` comment
   at the top of `engine.js`.
4. **Validator:** add the type to `BLOCK_RULES` in `launch-check.js` (and a
   `checkXBlock()` for its required fields if it has any). **Skipping this makes
   `launch-check` falsely flag every use of the new type as unknown.**
5. **Schema:** add the block's shape to `site-spec.schema.json` (a `blockX`
   subschema in `$defs`, add it to the `block.oneOf` list and the `type` enum)
   so the editor validates and autocompletes it. **Skipping this makes the IDE
   flag every use of the new type as an invalid block.**
6. **AGENTS.md:** add a row to the block-types table (section "Block types and
   their builders") and, if it's a notable function, the "Key functions" list.
7. **CLIENT-CHECKLIST.md:** if the type is something clients will commonly fill
   in, add it to the §1c per-block list.

**Ripple checklist — a new block type is not done until:** `BLOCK_RENDERERS`,
`BLOCK_RULES`, the `engine.js` `BLOCK TYPES` comment, `site-spec.schema.json`,
and the AGENTS.md table **all** list it. (Removing a type: delete from the same
five places, and grep
`site-spec.json` so no section still uses it.)
**Done when:** the four lists agree, `node --check engine.js` passes, a test
block of the new type renders, and `launch-check` doesn't warn "unknown type".

### Workflow C — Changing a block's accepted fields (no new type)

**Trigger:** a builder starts accepting a new field, or stops accepting one
(e.g. `gallery` gains a `columns` option).

1. **Engine:** change `buildX()` to read the field.
2. **Engine docs:** update that block's line in the `BLOCK TYPES` comment.
3. **Validator:** if the field is required, or has a constraint (range, enum),
   reflect it in the block's `checkXBlock()` in `launch-check.js`.
4. **AGENTS.md / CLIENT-CHECKLIST.md:** update the block's documented shape if
   the field is author-facing.

**Done when:** the `BLOCK TYPES` comment and any validator rule match the
builder's real behavior.

### Workflow D — Theme / color edit

**Trigger:** changing a color, especially `--bg-base`, or adding a token.

1. **Add to both theme blocks.** A new color is a named variable added under
   **both** `[data-theme="dark"]` and `[data-theme="light"]` in `styles.css` —
   never an inline hex in a rule. (Exception: per-platform social brand colors,
   which are intentionally identical across themes and live as their own rules.)
2. **If you changed dark `--bg-base`,** update its mirrors: `index.html`
   `theme-color`, `404.html` `theme-color`, `site.webmanifest` `theme_color`
   **and** `background_color`, and `meta.themeColor` in `site-spec.json`.

**Ripple — dark `--bg-base` is stated in 5 places.** Change them together.
**Done when:** light + dark both read correctly, the 404 page re-themes, and the
browser chrome color matches in both themes.

### Workflow E — Metadata / domain edit

**Trigger:** changing the domain, title, description, OG fields, or canonical.

1. **`site-spec.json` → `meta` is the source of truth.** Edit it there first;
   `renderHead()` drives the live `<head>` from it.
2. **Mirror the static fallback in `index.html`** (title, description, author,
   og:*, canonical) — crawlers that don't run JS read these.
3. **If the domain changed,** also update `sitemap.xml` `<loc>`, `robots.txt`
   `Sitemap:`, the `index.html` canonical + `og:url`, and `CNAME` if present.

**Ripple — the domain is stated in ~5 places, and `launch-check` cross-checks
them.** A mismatch is a hard failure, which is the safety net here.
**Done when:** `launch-check` reports no domain/metadata mismatch.

### Workflow F — Validator change (`launch-check.js`)

**Trigger:** adding/changing a check, a category, a flag, or an error code.

1. **Code:** add the `checkX()` and call it from `main()`; reuse an existing
   category (`missing, spec, content, links, seo, manifest, assets,
   accessibility, performance`) and give the finding a stable uppercase `code`.
2. **Docs:** update `LAUNCH-CHECK.md` — the "What it checks" list, and the
   category/flag/code references if you touched those.
3. **Keep it dependency-free, offline, CommonJS.** If a check needs a parser,
   network, or npm package, it doesn't belong here.

**Ripple:** a new category or flag must appear in `LAUNCH-CHECK.md`, not just
the code. **Done when:** the script runs, and its docs describe what it now does.

### Workflow G — Behavior change (engine internals)

**Trigger:** changing tabs, theme, mobile menu, header-fit, background,
lightbox, scroll handling, etc.

1. **Edit the relevant `init*`/`build*` function in `engine.js`.**
2. **Check the "Constraints / gotchas" section** before touching scroll
   handling, header-fit, or the mobile drawer — several behaviors are load-
   bearing and look like dead code (e.g. the `forceTop` scroll re-assertion).
   If you change one, update its gotcha note so the next agent knows why.
3. **Update "Key functions in `engine.js`"** if you add/rename/remove a function
   or change what it does.
4. **Run the manual checks in "How to verify a change"** — behavior changes are
   exactly what `launch-check` *can't* catch (it validates the spec, not the
   rendered result).

**Done when:** the relevant manual checks pass and any gotcha/function doc you
invalidated is updated.

### The drift rule (why this section exists)

This engine has already drifted once: the code grew `gallery`, `photo`, and
`meta.analytics` while the docs and validator still described the older,
smaller world. The block-type list living in four places is the canonical
example — treat "I changed a fact in one place" as a prompt to grep for the
others. When in doubt, `grep -rn "<the thing>" --exclude-dir=.git .` and fix
every hit that states the old value.


## What this project is

A static personal/business site, built from a no-build template. **No build
step, no framework, no bundler, no package manager.** It is plain HTML + CSS +
vanilla JS (ES modules) served as files. Do not introduce npm, bundlers,
transpilers, TypeScript, frameworks, or a `package.json` for the *runtime site*.
If a change seems to "need" tooling, it is the wrong change — find the no-build
way to do it. (The `launch-check.js` preflight script is a dev-only tool run by
hand, never loaded by the page, and uses only Node built-ins — see
`LAUNCH-CHECK.md`.)

The only runtime dependencies are the Google Fonts `<link>` (Inter, Instrument
Serif, Oswald) and the site's own ES modules. `engine.js` is loaded as
`<script type="module">` and imports the skull mascot module; keep it a module.

###### Template fingerprint / attribution

This project intentionally carries a small searchable fingerprint:

```text
Built from m-remis/static-web-template
```

and the repository identifier:

```text
m-remis/static-web-template
```

Do **not** remove, rename, rewrite, hide, minify away, or "clean up" these
references unless the repository owner explicitly asks for a white-label build.
It is source attribution and a searchable marker, not forgotten boilerplate.
Accepted forms are source comments / docs, not visible UI (unless a visible
credit was explicitly requested):

- HTML: `<!-- Built from m-remis/static-web-template -->`
- CSS / JS: `/* Built from m-remis/static-web-template */`
- Markdown: `<!-- Built from m-remis/static-web-template -->`

These strings currently live in `index.html`, `404.html` (via shared assets),
`engine.js`, `styles.css`, `README.md`, `CLIENT-CHECKLIST.md`, and this file.
Preserve them when rewriting any of those, and add an equivalent comment to any
new major source/doc file. Do not add them to the placeholder audit grep.

## The golden rule

Almost every content change goes in **one place**: `site-spec.json`. It is the
single source of truth for content. The HTML is an empty shell; the brand,
nav/tabs, every section, the footer, the socials, the background list, and even
the document `<head>` metadata are all rendered from `site-spec.json` by JS at
runtime. Before editing markup or CSS, check whether the request is actually a
`site-spec.json` edit.

> **Spinning up a new client site?** Follow `CLIENT-CHECKLIST.md` — the
> exhaustive per-client change list (every spec field, the multi-file domain
> and `#0e0f13` mirrors, the pre-deploy audit). This file (`AGENTS.md`) covers
> *how the project works*; that file covers *what to fill in per client*.

- Change brand, nav tabs, any section's content, contact rows, map, price
  tables, slideshows, background list → edit `site-spec.json`. Do **not**
  hardcode this content into `index.html` or `engine.js`.
- Change social links → edit `site-spec.json` → `socials`. Each entry is
  `{ label, icon, url }`; `icon` must match a key in the `SOCIAL_ICONS` map in
  `engine.js`.
- Change page metadata (title, description, OG, theme-color, canonical) →
  edit `site-spec.json` → `meta` (see "Content loading & metadata" below). The
  matching tags in `index.html` are only a static fallback for crawlers; keep
  them roughly in sync but treat `meta` as authoritative.
- Change colors/theme → edit the token blocks in `styles.css` (see below).
- Add a brand-new *kind* of content block → small JS edit (a builder + one line
  in `BLOCK_RENDERERS`); see "Adding a NEW block type" below.
- Change layout/behavior → edit the relevant builder/init function in
  `engine.js` or the matching CSS rule.

## File map

| File                                            | Role                                                          | Edit when                          |
|-------------------------------------------------|---------------------------------------------------------------|------------------------------------|
| `site-spec.json`                                | **All site content + metadata** (single source of truth)      | content, copy, metadata, per-client|
| `engine.js`                                     | Runtime engine: block builders + render + all UI logic        | behavior, new block types          |
| `styles.css`                                    | All styling + the two theme token blocks                      | colors, layout                     |
| `index.html`                                    | Shell only; header skeleton + empty `#main`/`#siteFooter` + fallback meta | rarely (font links, fallback meta) |
| `404.html` / `404.css`                          | Not-found page; **inherits theme tokens from `styles.css`**   | layout of 404 only                 |
| `animation/skull/`                              | Header mascot: `skull.js` (ES module), `skull.css`, `assets/` | mascot behavior/art                |
| `CLIENT-CHECKLIST.md`                           | Per-client replacement + deploy checklist                     | client-site handoff rules          |
| `launch-check.js` / `LAUNCH-CHECK.md`           | Pre-launch validator (dev-only, never served) + its docs      | before shipping; adding a block type|
| `_block-template.md`                            | Copyable skeleton for a new block type (not served)           | adding a block type (Workflow B)   |
| `site.webmanifest`, `sitemap.xml`, `robots.txt` | PWA + SEO                                                     | domain/name changes                |
| `assets/`                                       | favicon, `background/` images, `slides/` images               | swapping media                     |

## Content loading & metadata — JSON is the single source of truth

There is **no inline content** in `engine.js`. On boot, `init()` calls
`loadContent()`, which `fetch`es `site-spec.json` (the path is the `DATA_URL`
constant at the top of `engine.js`) and parses it into the module-level `SITE`
object. `SITE` starts as `{}` and is assigned the parsed JSON — there is no
inline fallback content and no `deepMerge`. (The old `dataUrl`/`deepMerge`
"inline + optional override" model is gone; do not reintroduce it.)

Three failure modes all end at the same calm error screen
(`renderErrorState()`), and the page must never blank or throw:

- **`fetch`** — the file couldn't be loaded (404 / network / `file://` CORS).
- **`parse`** — it loaded but wasn't valid JSON.
- **`empty`** — it parsed fine but had no usable `sections` (see `getSections()`,
  which drops entries without an `id`).

Because the page is served as static files, `site-spec.json` must be reachable
over `http://`. Opening `index.html` over `file://` will fail the fetch (CORS)
and show the error screen — serve locally with `python3 -m http.server 8000`.

### `site-spec.json` shape

```jsonc
{
  "brand": "RustCust",
  "brandImage": "assets/logo.png", // optional: PNG logo replaces the header text; "brand" still feeds alt text + footer
  "meta": {
    "lang": "sk",
    "domain": "https://www.rustcust.sk/",
    "title": "…",
    "description": "…",
    "ogDescription": "…",   // optional; falls back to description
    "author": "…",
    "themeColor": "#0e0f13",
    "ogType": "website",
    "ogImage": "assets/social/og-image.jpg", // optional; og:image only emitted if present
    "twitterCard": "summary",
    "analytics": {           // optional; drives the footer visitor count only
      "countUrl": "https://<site>.goatcounter.com/counter/TOTAL.json",
      "countLabel": "návštev",        // optional suffix after the number
      "dashboardUrl": "https://<site>.goatcounter.com"  // optional; makes the count a link
    }
  },
  "business": {              // single source of truth for contact/legal data; blocks reference it by key
    "legalName": "…",
    "ico": "…", "dic": "…",  // company / tax IDs
    "phone": "…", "email": "…",
    "address": { "street": "…", "city": "…", "postalCode": "…", "country": "…", "label": "…" },
    "mapUrl": "…", "mapEmbed": "…",   // used by the map block's fallback
    "hours": {               // optional; rendered by the "hours" block, which highlights today
      "mon": "9:00–17:00", "tue": "9:00–17:00", "wed": "9:00–17:00",
      "thu": "9:00–17:00", "fri": "9:00–17:00",
      "sat": "Na objednávku", "sun": "Zatvorené"   // free-form value strings; missing day → dash row
    }
  },
  "sections": [               // ORDERED — order IS the nav order AND the page order
    {
      "id": "home",           // unique; required; used in the URL hash + tab id
      "label": "Domov",       // text shown in the nav tab
      "title": "Optional",    // optional <h2> heading at the top of the section
      "blocks": [ /* ordered content blocks, each { "type": … } */ ]
    }
  ],
  "footer":  { "note": "…", "year": 2026 },  // year optional; JS fills the current year
  "socials": [ { "label": "…", "icon": "instagram", "url": "…" } ],
  "backgrounds": [ "assets/background/bg.jpg", "…" ]
}
```

`renderHead()` drives the document `<head>` from `meta`: `<html lang>`,
`<title>`, `description`, `author`, `theme-color`, `twitter:card`, the Open
Graph tags (`og:type`, `og:title`, `og:description`, `og:url`, and `og:image`
**only if `meta.ogImage` is set**), and the canonical link. It upserts one tag
per key, so it's safe to re-run and won't duplicate tags. The corresponding
tags hardcoded in `index.html` are an SSR-style fallback for crawlers that don't
run JS — edit `meta` as the real source and keep the HTML fallback approximately
matching.

## The block engine (how sections work) — the core mental model

This is the biggest thing to understand and the part most likely to be edited.
Sections are **not** hardcoded per-tab layouts, and there is no per-section
special-casing anywhere (no `renderContent()` branch per section id). A section
is an ordered list of typed content blocks rendered by a generic dispatch.

- `sections` is an **ordered array**. Each entry is
  `{ id, label, title?, blocks: [ … ] }`. Order in the array is both the nav
  order and the on-page order. There is no separate `nav` list to keep in sync —
  the tabs are derived from `sections` by `navItems()`.
- A section renders as its optional `title` heading followed by its `blocks`, in
  order. To rearrange a section, reorder its `blocks`.

`renderContent()` iterates the sections (via `getSections()`) and calls
`buildSection(section)` for each. `buildSection()` renders the optional
`<h2 class="section__title">`, then for each block calls `renderBlock(block)`
and wraps the result in a `<div class="block">`.

### Block types and their builders

`renderBlock()` looks up `block.type` in the `BLOCK_RENDERERS` map and calls the
matching `buildX(block)` function. Most builders are **pure DOM builders** (read
only their `block` argument, never `SITE`) and return a node, a fragment, or
`null`. The exceptions read single-source-of-truth data from `SITE.business` via
`getBusiness()`: `map` (address/embed fallback) and `hours` (the week of opening
times). A new block should stay pure unless it renders SSOT business data.
Current types:

| `type`       | Builder          | Produces                                                                 |
|--------------|------------------|--------------------------------------------------------------------------|
| `hero`       | `buildHero`      | eyebrow + big `<h1>` headline + lead paragraph                           |
| `text`       | `buildText`      | a `.prose` paragraph (trusted inline `<em>`/`<a>` allowed)               |
| `cards`      | `buildCards`     | responsive card grid; `linked: true` + item `url` makes each a link; item `icon` adds a monochrome icon (black-on-transparent PNG, dark-theme auto-invert) |
| `links`      | `buildLinks`     | contact link rows: icon, kind label over value, arrow cue; `layout: "grid"` = tiles |
| `map`        | `buildMap`       | `mode: "embed"` live iframe, or `mode: "static"` themed address card     |
| `slideshow`  | `buildCarousel`  | 1 slide = framed image; 2+ = carousel w/ prev/next, dots, ARIA, lightbox |
| `table`      | `buildTable`     | structured table (price list etc.); last column accent-styled            |
| `faq`        | `buildFaq`       | accordion of `items` of `{ q, a }`; native button toggles, ARIA-wired    |
| `gallery`    | `buildGallery`   | paged responsive image grid (opt. `columns` 1–6, `perPage` default 12); image-only tiles; shares the slideshow lightbox across pages|
| `photo`      | `buildPhoto`     | single-image sugar; normalizes to a one-image `gallery`                  |
| `hours`      | `buildHours`     | opening hours; reads `business.hours` (SSOT), highlights the current day |
| `review`     | `buildReview`    | leave-a-review CTAs to external platforms (`items` of `{ label, url, platform? }`); outbound links only, no backend |

The exact block shapes are documented in the long comment at the top of
`engine.js` (the `BLOCK TYPES` section). Keep that comment in sync if you change
a builder's accepted fields. Note `block.type` lives on each **block**, not on
the section — a section never has a `type`.

### Adding a NEW block type

Adding a new *kind* of content (e.g. `hours`, `faq`, `cta`) is the only content
task that is real code, and it touches four places that must stay in agreement
(engine renderer, validator rules, the `BLOCK TYPES` comment, and the table
below). The full step-by-step — including the ripple checklist that keeps those
four in sync — is **Workflow B** in the "Workflows" section near the top of this
file, and `_block-template.md` is the copyable skeleton to start from. Follow
them rather than ad-hoc editing.

Engine behavior worth knowing while you do: unknown block types are skipped with
a `console.warn`, not thrown — a typo never blanks the page. Once built, a block
is reusable across all future clients; growing a tested block library is the real
product value.

### Block width

Every block is wrapped in a single `.block` element and fills the one content
column (CSS variable `--content-width`, ≈56rem), centered with the page gutter
holding it off the screen edges on small viewports. There are no width tiers and
no per-block `width` field — all blocks share one consistent left edge across
the site. Vertical rhythm between blocks is one rule:
`.block + .block { margin-top: var(--block-gap); }`. Adding a block type needs no
new spacing CSS. If a specific block ever needs to be narrower (e.g. a centered
prose column), constrain it inside that block's own builder/CSS, not via a spec
field.

## Theming (single source of truth)

Colors live only in `styles.css` under `[data-theme="dark"]` and
`[data-theme="light"]`, grouped by comment: Backgrounds, Text, Menu / nav,
Accents & lines, an "advanced" overlay/header group, and a small Carousel group.
There is intentionally **no duplication**:

- `404.html` loads `styles.css`, so the 404 page re-themes automatically. Do
  not re-add color variables to `404.css` — keep it layout-only.
- The browser `theme-color` meta is read from the `--bg-base` token at runtime
  (in `applyTheme()` in `engine.js`, and inline in `404.html`). Do not hardcode
  hex for it. Note `meta.themeColor` in `site-spec.json` is the *initial/static*
  value `renderHead()` writes; `applyTheme()` then keeps it in sync with the
  active theme's `--bg-base`.

Three fonts are tokenized: `--font-sans` (Inter, body), `--font-serif` (Oswald,
headings — bold/condensed/uppercase), and `--font-brand` (Instrument Serif, the
italic brand wordmark only). When adding a color, add a named variable to
**both** theme blocks rather than inlining a hex in a rule.

**Theme default:** dark. `initTheme()` uses the stored `localStorage` choice if
present, else falls back to dark. (It does **not** follow the OS
`prefers-color-scheme` — that's intentional in this build.) `404.html` mirrors
the same dark-default + stored-pref logic inline.

**Exceptions — brand colors (NOT theme tokens).** Two sets of per-platform brand
colors live as standalone rules, identical in light and dark mode:

- Header/drawer socials: `.socials__link--<icon> svg { color: … }`
  (Instagram pink, YouTube red, plus phone green / email blue).
- Contact-row icons (the `links` block): `.link-list--<icon> .link-list__icon
  { color: … }` (phone green, email blue, Instagram pink). These are applied via
  a `link-list--<icon>` class that `buildLinks()` puts on each `<a>` from the
  item's `icon` field, and they are deliberately **kept on hover** — there is no
  longer a hover→accent rule on contact icons. Don't reintroduce one.

## Key functions in `engine.js`

- `init()` (async) — boot: `await loadContent()` → assign `SITE` →
  `renderHead()` (always, so metadata is right even on the error screen) → if no
  usable sections, `renderErrorState()` + minimal init and return; otherwise
  `renderNav()`, `renderContent()`, `renderFooter()`, `initInputMode()`,
  `initTheme()`, `initMobileMenu()`, `initHeaderFit()`, `initTabs()`,
  `initBackground()`, and finally `initSkull()` (wrapped in try/catch so a
  mascot failure can't break the page).
- `loadContent()` — fetch + parse `site-spec.json`; returns `{data, error}`
  with `error.kind` of `fetch` / `parse`; never throws.
- `getSections()` — the normalized, guarded ordered section list. Drops entries
  without an `id`. Every render path and the tab logic go through it, so a
  missing/empty `sections` degrades to the empty/error state instead of throwing.
- `navItems()` — derives the tab list from `getSections()` (id + label).
- Builders: `buildHero`, `buildText`, `buildCards`, `buildLinks`, `buildMap`,
  `buildTable`, `buildCarousel` (slideshow), `buildGallery`, `buildPhoto`, `buildHours`, `buildFaq`, plus
  `buildSocials` (header/drawer socials).
- Dispatch: `BLOCK_RENDERERS`, `renderBlock()`,
  `buildSection()`, `renderContent()`.
- `renderHead()` — writes `<head>` metadata from `SITE.meta` (see above).
- `renderNav()` — builds `.brand-wrap` (skull + brand + optional socials),
  the desktop ARIA tablist, the mobile nav, and a second socials copy in the
  drawer.
- `renderErrorState(reason)` — the calm "temporarily unavailable" screen with a
  contact escape hatch (from `socials`, if any survived) and a collapsed
  `<details>` with the technical reason for the maintainer.
- `initTheme()` / `applyTheme()` — dark-default theme toggle + `localStorage`.
- `initTabs()` — section-as-tab switching, hash routing, keyboard arrows on the
  desktop tablist, and scroll-position control (see the scroll gotcha below).
- `initMobileMenu()` — frosted drawer; injects its own close (`×`) button,
  scrim, Escape-to-close, close-on-link-tap, and auto-close when resized up to
  desktop.
- `initHeaderFit()` — measures the header row and switches to mobile mode when
  the left cluster and the nav would touch (see the header-fit gotcha below).
- `initBackground()` — dual-layer crossfading background with Ken Burns drift
  (see the background section below).
- `getLightbox()` — shared image-preview overlay reused by the slideshow, the
  `gallery`, and `photo` (all feed it via `toLightboxSlides()`).
- `renderFooter()` — `© year brand` + footer note, plus an optional visitor
  count when `meta.analytics.countUrl` is set. `renderVisitorCount()` fetches
  the GoatCounter-style JSON count best-effort (any failure leaves the footer
  untouched, never throws). The actual *tracking* is the separate GoatCounter
  `<script>` in `index.html`; this only displays the number.
- Helpers: `$` (querySelector), `el()` (attribute-aware element builder; skips
  `null`/`false`/`undefined` attrs), `isExternalUrl()`, `escapeAttr()`.

## The skull mascot

`index.html` ships a `<span id="headerSkull">` (a `role="button"` mascot image)
as the first child of the header, before `#brand`. `renderNav()` moves it into
the `.brand-wrap` cluster so header-fit measures skull + brand + socials as one
unit. Its behavior lives in the ES module `animation/skull/skull.js`
(`initSkull`, imported at the top of `engine.js`) with styles in
`animation/skull/skull.css` (linked from `index.html`) and art in
`animation/skull/assets/`. The 404 page reuses a skull image (`icon_dizzy.png`)
with its own shake animation in `404.css`. `initSkull()` is called last in
`init()` inside a try/catch — keep that guard so a mascot error never takes down
the site.

## Socials

Social links render in two places from the single `SITE.socials` array, both via
`buildSocials()`:

- **Header** (desktop): colored icon + visible label next to the brand, inside
  `.brand-wrap`.
- **Mobile drawer**: a second `buildSocials()` call appends the same links to the
  bottom of `#navMobile`, stacked one per row.

Icons are inline SVGs in the `SOCIAL_ICONS` map in `engine.js` (no icon library
— that would break the no-deps rule). The same map is reused by the `links`
block for the optional leading contact icon. Each SVG uses `currentColor`; the
per-platform `.socials__link--<icon> svg` rule sets the brand tint. `label`
doubles as the `aria-label`, so give each entry a distinct label. To add a
platform: add an SVG to `SOCIAL_ICONS`, add a `.socials__link--<icon> svg
{ color: … }` rule (and, if it'll be used in a contact row, a
`.link-list--<icon> .link-list__icon` rule), then reference the key.

## Header fit (left cluster ↔ nav collision) — don't "simplify" this

The header packs the left cluster (skull + brand + socials), the desktop nav,
and the toggles onto one row. CSS can't detect when two flex items are about to
touch, so `initHeaderFit()` measures it: it reads the gap between the rightmost
item in the left cluster and the first nav tab (`getBoundingClientRect()`), and
when that gap drops below `BUFFER` px it adds `.force-mobile-nav` to the header.
That class hides the desktop nav AND the header socials and shows the hamburger;
the socials remain reachable in the drawer. Growing the window back removes it.

Things that must stay consistent or this breaks:

- The left cluster keeps its natural width — `.brand-wrap` is `flex: none` and
  `.socials` has **no** `overflow: hidden` / shrink. Clipping or shrinking the
  socials would hide the collision from the measurement so the switch never
  fires. Don't add it.
- The rightmost-edge element is the last social link when socials exist, else
  `brandWrap.lastElementChild` (so header-fit still works with zero socials).
  Keep that fallback.
- `.force-mobile-nav` and the `@media (max-width: 640px)` block are parallel
  triggers for the same mobile mode (CSS can't `@media` on a class). Both hide
  `.nav-desktop` and `.brand-wrap .socials` and show `.menu-toggle` — keep them
  in sync.
- `BUFFER` is the one dial for how early/late it flips. Don't replace the
  geometry measurement with a guessed pixel breakpoint; the point is that it
  reacts to real layout (font loading, label lengths, nav contents). The measure
  re-runs on resize and once `document.fonts.ready` resolves.

## Background (dual-layer crossfade)

`index.html` has two layers, `#bg` and `#bg2`. `initBackground()` preloads each
image, sets it on the back layer, then crossfades by toggling `.is-active`
(opacity), cycling through `SITE.backgrounds` in order on a timer (`HOLD`). Each
active layer runs the `bg-drift` Ken Burns zoom. With only one layer present it
degrades to a single static image; missing image files fail silently to the
plain background. `prefers-reduced-motion` disables the drift.

## Constraints / gotchas

- Keep it accessible: real `<button>`s, ARIA tab roles (desktop nav is a real
  tablist; the carousel dots are a tablist), keyboard arrow nav, skip link,
  focus styles gated behind `body.keyboard-nav` (toggled by `initInputMode()`),
  `prefers-reduced-motion` guards. Don't regress these.
- No external runtime deps beyond the Google Fonts `<link>` and the site's own
  modules. Don't add CDNs.
- `engine.js` is an ES module (`import { initSkull }`). Keep `index.html`'s
  `<script type="module">`. Opening `index.html` over `file://` hits both module
  CORS *and* the `site-spec.json` fetch CORS in most browsers; serve over
  `http://` (`python3 -m http.server 8000`) when testing locally.
- The site must otherwise work on any static host with no server-side
  assumptions.
- Block text (hero `title`/`lead`, `text`, table cells, captions, footer note)
  intentionally allows trusted inline HTML (`<em>`, `<a>`) and is injected as
  HTML. Keep these values authored, never user-supplied raw input, unless
  sanitized. Image `alt` is built through `escapeAttr()` defensively.
- **Scroll position on load is handled deliberately — don't "simplify" it.**
  Because content is rendered by JS after load, the browser's automatic scroll
  restoration anchors to a nearby element before content exists, which on mobile
  (especially iOS Safari) shows up as a "pre-scroll" to a random card on
  refresh. Four things work together and must be kept: (1)
  `history.scrollRestoration = "manual"` at the top of `initTabs()`; (2) the
  `forceTop` branch in `show()`, which re-asserts `scrollTo(0,0)` across several
  frames, a `setTimeout`, and the `window` `load` event — iOS only partially
  honors `manual`, so one top-scroll isn't enough; (3) `overflow-anchor: none`
  on `body`; and (4) `scrollbar-gutter: stable` on `html` (with an
  `overflow-y: scroll` fallback), so switching between short and tall tabs
  doesn't add/remove the scrollbar and shift the centered layout. The initial
  `show()` passes `forceTop: true`; normal tab clicks use the plain single
  top-scroll — keep that split.
- Mobile drawer open state sets `body.menu-open`, which only touches
  `overflow-x` — do **not** lock vertical `overflow` there; on some mobile
  browsers that changes the viewport calc and visually shifts the centered
  content.

## How to verify a change

There are no tests and no build. After editing:

1. Validate the spec and engine before anything else:
    - `node -e "JSON.parse(require('fs').readFileSync('site-spec.json','utf8'))"`
      — a stray comma or missing quote in `site-spec.json` makes the fetch parse
      fail and shows the **error screen** (not a blank page); this catches it
      fast with a line/column.
    - `node --check engine.js` to catch JS syntax errors.
    - Run `node launch-check.js` for a fuller preflight (placeholders, fake
      contact data, broken/missing/unused assets, SEO, domain/metadata
      consistency); drive it to `PASS`. See `LAUNCH-CHECK.md` for flags and the
      full check list.
2. Serve and open the site — prefer `python3 -m http.server 8000` over
   `file://` (the page fetches `site-spec.json`; `file://` fails CORS and shows
   the error screen). Check: light/dark toggle, every nav tab, each block type
   renders (hero, text, cards, links/contact icons, map, slideshow, table, faq,
   gallery, photo), the
   mobile menu at a narrow viewport, the 404 page (`/404.html`), the skull
   mascot, and a clean console.
3. On mobile (or a touch-emulated narrow viewport, ideally iOS Safari): open a
   tab other than the first, scroll down, refresh. It must land at the top of
   that tab, not pre-scrolled to a card. This regresses easily — see the scroll
   gotcha.
4. Drag the window slowly across the mid-widths (~640px up to wide desktop): the
   header must flip to the hamburger the instant the left cluster and the nav
   approach each other, no overlap frame, and flip back when widened. Confirm
   the socials appear (stacked, with labels) in the drawer in that mode.
5. Tables: confirm the desktop table scrolls sideways if very wide, and that on
   ≤640px each row collapses into a stacked card (a long row must not force
   horizontal page scroll).

Make the smallest change that satisfies the request, match the existing style,
and don't reformat unrelated code.

<!-- Built from m-remis/static-web-template -->