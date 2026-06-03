A small, fast, static site. No frameworks, no build step, no dependencies —
just HTML, CSS, and vanilla JS.

## How it works

All content lives in **`site-spec.json`** — the brand, the nav tabs, every
section and its content blocks, the footer, the socials, the background images,
and the page metadata. The engine (`engine.js`) fetches that file on load and
renders the whole page from it; `index.html` is just an empty shell. To change
what the site says, edit `site-spec.json` — not the HTML or the JS.

## Run it locally

The page fetches `site-spec.json`, so it must be served over HTTP (opening the
file directly with `file://` fails the fetch). From the repo root:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

After editing the spec, sanity-check the JSON:

```bash
node -e "JSON.parse(require('fs').readFileSync('site-spec.json','utf8'))"
```

And before deploying, run the preflight validator — it catches placeholders,
fake contact data, broken assets, and domain mismatches:

```bash
node launch-check.js
```

## Docs

- **`CLIENT-CHECKLIST.md`** — what to fill in for a new client site, file by
  file (content, metadata, assets, deploy).
- **`AGENTS.md`** — how the engine works (the block system, theming, the tricky
  bits). Read this before changing behavior or adding a block type.
- **`LAUNCH-CHECK.md`** — the `launch-check.js` preflight validator: what it
  checks and how to run it.

## Deploy

Any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages) — point
it at the folder. `.nojekyll` is included for GitHub Pages. For a custom domain,
add a `CNAME` file; see `CLIENT-CHECKLIST.md`.

<!-- Built from m-remis/static-web-template -->