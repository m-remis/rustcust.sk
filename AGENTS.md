# AGENTS.md

Guidance for AI coding agents working in this repository. Humans should read
`README.md` instead; this file exists so an agent can make correct changes
without rediscovering the structure each time.

## What this project is

A static personal/company site template. **No build step, no framework, no
dependencies, no package manager.** It is plain HTML + CSS + vanilla JS served
as files. Do not introduce npm, bundlers, transpilers, TypeScript, frameworks,
or a `package.json`. If a change seems to "need" tooling, it is the wrong
change — find the no-build way to do it.

###### Template fingerprint / attribution

This template intentionally carries a small searchable fingerprint:

```text
Built from m-remis/static-web-template
```

and the repository identifier:

```text
m-remis/static-web-template
```

Do **not** remove, rename, rewrite, hide, minify away, or "clean up" these
references unless the repository owner explicitly asks for a white-label build.

This is not random boilerplate. It is source attribution and a searchable marker
for sites created from the template.

Keep the fingerprint as source comments or documentation, not as visible UI
unless a visible credit was explicitly requested. Accepted forms:

- HTML: `<!-- Built from m-remis/static-web-template -->`
- CSS: `/* Built from m-remis/static-web-template */`
- JS: `/* Built from m-remis/static-web-template */`
- Markdown: `<!-- Built from m-remis/static-web-template -->`

When creating or heavily rewriting top-level project files, preserve existing
fingerprint comments and add an equivalent comment if the new file is a major
source or documentation file:

- `index.html`
- `404.html`
- `script.js`
- `styles.css`
- `404.css`
- `README.md`
- `CLIENT-CHECKLIST.md`
- `AGENTS.md`

Do not treat these strings as client placeholders. They are intentional and
should survive normal client customization.

## The golden rule

Almost every content change goes in **one place**: the `SITE` object at the top
of `script.js` (marked `◀━━ EDIT THIS BLOCK`). The HTML is an empty shell;
sections are rendered from `SITE` by JS. Before editing markup or CSS, check
whether the request is actually a `SITE` edit.

> **Spinning up a new client site?** Follow `CLIENT-CHECKLIST.md` — the
> exhaustive per-client change list (every placeholder, the multi-file domain
> and `#0e0f13` mirrors, the pre-deploy audit grep). This file (`AGENTS.md`)
> covers *how the project works*; that file covers *what to fill in per client*.

- Change brand, headings, body text, projects, contact, map, background list
  → edit `SITE`. Do **not** hardcode this content into `index.html`.
- Change social links → edit `SITE.socials`. Each entry is
  `{ label, icon, url }`; `icon` must match a key in the `SOCIAL_ICONS` map in
  `script.js`. To add a new platform, add an inline SVG to `SOCIAL_ICONS` and a
  matching color rule in `styles.css` (`.socials__link--<icon> svg`), then
  reference the key from a `SITE.socials` entry. See "Socials" below.
- Change colors/theme → edit the token blocks in `styles.css` (see below).
- Change layout/behavior → edit the relevant render/init function in
  `script.js` or the matching CSS rule.

## File map

| File                                            | Role                                                  | Edit when                      |
|-------------------------------------------------|-------------------------------------------------------|--------------------------------|
| `script.js`                                     | `SITE` content object (top) + all UI logic            | content, behavior              |
| `styles.css`                                    | All styling + the theme token blocks                  | colors, layout                 |
| `index.html`                                    | Shell only; almost no content                         | rarely (meta tags, font links) |
| `404.html` / `404.css`                          | Not-found page; **inherits tokens from `styles.css`** | layout of 404 only             |
| `CLIENT-CHECKLIST.md`                           | Per-client replacement + deploy checklist             | client-site handoff rules      |
| `site.webmanifest`, `sitemap.xml`, `robots.txt` | PWA + SEO                                             | domain/name changes            |
| `assets/`                                       | favicon + `background/` images                        | swapping media                 |

## Theming (single source of truth)

Colors live only in `styles.css` under `[data-theme="dark"]` and
`[data-theme="light"]`, grouped by comment: Backgrounds, Text, Menu / nav,
Accents & lines, and an "advanced" overlay/header group. There is intentionally
**no duplication**:

- `404.html` loads `styles.css`, so the 404 page re-themes automatically. Do
  not re-add color variables to `404.css` — keep it layout-only.
- The browser `theme-color` meta is read from the `--bg-base` token at runtime
  (in `applyTheme` in `script.js`, and inline in `404.html`). Do not hardcode
  hex values for it.

When adding a color, add a named CSS variable to **both** theme blocks rather
than inlining a hex value in a rule. If a thing can't be restyled without
touching multiple selectors, that's a signal to introduce a new variable.

**Exception — social brand colors.** The social icons are deliberately tinted
with each platform's brand color (e.g. Instagram pink, YouTube red) via
`.socials__link--<icon> svg { color: … }`. These are brand colors, not theme
tokens, so they are intentionally the same in light and dark mode and are *not*
in the theme blocks. Keep them as per-platform rules.

## Content loading

`SITE.dataUrl` (top of `script.js`) is `null` by default → inline content is
used. If set to a URL, `loadContent()` fetches JSON and `deepMerge()`s it over
the inline `SITE` (fetched keys win; omitted keys fall back; arrays replace
wholesale). On fetch failure it falls back to inline content and warns — never
let it throw or blank the page. Preserve this fallback behavior.

## Key functions in `script.js`

- `init()` (async) — boot: merges content, then renders + wires everything.
- `renderNav()`, `renderContent()`, `cardSection()`, `buildLinkList()`,
  `buildSocials()`, `renderFooter()` — build DOM from `SITE`.
- `initTheme()` / `applyTheme()` — theme toggle + `localStorage` persistence.
- `initTabs()` — section-as-tab switching, hash routing, keyboard arrows, and
  scroll-position control (see the scroll gotcha below).
- `initMobileMenu()` — mobile drawer (separate from desktop nav).
- `initHeaderFit()` — measures the header row and switches to mobile mode when
  the nav and socials would touch (see the header-fit gotcha below).
- `initBackground()` — picks one random background, fades in, fails silently.

## Socials

Social links render in two places from the single `SITE.socials` array:

- **Header** (desktop): a colored icon + visible label next to the brand,
  built by `buildSocials()` and placed inside `.brand-wrap` in `renderNav()`.
- **Mobile drawer**: a second `buildSocials()` call appends the same links to
  the bottom of `#navMobile`, stacked one per row (icon + label), styled to
  match the nav links above them.

Icons are inline SVGs in the `SOCIAL_ICONS` map (no icon library — that would
break the no-deps rule). Each SVG uses `fill="currentColor"`; the per-platform
`.socials__link--<icon> svg { color: … }` rule sets the brand tint while the
label text stays in the readable menu color. `label` is also the accessible
name (`aria-label`), so give each entry a distinct label.

## Header fit (nav ↔ socials collision) — don't "simplify" this

The header packs brand + socials, the desktop nav, and the toggles onto one
row. CSS alone can't detect when two flex items are about to touch, so
`initHeaderFit()` measures it: it reads the rendered gap between the rightmost
social link's right edge and the first nav tab's left edge
(`getBoundingClientRect()`), and when that gap drops below a small buffer it
adds `.force-mobile-nav` to the header. That class hides **both** the desktop
nav and the header socials and shows the hamburger; the socials remain
reachable in the drawer. Growing the window back removes the class.

Things that must stay consistent or this breaks:

- The header socials must keep their natural width — `.brand-wrap` is
  `flex: none` and `.socials` has **no** `overflow: hidden` or shrink. An
  earlier version clipped/shrank them "to prevent overlap"; that hid the
  collision from the measurement so the switch never fired. Do not re-add
  shrinking or clipping to the header socials.
- `.force-mobile-nav` and the `@media (max-width: 640px)` block are parallel
  triggers for the same mobile mode (CSS can't `@media` on a class). Both hide
  `.nav-desktop` and `.brand-wrap .socials` and show `.menu-toggle` — keep them
  in sync.
- The buffer (the `BUFFER` constant in `initHeaderFit`) is the one dial for how
  early/late the switch fires. Lower → they nearly touch first; higher → more
  cushion. Don't replace the geometry measurement with a guessed pixel
  breakpoint; the whole point is that it reacts to real layout (font loading,
  label lengths, nav contents).

## Sections are semi-generic

Nav items map to section `id`s. Rendering is type-specific: `services` and
`projects` render as card grids, `find-me` renders the map, `contact` renders a
link list. Adding a brand-new *kind* of section means a small JS edit in
`renderContent()`, not just a `SITE` edit. Renaming/reordering existing
sections is just a `SITE.nav` edit (keep the `id`s consistent with the render
logic and the `aria-labelledby`/panel ids).

## Constraints / gotchas

- Keep it accessible: real `<button>`s, ARIA tab roles, keyboard nav, skip
  link, focus styles, `prefers-reduced-motion` guards. Don't regress these.
- No external runtime deps beyond the Google Fonts `<link>`. Don't add CDNs.
- The site must work opened directly as a file and on any static host. No
  server-side assumptions.
- `SITE` is declared with `let` (not `const`) because `init()` reassigns it
  after merging fetched content. Keep it that way.
- Content with intentional inline markup (e.g. `intro.title` uses `<em>`, and
  `intro.lead` contains an `<a>`) is injected as HTML. Keep `SITE` values
  trusted/authored, not user input.
- **Scroll position on load is handled deliberately — don't "simplify" it.**
  Because the page is rendered by JS after load, the browser's automatic scroll
  restoration anchors to a nearby element before the content exists, which on
  mobile (especially iOS Safari) shows up as a "pre-scroll" to a random card on
  refresh. Three things work together to prevent this and must be kept:
  (1) `history.scrollRestoration = "manual"` at the top of `initTabs()`;
  (2) the `forceTop` branch in `show()`, which re-asserts `scrollTo(0, 0)` across
  several frames, a `setTimeout`, and the `window` `load` event — iOS Safari
  restores scroll on a later tick and only partially honors `manual`, so a single
  top-scroll is not enough; and (3) `overflow-anchor: none` on `body` in
  `styles.css`, so late-loading content (background image, map iframe) can't pin
  the viewport and drag it. The initial `show()` call passes `forceTop: true`;
  normal tab clicks use the plain single top-scroll and should stay that way.

## How to verify a change

There are no tests and no build. After editing:

1. `node --check script.js` to catch JS syntax errors.
2. Open `index.html` in a browser (or `python3 -m http.server 8000`) and check:
   light/dark toggle, each nav tab, mobile menu (narrow viewport), the 404 page
   (`/404.html`), and that no errors appear in the console.
3. On mobile (or a touch-emulated narrow viewport, ideally iOS Safari): open a
   tab other than the first, scroll down, then refresh. The page must land at the
   top of that tab, not pre-scrolled to a nearby card. This regresses easily —
   see the scroll gotcha above.
4. Drag the window slowly across the mid-widths (roughly 640px up to wide
   desktop): the header must switch to the hamburger the instant the nav and
   the social links approach each other, with no overlap frame, and switch back
   when widened. Confirm the socials appear (stacked, with labels) in the
   drawer in that mode. See the header-fit gotcha above.

Make the smallest change that satisfies the request, match the existing style,
and don't reformat unrelated code.

<!-- Built from m-remis/static-web-template -->