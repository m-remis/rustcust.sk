/* =========================================================
   Static site template
   script.js — content data + UI logic
   ========================================================= */

"use strict";

/* ----------------------------------------------------------------------
   1. CONTENT ◀━━ EDIT THIS BLOCK

   This SITE object is the only thing you need to touch to make the site
   yours: brand name, navigation, every section's content, social links,
   and the list of background images. Everything below this block is
   layout/logic and can be left alone.

   HOW SECTIONS WORK — THE BLOCK ENGINE
   ------------------------------------
   `nav` is the list of tabs (each { id, label }). `sections` is keyed by
   those same ids. Each section is:

       <id>: {
           title: "Heading shown at the top of the section" (optional),
           blocks: [ ...an ordered list of content blocks... ],
       }

   A section is just an ordered list of blocks. To rearrange a section,
   reorder its `blocks` — move a slideshow above the cards, drop text
   between two card grids, whatever. No fixed per-section recipe.

   BLOCK WIDTH
   -----------
   Every block sits in one of two width tiers, set automatically by type:
     - narrow (~46rem): text and hero — kept readable, never full-bleed.
     - wide   (~56rem): cards, slideshow, map, table — given room to breathe.
   Override per block with `width: "narrow"` or `width: "wide"` on any block,
   e.g. force a slideshow narrow to sit tight under a paragraph. See
   BLOCK_WIDTHS further down.

   BLOCK TYPES (each block is an object with a `type`):

     { type: "text", text: "A paragraph. Inline <em>…</em> and <a …> ok." }

     { type: "cards", linked: false, items: [
         { title, body, meta }                      // plain card
         { title, body, meta, url }                 // linked card if linked:true
     ] }

     { type: "links", items: [
         { label, handle, url }                     // e.g. email / phone rows
     ] }

     { type: "map", mode: "embed", embed: "<google embed src>",
       url: "<share link>", label: "Accessible label / location name",
       address: "Optional street address" }
       → mode: "embed" (default) shows the live Google Maps iframe + an
         "Open in Maps" button.
       → mode: "static" shows a clean themed card (no iframe): the label, an
         optional address line if you provide one, and the button. Prettier and
         lighter — good when the live map looks too noisy.

     { type: "slideshow", name: "Optional heading", blurb: "Optional text",
       slides: [
           { src, title, caption, text }            // only `src` is required
       ] }
       → 1 slide  = a plain framed image
       → 2+ slides = carousel with prev/next, dots, and an "n / total" counter

     { type: "table", name: "Optional heading", blurb: "Optional text",
       headings: ["Service", "Duration", "Price"],   // any number of columns
       rows: [
           ["Basic tune-up", "30 min", "€25"],       // cells, in heading order
           ["Full service",  "2 hr",   "€60"],
       ] }
       → A structured table (e.g. a price list). `headings` defines the
         columns; each row is an array of cells in the same order. Short rows
         pad with empty cells, extra cells are ignored, so a ragged row never
         breaks the layout. The last column is right-aligned + accented, which
         reads well for a price/value column. Cell text allows the same trusted
         inline HTML (<em>, <a>) as other blocks.

   CONTENT LENGTH GUIDANCE (hero especially)
   -----------------------------------------
   The hero is the first thing on the page; keep it tight or it becomes a wall
   on mobile:
     - hero title: short and punchy (a line or two).
     - hero lead: one or two short sentences. It is width-capped for
       readability and will wrap; long copy looks cramped, not premium.
     - extra explanation belongs in a separate `text` block below the hero,
       not stuffed into the lead.

   IMPORTANT: block text (text/blurb/title/etc.) intentionally supports small
   trusted inline HTML, e.g. <em> and <a>. Keep these values authored by you,
   never user-supplied raw input, unless you sanitize first.

   Adding a brand-new block type is a small edit to BLOCK_RENDERERS further
   down — see the comment there.
---------------------------------------------------------------------- */

let SITE = {
    // OPTIONAL: point this at a JSON endpoint to load content from your own
    // backend instead of editing this file. Any keys the JSON returns override
    // the defaults below; anything it omits falls back to what's here. Leave it
    // null to use the inline content as-is. Example: "/api/site.json"
    dataUrl: null,

    brand: "Company",

    // The tabs, in order. `id` ties each one to a key in `sections` below.
    nav: [
        {id: "home", label: "Home"},
        {id: "services", label: "Services"},
        {id: "find-me", label: "Where to find me"},
        {id: "projects", label: "Projects"},
        {id: "contact", label: "Contact"},
    ],

    // Every section, keyed by the nav id. Each is { title?, blocks: [...] }.
    sections: {
        home: {
            // No title here — the hero block carries its own big headline.
            blocks: [
                {
                    type: "hero",
                    // Wide so the hero aligns with the slideshow below it
                    // (same left edge / column width) instead of sitting in
                    // the narrower centered prose column.
                    width: "wide",
                    eyebrow: "Company",
                    // <em>…</em> renders in the accent color. Keep the title
                    // short and the lead to a sentence or two — see the content
                    // length guidance above.
                    title: "A demo for the <em>static site micro-engine</em>.",
                    lead: "A zero-dependency template for polished, responsive sites built from reusable config-driven blocks.",
                },
                {
                    // Longer explanation lives in its own text block, not the
                    // hero lead — so the hero stays tight on mobile. Wide to
                    // match the hero + slideshow column above and below it.
                    type: "text",
                    width: "wide",
                    text: "Want a website? Contact me at <a href=\"https://michal-remis.com/?utm_campaign=visitor_origin&utm_source=static_web_example/\" target=\"_blank\" rel=\"noopener noreferrer\">michal-remis.com</a>. Tested on Chromium, Firefox and Safari, on desktop and mobile.",
                },
                {
                    type: "slideshow",
                    slides: [
                        {
                            src: "assets/slides/mountains.jpg",
                            title: "Lorem ipsum",
                            caption: "First slide caption",
                            text: "Optional smaller line of supporting text.",
                        },
                        {
                            src: "assets/slides/church.jpg",
                            title: "Dolor sit amet",
                            caption: "Second slide caption",
                        },
                        {
                            src: "assets/slides/lake.jpg",
                            caption: "Third slide caption",
                        },
                    ],
                },
            ],
        },

        services: {
            title: "Services",
            blocks: [
                {
                    type: "cards",
                    items: [
                        {
                            title: "Lorem ipsum",
                            body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
                        },
                        {
                            title: "Dolor sit amet",
                            body: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.",
                        },
                        {
                            title: "Consectetur",
                            body: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.",
                        },
                    ],
                },
                {
                    type: "table",
                    name: "Pricing",
                    blurb: "An optional line of text under the table name.",
                    headings: ["Service", "Duration", "Price"],
                    rows: [
                        ["Lorem ipsum", "30 min", "€25"],
                        ["Dolor sit amet", "2 hr", "€60"],
                        ["Consectetur", "15 min", "€10"],
                    ],
                },
            ],
        },

        "find-me": {
            title: "Where to find me",
            blocks: [
                {
                    type: "text",
                    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.",
                },
                {
                    type: "map",
                    // mode "embed" (default) = live Google iframe; "static" =
                    // clean card with no iframe (label + optional address +
                    // button). Switch by setting mode: "static".
                    mode: "embed",
                    // Google Maps → Share → Embed a map → copy the src.
                    embed: "https://maps.google.com/maps?q=Times+Square,New+York,NY&z=15&output=embed",
                    // Normal share link used by the "Open in Maps" button.
                    url: "https://www.google.com/maps/search/?api=1&query=Times%20Square%2C%20New%20York%2C%20NY",
                    // Used as the iframe's accessible title and, in static mode,
                    // as the card's location name.
                    label: "Times Square, New York",
                    // Optional: shown as an address line in static mode only.
                    address: "Manhattan, NY 10036, USA",
                },
                {
                    type: "slideshow",
                    name: "My place",
                    slides: [
                        {src: "assets/slides/nature.jpg",
                            title: "Lorem ipsum",
                            caption: "First slide caption",
                            text: "Optional smaller line of supporting text.",
                        },
                    ],
                },
            ],
        },

        projects: {
            title: "Projects",
            // Reorder these blocks to rearrange the section. Right now: a blurb,
            // then the project cards, then two slideshows. Move any block up or
            // down — e.g. put a slideshow first — just by moving it in this list.
            blocks: [
                {
                    type: "text",
                    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.",
                },
                {
                    type: "cards",
                    linked: true,
                    items: [
                        {
                            title: "Lorem ipsum",
                            body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
                            meta: "Lorem",
                            url: "#",
                        },
                        {
                            title: "Dolor sit",
                            body: "Sed do eiusmod tempor incididunt ut labore et dolore magna.",
                            meta: "Ipsum",
                            url: "#",
                        },
                        {
                            title: "Consectetur",
                            body: "Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
                            meta: "Dolor",
                            url: "#",
                        },
                    ],
                },
                {
                    type: "slideshow",
                    name: "Slideshow",
                    blurb: "An optional line of text under the slideshow name.",
                    slides: [
                        {src: "assets/slides/mountains.jpg", caption: "Lorem ipsum"},
                        {src: "assets/slides/lake.jpg", caption: "Dolor sit amet"},
                    ],
                },
                {
                    type: "slideshow",
                    name: "Picture",
                    slides: [
                        {src: "assets/slides/nature.jpg", caption: "Consectetur"},
                    ],
                },
            ],
        },

        contact: {
            title: "Contact",
            blocks: [
                {
                    type: "text",
                    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.",
                },
                {
                    type: "links",
                    items: [
                        {label: "Email", handle: "name@example.com", url: "mailto:name@example.com"},
                        {label: "Phone", handle: "+1 (000) 000-0000", url: "tel:+10000000000"},
                    ],
                },
            ],
        },
    },

    footer: {
        note: "Created and maintained by <a href=\"https://michal-remis.com/?utm_campaign=visitor_origin&utm_source=static_web_example/\" target=\"_blank\" rel=\"noopener noreferrer\">Michal</a>.",
        year: new Date().getFullYear(),
    },

    // Social links, shown next to the brand in the header as a colored icon
    // plus a visible label. Swap these URLs and labels for your real ones.
    // `icon` must match a key in the SOCIAL_ICONS map further down; to add a
    // new platform, add an SVG there and a matching color rule in styles.css
    // (.socials__link--<icon> svg), then reference the key here.
    socials: [
        {label: "Instagram 1", icon: "instagram", url: "https://instagram.com/"},
        {label: "Instagram 2", icon: "instagram", url: "https://instagram.com/"},
        {label: "YouTube 1", icon: "youtube", url: "https://youtube.com/"},
    ],

    // Background images — just add files here and to assets/background/.
    backgrounds: [
        "assets/background/background.jpg",
        "assets/background/background_2.jpg",
        "assets/background/background_3.jpg",
    ],
};

/* ----------------------------------------------------------------------
   2. SMALL HELPERS
---------------------------------------------------------------------- */

const $ = (sel, root = document) => root.querySelector(sel);

const el = (tag, attrs = {}, html = "") => {
    const node = document.createElement(tag);

    for (const [k, v] of Object.entries(attrs)) {
        if (v === false || v === null || v === undefined) continue;
        if (k === "class") node.className = v;
        else node.setAttribute(k, v === true ? "" : String(v));
    }

    if (html) node.innerHTML = html;
    return node;
};

const isExternalUrl = (url = "") => /^https?:\/\//i.test(url);

/* Escape text destined for an attribute (e.g. alt=""). Slide captions/titles
   come from the trusted SITE object, but image alt text is built from them and
   stray quotes would break the attribute, so escape defensively. */
const escapeAttr = (str = "") =>
    String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

/* Inline SVG icons — no icon library (keeps the no-deps rule). Each uses
   fill="currentColor" so it inherits the surrounding text color and re-themes
   automatically. Add a new key here to support a new social platform. */
const SOCIAL_ICONS = {
    instagram:
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">' +
        '<path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 1.62c-3.15 0-3.52.01-4.76.07-.9.04-1.39.19-1.71.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.13.32-.28.81-.32 1.71-.06 1.24-.07 1.61-.07 4.76s.01 3.52.07 4.76c.04.9.19 1.39.32 1.71.17.43.37.74.69 1.06.32.32.63.52 1.06.69.32.13.81.28 1.71.32 1.24.06 1.61.07 4.76.07s3.52-.01 4.76-.07c.9-.04 1.39-.19 1.71-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.13-.32.28-.81.32-1.71.06-1.24.07-1.61.07-4.76s-.01-3.52-.07-4.76c-.04-.9-.19-1.39-.32-1.71a2.85 2.85 0 0 0-.69-1.06 2.85 2.85 0 0 0-1.06-.69c-.32-.13-.81-.28-1.71-.32-1.24-.06-1.61-.07-4.76-.07zm0 2.76a5.3 5.3 0 1 1 0 10.6 5.3 5.3 0 0 1 0-10.6zm0 1.62a3.68 3.68 0 1 0 0 7.36 3.68 3.68 0 0 0 0-7.36zm5.48-2.96a1.24 1.24 0 1 1 0 2.48 1.24 1.24 0 0 1 0-2.48z"/>' +
        "</svg>",
    youtube:
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">' +
        '<path d="M23.5 6.5a3 3 0 0 0-2.11-2.12C19.5 3.87 12 3.87 12 3.87s-7.5 0-9.39.51A3 3 0 0 0 .5 6.5C0 8.4 0 12 0 12s0 3.6.5 5.5a3 3 0 0 0 2.11 2.12c1.89.51 9.39.51 9.39.51s7.5 0 9.39-.51A3 3 0 0 0 23.5 17.5C24 15.6 24 12 24 12s0-3.6-.5-5.5zM9.6 15.6V8.4l6.27 3.6-6.27 3.6z"/>' +
        "</svg>",
};

/* Build the row of social links shown next to the brand: a colored icon plus
   its visible label. Routes through el() and isExternalUrl() so external links
   get target=_blank + rel=noopener for free, same as every other link. */
function buildSocials(items) {
    const wrap = el("div", {class: "socials"});

    items.forEach((it) => {
        const icon = SOCIAL_ICONS[it.icon] || "";

        const attrs = {
            class: `socials__link socials__link--${it.icon}`,
            href: it.url,
            "aria-label": it.label,
        };

        if (isExternalUrl(it.url)) {
            attrs.target = "_blank";
            attrs.rel = "noopener noreferrer";
        }

        wrap.appendChild(
            el("a", attrs, `${icon}<span class="socials__label">${it.label}</span>`)
        );
    });

    return wrap;
}

/* ----------------------------------------------------------------------
   2B. BLOCK BUILDERS

   Small functions that each turn one block's data into a DOM node. They're
   pure builders (no SITE access), so they can be reused and tested. The
   BLOCK_RENDERERS map at the end wires a `type` string to one of these.
---------------------------------------------------------------------- */

/* hero — the big intro/landing block: eyebrow + headline + lead paragraph. */
function buildHero(block) {
    const wrap = el("div", {class: "intro"});
    if (block.eyebrow) wrap.appendChild(el("p", {class: "intro__eyebrow"}, block.eyebrow));
    if (block.title) wrap.appendChild(el("h1", {class: "intro__title"}, block.title));
    if (block.lead) wrap.appendChild(el("p", {class: "intro__lead"}, block.lead));
    return wrap;
}

/* text — a prose paragraph. Inline HTML (<em>, <a>) is allowed (trusted). */
function buildText(block) {
    if (!block.text) return null;
    return el("div", {class: "prose section__text"}, `<p>${block.text}</p>`);
}

/* cards — a responsive card grid. `linked: true` + an item `url` makes the
   whole card a link. */
function buildCards(block) {
    const items = block.items || [];
    if (!items.length) return null;

    const linked = !!block.linked;
    const grid = el("div", {class: "card-grid"});

    items.forEach((it) => {
        const inner = `
            <h3>${it.title}</h3>
            <p>${it.body}</p>
            ${it.meta ? `<span class="card__meta">${it.meta}</span>` : ""}
        `;

        if (linked && it.url) {
            const attrs = {class: "card card__link", href: it.url};
            if (isExternalUrl(it.url)) {
                attrs.target = "_blank";
                attrs.rel = "noopener noreferrer";
            }
            grid.appendChild(el("a", attrs, inner));
        } else {
            grid.appendChild(el("article", {class: "card"}, inner));
        }
    });

    return grid;
}

/* links — the label/handle link list (e.g. contact rows). */
function buildLinks(block) {
    const items = block.items || [];
    if (!items.length) return null;

    const ul = el("ul", {class: "link-list"});

    items.forEach((it) => {
        const attrs = {href: it.url};
        if (isExternalUrl(it.url)) {
            attrs.target = "_blank";
            attrs.rel = "noopener noreferrer";
        }

        const a = el(
            "a",
            attrs,
            `<span class="label">${it.label}</span><span class="handle">${it.handle}</span>`
        );

        const li = el("li");
        li.appendChild(a);
        ul.appendChild(li);
    });

    return ul;
}

/* map — location block with two modes:
   - "embed" (default): the live Google Maps iframe + an "Open in Maps" button.
   - "static": a clean themed card with no iframe — the location name, an
     optional address line (only if `address` is set), and the button. Lighter
     and prettier when the live map looks too noisy.
   Falls back to embed if mode is "static" but no embed/url is usable, and to
   nothing only if there's neither an embed nor a url to point at. */
function buildMap(block) {
    const mode = block.mode === "static" ? "static" : "embed";
    const href = block.url || block.embed;

    // ---- Static card mode (no iframe) ----
    if (mode === "static") {
        if (!href) return null; // nothing to point at — skip silently.

        const card = el("div", {class: "map-card"});
        if (block.label) card.appendChild(el("p", {class: "map-card__name"}, block.label));
        if (block.address) card.appendChild(el("p", {class: "map-card__address"}, block.address));

        card.appendChild(
            el(
                "p",
                {class: "map-open-row"},
                `<a href="${href}" target="_blank" rel="noopener noreferrer">Open in Maps</a>`
            )
        );

        return card;
    }

    // ---- Embed mode (live iframe), the default ----
    if (!block.embed) return null;

    const frag = document.createDocumentFragment();

    const wrap = el("div", {class: "map-embed"});
    wrap.appendChild(
        el("iframe", {
            src: block.embed,
            title: block.label || "Location map",
            loading: "lazy",
            referrerpolicy: "no-referrer-when-downgrade",
            allowfullscreen: true,
        })
    );
    frag.appendChild(wrap);

    frag.appendChild(
        el(
            "p",
            {class: "map-open-row"},
            `<a href="${href || block.embed}" target="_blank" rel="noopener noreferrer">Open in Maps</a>`
        )
    );

    return frag;
}

/* table — a structured table (e.g. a price list).
   Block shape: { name?, blurb?, headings: [...], rows: [[...], ...] }
   - `headings` defines the columns (any number).
   - each entry in `rows` is an array of cells, in heading order.
   Short rows are padded with empty cells and extra cells are ignored, so a
   ragged row never breaks the grid. The optional name/blurb mirror the
   slideshow block, so several named tables can stack cleanly in one section.
   Cell text allows the same trusted inline HTML (<em>, <a>) as other blocks —
   keep it authored by you, not user input. The last column is right-aligned
   and accent-colored, which reads naturally as a price/value column. */
function buildTable(block) {
    const headings = block.headings || [];
    const rows = block.rows || [];
    if (!headings.length || !rows.length) return null;

    const name = block.name;
    const blurb = block.blurb;
    const lastCol = headings.length - 1;

    // Wrapper so the optional name + blurb + table stay one unit, matching the
    // slideshow block's structure.
    const wrapper = el("div", {class: "table-block"});

    if (name) {
        wrapper.appendChild(el("h3", {class: "table__name"}, name));
    }
    if (blurb) {
        wrapper.appendChild(el("div", {class: "prose table__blurb"}, `<p>${blurb}</p>`));
    }

    // Scroll wrapper: on a narrow screen the table scrolls sideways instead of
    // squashing its columns or forcing the page wider.
    const scroll = el("div", {class: "table-scroll"});
    const table = el("table", {class: "data-table"});

    // Head.
    const thead = el("thead");
    const headRow = el("tr");
    headings.forEach((h, i) => {
        headRow.appendChild(
            el("th", {scope: "col", class: i === lastCol ? "data-table__value" : null}, String(h))
        );
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    // Body. One <tr> per row; cells are read positionally against headings, so
    // a short row pads with blanks and a long row is truncated to the columns.
    const tbody = el("tbody");
    rows.forEach((row) => {
        const cells = Array.isArray(row) ? row : [row];
        const tr = el("tr");
        for (let i = 0; i < headings.length; i++) {
            const value = cells[i] == null ? "" : String(cells[i]);
            tr.appendChild(
                el("td", {class: i === lastCol ? "data-table__value" : null}, value)
            );
        }
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    scroll.appendChild(table);
    wrapper.appendChild(scroll);
    return wrapper;
}

/* ----------------------------------------------------------------------
   2C. SLIDESHOW / CAROUSEL (reusable)

   buildCarousel(block) returns a self-contained carousel node for a slideshow
   block: { name?, blurb?, slides: [ {src, title, caption, text}, ... ] }
   (only `src` is required per slide).

   Behavior:
   - 1 slide  → a single framed image + its caption block, no controls.
   - 2+ slides → manual carousel: prev/next buttons, a dot per slide, and an
     "n / total" counter. Wrapping (last → first) like the W3Schools example,
     but with real <button>s, ARIA, and keyboard arrow support so it matches
     the rest of the template's accessibility. No autoplay (manual only);
     honors prefers-reduced-motion via CSS.

   Each carousel keeps its own `index` in closure scope, so multiple carousels
   on the page never interfere with one another.
---------------------------------------------------------------------- */

let carouselSeq = 0;

function buildCarousel(block) {
    block = block || {};
    const list = (block.slides || []).filter((s) => s && s.src);
    if (!list.length) return null;

    const name = block.name;
    const blurb = block.blurb;
    const multi = list.length > 1;
    const uid = `carousel-${++carouselSeq}`;

    // An optional name lets several carousels sit in one section, each labelled
    // (e.g. "Mountains", then "Cars"). It also becomes the accessible label.
    const baseLabel = multi ? `Image carousel, ${list.length} slides` : "Image";

    // Wrapper so the optional name heading + blurb + carousel stay one unit.
    const wrapper = el("div", {class: "carousel-block"});

    if (name) {
        wrapper.appendChild(el("h3", {class: "carousel__name", id: `${uid}-name`}, name));
    }
    if (blurb) {
        wrapper.appendChild(el("div", {class: "prose carousel__blurb"}, `<p>${blurb}</p>`));
    }

    const root = el("div", {
        class: "carousel" + (multi ? "" : " carousel--single"),
        role: "group",
        "aria-roledescription": "carousel",
        "aria-label": name ? `${name}: ${baseLabel}` : baseLabel,
        "aria-labelledby": name ? `${uid}-name` : null,
    });

    // Viewport holds the stacked slides; only the active one is shown (CSS).
    const viewport = el("div", {class: "carousel__viewport"});

    const slideNodes = list.map((s, i) => {
        const slide = el("figure", {
            class: "carousel__slide",
            role: "group",
            "aria-roledescription": multi ? "slide" : null,
            "aria-label": multi ? `${i + 1} of ${list.length}` : null,
            "aria-hidden": multi && i !== 0 ? "true" : null,
            id: `${uid}-slide-${i}`,
        });

        const altText = s.title || s.caption || `Slide ${i + 1}`;

        // Counter chip ("n / total"), top-left, multi only — mirrors W3Schools.
        if (multi) {
            slide.appendChild(
                el("span", {class: "carousel__counter", "aria-hidden": "true"},
                    `${i + 1} / ${list.length}`)
            );
        }

        const img = el("img", {
            class: "carousel__img",
            src: s.src,
            alt: escapeAttr(altText),
            loading: i === 0 ? "eager" : "lazy",
            decoding: "async",
        });

        // If an image path is wrong, hide that slide's broken-image icon and
        // fall back to a neutral frame — consistent with the background's
        // silent-fail behavior elsewhere in the template.
        img.addEventListener("error", () => {
            img.classList.add("is-broken");
        });

        slide.appendChild(img);

        // Caption block: title + caption + smaller text, any subset present.
        if (s.title || s.caption || s.text) {
            const cap = el("figcaption", {class: "carousel__caption"});
            if (s.title) cap.appendChild(el("span", {class: "carousel__title"}, s.title));
            if (s.caption) cap.appendChild(el("span", {class: "carousel__text"}, s.caption));
            if (s.text) cap.appendChild(el("span", {class: "carousel__subtext"}, s.text));
            slide.appendChild(cap);
        }

        viewport.appendChild(slide);
        return slide;
    });

    root.appendChild(viewport);

    // Single slide: nothing more to wire up.
    if (!multi) {
        wrapper.appendChild(root);
        return wrapper;
    }

    // ---- Multi-slide controls ----
    let index = 0;
    let dots = [];

    const setActive = (next) => {
        index = (next + list.length) % list.length;

        slideNodes.forEach((node, i) => {
            const active = i === index;
            node.classList.toggle("is-active", active);
            node.setAttribute("aria-hidden", active ? "false" : "true");
        });

        dots.forEach((dot, i) => {
            const active = i === index;
            dot.classList.toggle("is-active", active);
            dot.setAttribute("aria-selected", String(active));
            dot.tabIndex = active ? 0 : -1;
        });
    };

    const prevBtn = el("button", {
        type: "button",
        class: "carousel__nav carousel__nav--prev",
        "aria-label": "Previous slide",
    }, "&#10094;"); // ❮

    const nextBtn = el("button", {
        type: "button",
        class: "carousel__nav carousel__nav--next",
        "aria-label": "Next slide",
    }, "&#10095;"); // ❯

    prevBtn.addEventListener("click", () => setActive(index - 1));
    nextBtn.addEventListener("click", () => setActive(index + 1));

    root.appendChild(prevBtn);
    root.appendChild(nextBtn);

    // Dots — a real tablist so keyboard arrows move between slides.
    const dotWrap = el("div", {
        class: "carousel__dots",
        role: "tablist",
        "aria-label": "Choose slide",
    });

    dots = list.map((s, i) => {
        const dot = el("button", {
            type: "button",
            class: "carousel__dot",
            role: "tab",
            "aria-label": `Go to slide ${i + 1}`,
            "aria-selected": i === 0 ? "true" : "false",
            "aria-controls": `${uid}-slide-${i}`,
            tabindex: i === 0 ? "0" : "-1",
        });
        dot.addEventListener("click", () => setActive(i));
        dotWrap.appendChild(dot);
        return dot;
    });

    // Left/right arrows on the dot tablist cycle slides + move focus.
    dotWrap.addEventListener("keydown", (e) => {
        let next = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next = index + 1;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = index - 1;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = list.length - 1;

        if (next === null) return;

        e.preventDefault();
        setActive(next);
        dots[index].focus();
    });

    root.appendChild(dotWrap);

    setActive(0);
    wrapper.appendChild(root);
    return wrapper;
}

/* ----------------------------------------------------------------------
   2D. BLOCK DISPATCH

   Map a block `type` → its builder. To add a NEW block type:
     1. write a buildX(block) that returns a DOM node (or null/fragment), and
     2. add a `yourtype: buildX` line here.
   Then use { type: "yourtype", ... } in any section's `blocks` array.
---------------------------------------------------------------------- */

const BLOCK_RENDERERS = {
    hero: buildHero,
    text: buildText,
    cards: buildCards,
    links: buildLinks,
    map: buildMap,
    slideshow: buildCarousel,
    table: buildTable,
};

/* Default width tier per block type. "narrow" keeps a column readable (text,
   hero); "wide" gives visual blocks room to breathe (cards, slideshow, map,
   table). Any block can override with its own `width: "narrow" | "wide"`.
   Unknown types fall back to narrow. The actual rem widths live in styles.css
   as --content-narrow / --content-wide, applied via the .block--narrow /
   .block--wide wrapper classes. */
/* Default width tier per block type. Everything defaults to "wide" so blocks
   share one consistent left edge / column width across the whole site (hero,
   text, cards, slideshow, map, table, contact links all line up). Any block can
   still opt into the narrower readable column with `width: "narrow"` — useful
   for a long-form paragraph you want kept to a comfortable reading measure. The
   actual rem widths live in styles.css as --content-narrow / --content-wide,
   applied via the .block--narrow / .block--wide wrapper classes. */
const BLOCK_WIDTHS = {
    hero: "wide",
    text: "wide",
    links: "wide",
    cards: "wide",
    slideshow: "wide",
    map: "wide",
    table: "wide",
};

function widthFor(block) {
    const w = block && block.width;
    if (w === "narrow" || w === "wide") return w; // explicit override wins.
    return BLOCK_WIDTHS[block && block.type] || "wide";
}

/* Render one block to a node, or null if the type is unknown / it produced
   nothing. Unknown types are skipped with a console warning rather than
   throwing, so a typo never blanks the whole page. */
function renderBlock(block) {
    if (!block || !block.type) return null;

    const builder = BLOCK_RENDERERS[block.type];
    if (!builder) {
        console.warn(`Unknown block type: "${block.type}" — skipped.`);
        return null;
    }

    return builder(block);
}

/* ----------------------------------------------------------------------
   3. RENDER NAVIGATION
---------------------------------------------------------------------- */

function renderNav() {
    const desktop = $("#navDesktop");
    const mobile = $("#navMobile");
    const brand = $("#brand");

    if (!desktop || !mobile || !brand) return;

    brand.textContent = SITE.brand;

    // Social links next to the brand in the header. Shown on desktop; below the
    // mobile breakpoint the whole header row collapses to the hamburger and a
    // copy of these links is placed inside the mobile drawer instead (below).
    // The #brand element keeps its id and click handler — it's just moved into
    // a flex wrapper alongside the links.
    if (SITE.socials && SITE.socials.length) {
        const brandWrap = el("div", {class: "brand-wrap"});
        brand.replaceWith(brandWrap);
        brandWrap.appendChild(brand);
        brandWrap.appendChild(buildSocials(SITE.socials));
    }

    desktop.setAttribute("role", "tablist");
    desktop.setAttribute("aria-label", "Main sections");

    SITE.nav.forEach((item) => {
        // Desktop nav is the real ARIA tablist. These IDs are unique.
        desktop.appendChild(
            el(
                "a",
                {
                    href: `#${item.id}`,
                    "data-nav": item.id,
                    role: "tab",
                    id: `tab-${item.id}`,
                    "aria-controls": item.id,
                    "aria-selected": "false",
                    tabindex: "-1",
                },
                item.label
            )
        );

        // Mobile nav is plain navigation. Do not duplicate desktop tab IDs.
        mobile.appendChild(
            el(
                "a",
                {
                    href: `#${item.id}`,
                    "data-nav": item.id,
                },
                item.label
            )
        );
    });

    // A copy of the social links at the bottom of the mobile drawer, so they're
    // reachable when the header collapses to the hamburger on narrow screens.
    if (SITE.socials && SITE.socials.length) {
        mobile.appendChild(buildSocials(SITE.socials));
    }
}

/* ----------------------------------------------------------------------
   4. RENDER CONTENT SECTIONS

   Each nav entry maps to a section in SITE.sections. A section is rendered as
   its optional title followed by its blocks, in order — there is no
   per-section special-casing. Reorder a section by reordering its `blocks`.

   Each block is wrapped in a .block element that carries the width tier
   (.block--narrow / .block--wide). The wrapper centers itself and caps its
   width; the spacing between consecutive blocks is one uniform rule in CSS
   (.block + .block), so adding a new block type needs no new spacing CSS.
---------------------------------------------------------------------- */

function buildSection(id, section) {
    const node = el("section", {
        id,
        class: "section",
        role: "tabpanel",
        "aria-labelledby": `tab-${id}`,
        tabindex: "-1",
    });

    // Optional section heading. The hero block carries its own headline, so a
    // section that leads with hero usually omits `title`.
    if (section && section.title) {
        node.appendChild(el("h2", {class: "section__title"}, section.title));
    }

    const blocks = (section && section.blocks) || [];
    blocks.forEach((block) => {
        const rendered = renderBlock(block);
        if (!rendered) return;

        // Wrap every block in a width-tier container. This is what gives the
        // per-block width rules and the uniform vertical rhythm; the builders
        // themselves stay width-agnostic.
        const wrap = el("div", {class: `block block--${widthFor(block)}`});
        wrap.appendChild(rendered);
        node.appendChild(wrap);
    });

    return node;
}

function renderContent() {
    const main = $("#main");
    if (!main) return;

    main.innerHTML = "";

    // One section per nav entry, in nav order. Missing section data just
    // renders an empty panel rather than crashing.
    SITE.nav.forEach((item) => {
        const section = SITE.sections ? SITE.sections[item.id] : null;
        main.appendChild(buildSection(item.id, section));
    });
}

function renderFooter() {
    const f = $("#siteFooter");
    if (!f) return;

    f.innerHTML = "";
    f.append(
        el("span", {}, `© ${SITE.footer.year} ${SITE.brand}`),
        el("span", {}, SITE.footer.note)
    );
}

/* ----------------------------------------------------------------------
   5A. INPUT MODE

   Mobile Firefox can keep tapped links/buttons in a fake focused/hovered
   state. We only show focus rings after real keyboard navigation.
---------------------------------------------------------------------- */

function initInputMode() {
    const keyboardKeys = new Set([
        "Tab",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "Enter",
        " ",
    ]);

    const enableKeyboardMode = (e) => {
        if (keyboardKeys.has(e.key)) {
            document.body.classList.add("keyboard-nav");
        }
    };

    const disableKeyboardMode = () => {
        document.body.classList.remove("keyboard-nav");
    };

    window.addEventListener("keydown", enableKeyboardMode, true);
    window.addEventListener("pointerdown", disableKeyboardMode, true);
    window.addEventListener("mousedown", disableKeyboardMode, true);
    window.addEventListener("touchstart", disableKeyboardMode, true);
}

/* ----------------------------------------------------------------------
   5. THEME (light / dark + localStorage)
---------------------------------------------------------------------- */

const THEME_KEY = "theme-preference";

function getStoredTheme() {
    try {
        return localStorage.getItem(THEME_KEY);
    } catch {
        return null;
    }
}

function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);

    const toggle = $("#themeToggle");
    if (toggle) toggle.setAttribute("aria-pressed", String(theme === "light"));

    const meta = $('meta[name="theme-color"]');
    if (meta) {
        // Pull the browser-chrome color straight from the active theme's tokens,
        // so there's nothing to keep in sync if you re-theme styles.css.
        const bg = getComputedStyle(document.body).getPropertyValue("--bg-base").trim();
        if (bg) meta.setAttribute("content", bg);
    }
}

function initTheme() {
    const toggle = $("#themeToggle");
    if (!toggle) return;

    const stored = getStoredTheme();
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    const theme = stored || (prefersLight ? "light" : "dark");

    applyTheme(theme);

    toggle.addEventListener("click", () => {
        const next = document.body.getAttribute("data-theme") === "light" ? "dark" : "light";
        applyTheme(next);

        try {
            localStorage.setItem(THEME_KEY, next);
        } catch {
            // storage unavailable — fail silently
        }
    });
}

/* ----------------------------------------------------------------------
   6. MOBILE MENU
---------------------------------------------------------------------- */

function initMobileMenu() {
    const toggle = $("#menuToggle");
    const nav = $("#navMobile");
    const scrim = $("#navScrim");

    if (!toggle || !nav || !scrim) return;

    let closeTimer = null;

    const open = () => {
        if (closeTimer) clearTimeout(closeTimer);

        nav.classList.add("is-open");
        nav.setAttribute("aria-hidden", "false");
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "Close menu");
        document.body.classList.add("menu-open");

        scrim.hidden = false;
        requestAnimationFrame(() => scrim.classList.add("is-visible"));
    };

    const close = () => {
        nav.classList.remove("is-open");
        nav.setAttribute("aria-hidden", "true");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
        document.body.classList.remove("menu-open");

        scrim.classList.remove("is-visible");
        closeTimer = setTimeout(() => {
            scrim.hidden = true;
        }, 220);
    };

    toggle.addEventListener("click", () => (nav.classList.contains("is-open") ? close() : open()));
    scrim.addEventListener("click", close);

    // Close on link tap.
    nav.addEventListener("click", (e) => {
        if (e.target.closest("a")) close();
    });

    // Close on Escape.
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && nav.classList.contains("is-open")) {
            close();
            toggle.focus();
        }
    });

    // If resized up to desktop, make sure menu is closed.
    const mq = window.matchMedia("(min-width: 641px)");
    const onDesktop = (e) => {
        if (e.matches) close();
    };

    if (mq.addEventListener) mq.addEventListener("change", onDesktop);
    else mq.addListener(onDesktop);
}

/* ----------------------------------------------------------------------
   7. TABS

   Each section is a tab panel; only one is shown at a time. The URL hash
   drives the active tab, so direct links and browser navigation work.
---------------------------------------------------------------------- */

function initTabs() {
    // Content is rendered by JS after load, so the browser's automatic scroll
    // restoration runs before the content exists and anchors to a nearby element
    // — on mobile this looks like a "pre-scroll" to a random item on refresh.
    // We own scroll position ourselves, so opt out of the browser's restoration.
    if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
    }

    const links = Array.from(document.querySelectorAll("[data-nav]"));
    const desktopTabs = Array.from(document.querySelectorAll("#navDesktop [role='tab']"));
    const panels = SITE.nav.map((n) => document.getElementById(n.id)).filter(Boolean);
    const ids = SITE.nav.map((n) => n.id);
    const defaultId = ids[0];

    const normalize = (id) => (ids.includes(id) ? id : defaultId);

    const setActiveLink = (link, id) => {
        const active = link.getAttribute("data-nav") === id;
        const isTab = link.getAttribute("role") === "tab";

        link.classList.toggle("is-active", active);

        if (isTab) {
            link.setAttribute("aria-selected", String(active));
            link.tabIndex = active ? 0 : -1;
        } else if (active) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    };

    const show = (rawId, {focusPanel = false, push = true, scrollTop = true, forceTop = false} = {}) => {
        const id = normalize(rawId);

        panels.forEach((p) => {
            const active = p.id === id;
            p.hidden = !active;
            p.classList.toggle("section--active", active);
        });

        links.forEach((link) => setActiveLink(link, id));

        if (push && location.hash.slice(1) !== id) {
            history.pushState(null, "", `#${id}`);
        }

        if (scrollTop) {
            // Avoid scrollIntoView(): on iOS Safari it can align to a child and
            // skip past the title. A plain top scroll is more predictable.
            const toTop = () => window.scrollTo(0, 0);
            toTop();
            requestAnimationFrame(toTop);

            // On initial load, iOS Safari restores its old scroll position on a
            // later tick — after our render and even after scrollRestoration is
            // set to "manual", which iOS only partially honors. Re-assert the top
            // across a few frames and once more after load so its restoration and
            // any late layout shift (map iframe, background image) can't win.
            if (forceTop) {
                requestAnimationFrame(() => requestAnimationFrame(toTop));
                setTimeout(toTop, 0);
                setTimeout(toTop, 120);
                window.addEventListener("load", toTop, {once: true});
            }
        }

        if (focusPanel) {
            const panel = document.getElementById(id);
            if (panel) panel.focus({preventScroll: true});
        }
    };

    // Click / tap.
    links.forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            show(link.getAttribute("data-nav"));

            // Drop focus after a tap so no focus ring lingers on mobile.
            // Keyboard users are unaffected.
            if (e.detail !== 0) link.blur();
        });
    });

    // Keyboard arrows on the desktop tablist only.
    const desktop = $("#navDesktop");
    if (desktop) {
        desktop.addEventListener("keydown", (e) => {
            const current = desktopTabs.findIndex((t) => t === document.activeElement);
            if (current === -1) return;

            let next = null;

            if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (current + 1) % desktopTabs.length;
            else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (current - 1 + desktopTabs.length) % desktopTabs.length;
            else if (e.key === "Home") next = 0;
            else if (e.key === "End") next = desktopTabs.length - 1;

            if (next === null) return;

            e.preventDefault();

            const tab = desktopTabs[next];
            tab.focus();
            show(tab.getAttribute("data-nav"));
        });
    }

    // Brand click → home tab.
    const brand = $("#brand");
    if (brand) {
        brand.addEventListener("click", (e) => {
            e.preventDefault();
            show(defaultId);
        });
    }

    // React to manual hash edits and browser back/forward.
    window.addEventListener("hashchange", () => {
        show(location.hash.slice(1) || defaultId, {push: false});
    });

    window.addEventListener("popstate", () => {
        show(location.hash.slice(1) || defaultId, {push: false});
    });

    // Initial tab from hash, or default. Force the top on first paint and hold
    // it across later frames so iOS Safari's scroll restoration can't drag the
    // page down to a nearby item on refresh.
    show(location.hash.slice(1) || defaultId, {push: false, forceTop: true});
}

/* ----------------------------------------------------------------------
   8B. HEADER FIT

   CSS can't detect when two flex items are about to touch, so we measure it.
   If the desktop nav + brand/socials + toggles don't fit the header on one
   row, add .force-mobile-nav (which hides the nav and the header socials and
   shows the hamburger). Re-checked on resize. Simple and reversible: when the
   window grows back, the class comes off and the desktop layout returns.
---------------------------------------------------------------------- */

function initHeaderFit() {
    const header = $(".site-header");
    const brandWrap = $(".brand-wrap");
    const nav = $("#navDesktop");

    if (!header || !brandWrap || !nav) return;

    // Switch to mobile once the gap between the rightmost social and the first
    // tab shrinks below this many pixels. Bump it up for more breathing room.
    const BUFFER = 24;

    const apply = () => {
        // Measure with the desktop layout shown, so the nav and socials are in
        // their real positions. (force-mobile-nav hides them, so drop it first.)
        header.classList.remove("force-mobile-nav");

        // Below the CSS breakpoint the media query already owns mobile mode.
        if (window.innerWidth <= 640) return;

        // The rightmost social link (the last one in the row) and the first tab.
        const socials = brandWrap.querySelectorAll(".socials__link");
        const firstTab = nav.querySelector("a");

        if (!socials.length || !firstTab) return;

        const socialRight = socials[socials.length - 1].getBoundingClientRect().right;
        const tabLeft = firstTab.getBoundingClientRect().left;

        // gap = horizontal space between the socials and the nav.
        const gap = tabLeft - socialRight;

        if (gap < BUFFER) {
            header.classList.add("force-mobile-nav");
        } else {
            // Back to desktop layout: close any drawer left open in mobile mode.
            const mobileNav = $("#navMobile");
            if (mobileNav && mobileNav.classList.contains("is-open")) {
                const menuToggle = $("#menuToggle");
                const scrim = $("#navScrim");
                mobileNav.classList.remove("is-open");
                mobileNav.setAttribute("aria-hidden", "true");
                document.body.classList.remove("menu-open");
                if (menuToggle) {
                    menuToggle.setAttribute("aria-expanded", "false");
                    menuToggle.setAttribute("aria-label", "Open menu");
                }
                if (scrim) {
                    scrim.classList.remove("is-visible");
                    scrim.hidden = true;
                }
            }
        }
    };

    apply();
    window.addEventListener("resize", apply);

    // Re-measure once web fonts load, since text widths shift when they swap in.
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(apply).catch(() => {
        });
    }
}

/* ----------------------------------------------------------------------
   8. BACKGROUND

   Picks one image at random, preloads it, then fades it in. Falls back
   gracefully if no image is present.
---------------------------------------------------------------------- */

function initBackground() {
    const bg = $("#bg");
    const list = SITE.backgrounds;

    if (!bg || !list || !list.length) return;

    const src = list[Math.floor(Math.random() * list.length)];
    const img = new Image();

    img.onload = () => {
        bg.style.backgroundImage = `url("${src}")`;
        bg.classList.add("is-loaded");
    };

    img.onerror = () => {
        // image missing — leave plain background, no error shown
    };

    img.src = src;
}

/* ----------------------------------------------------------------------
   9. BOOT
---------------------------------------------------------------------- */

/* Deep-merge plain objects (arrays and primitives are replaced wholesale).
   Used to overlay fetched JSON on top of the inline SITE defaults. */
function deepMerge(base, override) {
    if (Array.isArray(override) || typeof override !== "object" || override === null) {
        return override;
    }

    const out = {...base};

    for (const key of Object.keys(override)) {
        const b = base ? base[key] : undefined;
        const o = override[key];

        out[key] = b && typeof b === "object" && !Array.isArray(b) &&
        o && typeof o === "object" && !Array.isArray(o)
            ? deepMerge(b, o)
            : o;
    }

    return out;
}

/* If SITE.dataUrl is set, fetch it and overlay it on the inline defaults.
   Any network/parse failure silently keeps the inline content, so the page
   never breaks just because the backend is down. */
async function loadContent() {
    if (!SITE.dataUrl) return SITE;

    try {
        const res = await fetch(SITE.dataUrl, {
            headers: {Accept: "application/json"},
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        return deepMerge(SITE, data);
    } catch (err) {
        console.warn("Content fetch failed, using inline defaults:", err);
        return SITE;
    }
}

/*
 * Built from m-remis/static-web-template
 * https://github.com/m-remis/static-web-template
 */

async function init() {
    // Replace the module-level SITE with the merged result so every render
    // function (which all read SITE) picks up the fetched content.
    SITE = await loadContent();

    renderNav();
    renderContent();
    renderFooter();
    initInputMode();
    initTheme();
    initMobileMenu();
    initHeaderFit();
    initTabs();
    initBackground();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}