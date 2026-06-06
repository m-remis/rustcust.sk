# Block template — copy this to add a new block type

This is the **canonical starting point** for adding a content block. A block
type lives in **five places that must agree** (engine renderer, validator rules,
the `BLOCK TYPES` comment in `engine.js`, the `site-spec.schema.json` subschema,
and the block table in `AGENTS.md`). Copy the pieces below, rename `example` →
your type, fill them in, and you've satisfied Workflow B without
reverse-engineering an existing builder.

> Full procedure: **Workflow B** in `AGENTS.md`. This file is the fill-in-the-
> blanks companion. The `_` prefix and `.md` extension keep it out of the
> runtime — the engine never loads it.

Replace the name **`example`** everywhere (builder `buildExample`, map key
`example`, CSS `.example-block`, validator `checkExampleBlock` / `EXAMPLE_*`
codes, schema `blockExample`, and `"type": "example"`). Pick a short lowercase
noun: `hours`, `faq`, `cta`, `steps`.

---

## The 6-step checklist (from Workflow B)

- [ ] **1. Engine renderer** — add `buildExample()` + register it in
  `BLOCK_RENDERERS` (Piece 1).
- [ ] **2. Styles** — add the CSS, themed via existing tokens (Piece 2).
- [ ] **3. Engine docs** — add the shape to the `BLOCK TYPES` comment at the top
  of `engine.js` (Piece 3).
- [ ] **4. Validator** — add `checkExampleBlock()`, wire it into the switch in
  `checkBlockRequiredFields()`, and add the type to `BLOCK_RULES` in
  `launch-check.js` (Piece 4). *Skipping this makes `launch-check` flag every
  use of the new type as unknown.*
- [ ] **5. Schema** — add a `blockExample` subschema to `site-spec.schema.json`,
  register it in `block.oneOf` and the `type` enum (Piece 5). *Skipping this
  makes the IDE flag every use of the new type as invalid.*
- [ ] **6. Human docs + use it** — add a row to the block table in `AGENTS.md`,
  add to `CLIENT-CHECKLIST.md` §1c if clients fill it in, then use
  `{ "type": "example", ... }` in `site-spec.json` (Piece 6).

**Done when** `BLOCK_RENDERERS`, `BLOCK_RULES`, the `engine.js` `BLOCK TYPES`
comment, the `site-spec.schema.json` subschema, and the `AGENTS.md` table all
list the type; `node --check engine.js` passes; a test block renders; and
`launch-check` doesn't warn "unknown type".

---

## Piece 1 — Engine renderer (`engine.js`)

Add this with the other `buildX` builders (after `buildTable`, say). Keep it a
**pure builder**: read only the `block` argument, never `SITE`. Return a DOM
node, a fragment, or `null` (returning `null` on empty input means a misfilled
block silently disappears instead of rendering broken — the validator catches
the emptiness separately).

```js
/* example — ONE-LINE DESCRIPTION OF WHAT THIS BLOCK SHOWS.
   Shape: { name?, blurb?, items: [ { ... } ] }   // describe required fields
   `name`/`blurb` are the house-standard optional heading + intro, matching
   table/slideshow/gallery. Delete them if this block doesn't need them. */
function buildExample(block) {
    // 1. Guard: bail to null if there's nothing to render. Mirror the field
    //    your block actually requires (table checks headings+rows; cards
    //    checks items; gallery checks images).
    const items = block.items || [];
    if (!items.length) return null;

    // 2. Outer wrapper. Class name = `<type>-block`, matching .table-block /
    //    .carousel-block / .gallery-block.
    const wrapper = el("div", {class: "example-block"});

    // 3. Optional name + blurb — the standard pattern. `name` is an <h3> styled
    //    like the other block headings; `blurb` is one .prose paragraph.
    if (block.name) {
        wrapper.appendChild(el("h3", {class: "example__name"}, block.name));
    }
    if (block.blurb) {
        wrapper.appendChild(el("div", {class: "prose example__blurb"}, `<p>${block.blurb}</p>`));
    }

    // 4. The actual content. Build it with el(); append to wrapper.
    //    el(tag, attrs, html) — attrs with null/false/undefined values are
    //    skipped, and `true` becomes a bare attribute. external links via
    //    isExternalUrl() get target=_blank + rel=noopener (see buildLinks).
    const list = el("ul", {class: "example__list"});
    items.forEach((it) => {
        const li = el("li", {class: "example__item"});
        // NOTE on HTML: el(tag, attrs, html) injects `html` as innerHTML, so
        // it renders trusted inline tags (<em>, <a>) — but only ever pass
        // values you authored, never raw user/LLM input, unless escaped.
        // For plain text use textContent (el's 3rd arg with no tags is fine,
        // or set .textContent yourself) to avoid any injection.
        li.textContent = String(it.label ?? "");
        list.appendChild(li);
    });
    wrapper.appendChild(list);

    return wrapper;
}
```

Then register it (one line, alphabetical-ish, in the `BLOCK_RENDERERS` map):

```js
const BLOCK_RENDERERS = {
    hero: buildHero,
    text: buildText,
    cards: buildCards,
    links: buildLinks,
    map: buildMap,
    slideshow: buildCarousel,
    table: buildTable,
    gallery: buildGallery,
    photo: buildPhoto,
    example: buildExample,   // <-- add
};
```

There is **no width step** — every block fills the single content column. Don't
add a width field.

---

## Piece 2 — Styles (`styles.css`)

Add near the other block styles. **Only use existing theme tokens** (listed in
the two `[data-theme]` blocks) so the block re-themes in light/dark for free and
the 404 page inherits it. Never inline a hex; if you need a new color, add a
named variable to **both** theme blocks (see Workflow D). You do **not** need
spacing-between-blocks CSS — `.block + .block` handles vertical rhythm globally.

```css
/* ---- Example block ---------------------------------------------------- */
/* Rendered by buildExample() in engine.js from an `example` block. Uses the
   same tokens as cards/table so it matches and re-themes automatically. */

/* Heading + blurb: match .table__name / .carousel__name exactly. */
.example__name {
    font-family: var(--font-serif);
    font-weight: 500;
    font-size: 1.25rem;
    margin: 0 0 0.6rem;
    color: var(--text);
}

.example__blurb {
    margin: 0 0 0.75rem;
}

.example__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.4rem;
}

/* A panel row, matching .link-list a / .card surface treatment. */
.example__item {
    padding: 0.85rem 1.1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-panel);
    -webkit-backdrop-filter: blur(var(--panel-blur));
    backdrop-filter: blur(var(--panel-blur));
    color: var(--text);
}
```

If the block has hover/interactive state, also neutralize sticky `:hover` on
touch inside the `@media (hover: none), (pointer: coarse)` block near the bottom
of `styles.css` — that's the house pattern (see how cards/links/gallery do it).

---

## Piece 3 — Engine docs (`engine.js` `BLOCK TYPES` comment)

In the big comment block at the top of `engine.js`, add a line matching the
others so the shape is documented where builders live:

```text
     { "type": "example", "name","blurb", "items": [ { "label" } ] }
```

---

## Piece 4 — Validator (`launch-check.js`)

Three edits, all mirroring the existing block checks.

**4a.** Add the type to `BLOCK_RULES` (so it's a known type — without this every
use is flagged `UNKNOWN_BLOCK_TYPE`):

```js
const BLOCK_RULES = Object.freeze({
    // ...existing...
    example: {
        description: "example block",
    },
});
```

**4b.** Add a `checkExampleBlock()` next to the others. Use `fail()` for "this
won't render / is broken" and `warn()` for "looks off but renders". Reuse a
category (`spec, content, links, seo, manifest, assets, accessibility,
performance`) and give each finding a stable uppercase `CODE`:

```js
function checkExampleBlock(block, where) {
    // Required field → fail (the builder returns null without it).
    if (!Array.isArray(block.items) || block.items.length === 0) {
        fail("spec", "EXAMPLE_EMPTY", `${where} (example) has no "items"`);
        return;
    }

    // Per-item soft checks → warn. Mirror checkHeroBlock / checkGalleryBlock.
    block.items.forEach((it, i) => {
        if (!hasNonEmptyString(it && it.label)) {
            warn("spec", "EXAMPLE_ITEM_NO_LABEL", `${where}.items[${i}] (example) has no "label"`);
        }
    });

    // If a field has a numeric range/enum, validate it like gallery's columns:
    //   if (block.someNum != null) { const n = Number(block.someNum);
    //     if (!Number.isInteger(n) || n < 1 || n > 6) warn(...); }
}
```

Available helpers: `hasNonEmptyString(v)`, `plainTextLength(v)`,
`checkImageLike(node, where, opts)` (for image-bearing blocks),
`checkDuplicateValue(seenSet, value, category, code, prefix)`.

**4c.** Wire it into the `switch` in `checkBlockRequiredFields()`:

```js
        case "example":
            checkExampleBlock(block, where);
            break;
```

---

## Piece 5 — Schema (`site-spec.schema.json`)

Three edits, mirroring an existing block subschema (copy `blockTable` or
`blockFaq`).

**5a.** Add a `blockExample` subschema in `$defs`. `additionalProperties: false`
+ `required` mirrors the validator's required fields, so the IDE flags typos and
  missing fields:

```json
"blockExample": {
  "type": "object",
  "additionalProperties": false,
  "description": "one-line description of what it renders",
  "required": ["type", "items"],
  "properties": {
    "type": { "const": "example" },
    "name": { "type": "string" },
    "blurb": { "type": "string" },
    "items": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["label"],
        "properties": { "label": { "type": "string", "minLength": 1 } }
      }
    }
  }
}
```

**5b.** Register it in the `block.oneOf` list: `{ "$ref": "#/$defs/blockExample" }`.

**5c.** Add the type to the `block.properties.type.enum` array so the bare
`"type"` field autocompletes it.

> Verify: your `site-spec.json` still validates, and a deliberately-broken
> example block (wrong field name, missing `items`) lights up red in the editor.

---

## Piece 6 — Human docs + use it

**6a.** Add a row to the block-types table in `AGENTS.md` ("Block types and
their builders"):

```text
| `example`    | `buildExample`   | one-line description of what it renders     |
```

**6b.** If clients commonly fill this in, add it to `CLIENT-CHECKLIST.md` §1c
(the per-block placeholder list).

**6c.** Use it in `site-spec.json`:

```json
{
  "type": "example",
  "name": "Example",
  "blurb": "Short intro line.",
  "items": [
    { "label": "First" },
    { "label": "Second" }
  ]
}
```

**6d.** Validate: `node -e "JSON.parse(require('fs').readFileSync('site-spec.json','utf8'))"`,
`node --check engine.js`, `node launch-check.js`. Serve and confirm the block
renders in light + dark and on a narrow viewport.

<!-- Built from m-remis/static-web-template -->