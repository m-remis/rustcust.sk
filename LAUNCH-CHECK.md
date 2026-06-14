# LAUNCH-CHECK.md

Documentation for `launch-check.js` — the pre-launch validator for sites built
on this engine.

> Companion to `AGENTS.md` (how the engine works) and `CLIENT-CHECKLIST.md`
> (what to fill in per client). This file documents one thing: the preflight
> script that tells you whether a site is safe to ship.

## What it is

`launch-check.js` is a **dev-only preflight inspector**. It reads the project
files, runs a series of sanity checks, prints a grouped report, and exits with
a status code you can act on. It catches the boring, expensive, embarrassing
mistakes that ship silently because the page still *renders* fine — fake
contact data, leftover placeholder text, broken asset paths, a domain that
doesn't match across files, a missing social-share image.

It is **not** loaded by the website. It never runs in the browser. It is a tool
you run by hand (or in CI) before delivering a site.

Design constraints, all intentional:

- **Zero dependencies.** Node built-ins only (`fs`, `path`, `process`). No npm
  install, no `package.json` needed.
- **CommonJS**, not ES modules — runs with plain `node`, no `"type": "module"`.
- **Offline and deterministic.** No network calls, no live-URL crawling. It
  inspects local files only, so it's fast (~tens of ms) and never flaky.
- **Heuristic, not exhaustive.** It pattern-matches "does this look fake / left
  over / inconsistent." It will occasionally false-positive, and it can miss a
  novel placeholder phrase. That's an accepted tradeoff for a fast preflight —
  it's a nudge, not a proof.

## How to run it

From the project root:

```bash
node launch-check.js                 # human-readable report
node launch-check.js --json          # machine-readable JSON (for CI/tooling)
node launch-check.js --strict        # treat warnings as blocking failures too
node launch-check.js --help          # usage
```

Other flags (all optional):

```text
--root <dir>            Check another folder instead of the cwd.
--site-spec <file>      Use a different spec file. Default: site-spec.json
--no-unused-assets      Don't warn about unreferenced files under assets/.
--max-image-kb <n>      Warn when an image asset exceeds n KB. Default: 900
--max-css-kb <n>        Warn when a CSS file exceeds n KB. Default: 250
--max-js-kb <n>         Warn when a JS file exceeds n KB. Default: 250
```

It must be run **from the repo root** (or pointed at a folder with `--root`) —
it inspects files on disk relative to that root.

### Exit codes

```text
0  pass — no blocking errors (warnings may still be present)
1  fail — blocking errors found
```

Warnings never affect the exit code by default. Only errors block — **unless**
you pass `--strict`, which promotes warnings to blocking failures (a useful
hard gate in CI).

### Output modes

**Text (default).** `PASS` or `FAIL`, followed by errors and warnings grouped
by category:

```text
FAIL

Errors:

[content]
- Placeholder text found at $.sections[0].blocks[0].lead: "Bla bla bla …"
- Email looks fake or invalid: r@r.sk

[manifest]
- Manifest icon path does not exist as written: /web-app-manifest-192x192.png …

Warnings:

[assets]
- Unused asset: assets/slides/custom_5.jpg
```

**JSON (`--json`).** A stable shape for CI or other tooling:

```json
{
  "status": "fail",
  "ok": false,
  "counts": { "errors": 8, "warnings": 4 },
  "errors":   [ { "category": "content", "code": "EMAIL_FAKE", "message": "…" }, … ],
  "warnings": [ { "category": "assets",  "code": "UNUSED_ASSET", "message": "…" }, … ]
}
```

Each finding carries a stable `category`, a stable machine `code` (e.g.
`EMAIL_FAKE`, `MANIFEST_ICON_WRONG_PATH`, `UNUSED_ASSET`), and a human
`message`. The `code` is the thing to match on in tooling — the message wording
may change, the code won't.

`status`/`ok` give a quick branch, `counts` supports thresholds, and the arrays
carry the detail. The exit code matches the status in both modes, so CI can
rely on either.

## Errors vs warnings

- **Errors block the launch** (exit 1). These are things that are broken or
  obviously wrong: missing required files, invalid JSON, fake/placeholder
  content, broken asset/icon paths, a domain mismatch between files.
- **Warnings don't block** (exit stays 0). These are things worth a look but
  not necessarily wrong: unused image files, a stale metadata fallback (the
  engine overwrites it at runtime), missing image descriptions, very short hero
  copy. Some warnings are judgment calls — e.g. a `CNAME` host differing from
  `meta.domain` is flagged because it's *usually* a mistake, but is legitimate
  for www↔apex redirect setups.

## What it checks, by file

`meta` in `site-spec.json` is treated as the **single source of truth**; the
other files are checked for agreement with it. The spec is walked
**recursively**, so contact data and asset references are found wherever they
live in the structure (a phone in a `links` block, an IČO in a `table` row).

### Required files (presence)

Fails if any are missing: `index.html`, `styles.css`, `site-spec.json`,
`site.webmanifest`, `robots.txt`, `sitemap.xml`, and a runtime script
(`engine.js` or `script.js`).

### `site-spec.json`

- **Valid JSON** — a parse error is a hard fail and stops the run.
- **Shape** — `sections` is a non-empty array; every section has a unique `id`;
  no duplicate ids; `label` present (warning if not). Note `type` lives on
  **blocks**, not sections.
- **Block types** — each block's `type` must be one the engine knows
  (`hero, text, cards, links, map, slideshow, table, faq, gallery, photo, hours,
  review`). An unknown type is flagged because the engine silently skips it. The
  known list is `BLOCK_RULES` near the top of `launch-check.js` — keep it in sync
  with `BLOCK_RENDERERS` in `engine.js` when you add a block type.
- **Block required fields** — `table` needs `headings` + `rows`; `cards` and
  `links` need `items`; `slideshow` needs `slides`; `gallery` needs `images`
  (and `columns`, if set, must be 1–6); `photo` needs `src`; `map` needs `url`
  or `embed`; `faq` needs `items` (each with `q` + `a`); `review` needs `items`
  (each with `label` + `url`); `hours` reads `business.hours` rather than its own
  fields; etc. (a builder returns nothing on bad input, so these would vanish).
- **Placeholder text** — scans every string for filler markers (`lorem`,
  `bla bla`, `nejaky`, `tbd`, `placeholder`, …) and reports the JSON path.
- **Contact data** — emails (fake/invalid patterns like `r@r.sk`), phones (too
  short, all-zeros, sequential dummy), Slovak IČO (8 digits) and DIČ (10 digits)
  when present.
- **Content quality** (warnings) — very short hero lead; a pricing-looking
  section with no price-like content.
- **Image alt / accessibility** (errors in the `accessibility` category) —
  slideshow slides, gallery images, and photos with no `title`/`caption`/`text`
  to derive alt text from.

### `index.html`

- **SEO basics** (errors) — non-empty `<title>`, a description meta, a favicon
  link, and an `og:image` (either here or via `meta.ogImage`).
- **Optional SEO** (warnings) — `og:title`, `og:description`, `<html lang>`,
  canonical link.
- **Domain match** (errors) — canonical and `og:url` must equal `meta.domain`.
- **Metadata consistency** (warnings) — the static fallback tags (title,
  description, author, og:*, twitter:card, theme-color, lang) should match
  `meta`. They're a crawler fallback the engine overwrites at runtime, so drift
  isn't fatal — but crawlers that don't run JS see the stale value.
- **Asset references** — any `assets/` image referenced here must exist.

### `site.webmanifest`

- **Valid JSON**; has `name`; has icons.
- **Icon paths resolve** (error) — every icon `src` must point at a file that
  exists *as written*. Catches the common root-absolute mistake
  (`/web-app-manifest-192x192.png` when the file is at `assets/…`).
- **Soft fields** (warnings) — `short_name`, `theme_color`, `background_color`;
  `theme_color` drifting from `meta.themeColor`.

### `sitemap.xml`

- Has `<loc>` entries; the `<loc>` matches `meta.domain` (error on mismatch);
  no placeholder domains (`example.com`, `github.io/…`).
- Note: parsed by regex, not validated as well-formed XML.

### `robots.txt`

- Has a `Sitemap:` line (warning if not); its host matches `meta.domain`'s host
  (error on mismatch); no placeholder domain.

### `CNAME` (only if present)

- Host matches `meta.domain`'s host (warning — www↔apex setups legitimately
  differ).

### `assets/` (walked on disk)

- **Referenced-but-missing** (error) — a block points at a file that isn't there.
- **Present-but-unused** (warning) — a file on disk nothing references. The
  favicon family and `animation/` are exempt (referenced by convention).
- **Oversized images** (warning, `performance` category) — images larger than
  `--max-image-kb` (default 900 KB), and CSS/JS over `--max-css-kb` /
  `--max-js-kb` (default 250 KB), so heavy media gets compressed before ship.

## How to use it in the workflow

The intended place is the gate **between authoring the spec and shipping**:

```text
author / generate site-spec.json
  → node launch-check.js
  → fix every error (and review warnings)
  → re-run until PASS
  → deploy
```

This matters most when the spec is generated from a client intake form by an
LLM: the engine renders whatever the JSON says without complaint, so the
validator is the thing that distrusts the generated spec before it reaches a
real customer. (See `CLIENT-CHECKLIST.md` for the per-client fill-in steps the
validator backs up.)

A clean run on a fresh client typically still surfaces the obvious first-pass
items — placeholder hero copy, template contact values, a not-yet-made
`og:image`, manifest icon paths. That's expected; work them down to `PASS`.

## Limitations (read these)

- **It validates inputs, not the rendered result.** It can't tell you the site
  *looks* right — only that the spec and metadata aren't obviously broken. The
  manual checks in `AGENTS.md` (open it, click every tab, test on a real phone)
  still matter.
- **Heuristics false-positive and false-negative.** A real phone number that
  looks odd may be flagged; a placeholder phrase nobody anticipated may pass.
  Treat errors as "look at this," not "this is definitely wrong."
- **JSON validity is checked for `site-spec.json` and `site.webmanifest` only.**
  `sitemap.xml` is regex-scraped, not validated as well-formed XML.
- **No network checks.** It does not fetch the live site, verify URLs resolve,
  or inspect deployed headers. By design — that keeps it fast and offline.

## Extending it

The structure is one pass: read files → run `checkX()` functions that push into
the `errors`/`warnings` arrays (tagged with a category) → print → exit on
`errors.length`. To add a check:

1. Write a `checkSomething(...)` function that calls `fail(category, msg)` or
   `warn(category, msg)`.
2. Call it from `main()`.
3. Reuse the existing category names where they fit (`missing`, `spec`,
   `content`, `links`, `seo`, `manifest`, `assets`, `accessibility`,
   `performance`) rather than inventing new ones, and give the finding a stable
   uppercase `code`.

Keep it dependency-free, offline, and CommonJS. If a check would need a parser,
a network call, or an npm package, it probably doesn't belong here — that's the
line that keeps this a fast preflight rather than a slow test suite.

Possible future additions (not yet built): well-formed-XML validation for
`sitemap.xml` (currently regex-scraped), and live-URL / deployed-header checks
(deliberately out of scope today to keep the run offline and fast).

<!-- Built from m-remis/static-web-template -->