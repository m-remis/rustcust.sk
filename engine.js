/* =========================================================
   Static site template
   engine.js — runtime engine + UI logic (content lives in site-spec.json)
   ========================================================= */

"use strict";

import {initSkull} from "./animation/skull/skull.js";

/* ----------------------------------------------------------------------
   1. CONTENT

   There is NO inline content. All content lives in an external JSON file
   (DATA_URL below). The site loads it on boot; if it can't be loaded or
   parsed, or contains no usable sections, the visitor sees the error screen
   instead. JSON is the single source of truth.

   site-spec.json SHAPE
   --------------------
   {
     "brand": "RustCust",
     "sections": [                 // ORDERED — order IS the nav + page order
       {
         "id": "home",             // unique; used in the URL hash
         "label": "Domov",         // text shown in the nav tab
         "title": "Optional",      // (optional) heading at top of the section
         "blocks": [ ... ]         // ordered content blocks
       }
     ],
     "socials": [ { "label", "icon", "url" } ],
     "footer":  { "note": "...", "year": 2026 },   // year optional; JS fills it
     "backgrounds": [ "assets/background/bg.jpg", ... ]
   }

   BLOCK TYPES (each block is an object with a "type"):
     { "type": "hero", "eyebrow", "title", "lead" }
     { "type": "text", "text": "Paragraph. Inline <em>…</em> and <a …> ok." }
     { "type": "cards", "linked": false, "items": [ { "title","body","meta","url","icon" } ] }
     { "type": "links", "layout": "rows"|"grid", "use": ["phone","email",…], "items": [ { "label","handle","url","icon","kind" } ] }
     { "type": "map", "mode": "embed", "embed","url","label","address" }
     { "type": "slideshow", "name","blurb", "slides": [ { "src","title","caption","text" } ] }
     { "type": "table", "name","blurb", "headings": [...], "rows": [ [...], ... ] }
     { "type": "faq", "name","blurb", "items": [ { "q","a" } ] }
     { "type": "gallery", "name","blurb","columns","perPage", "images": [ { "src","title","caption" } ] }
     { "type": "photo", "src","title","caption","text" }
     { "type": "hours", "name","blurb" }   // reads SITE.business.hours
     { "type": "review", "name","blurb", "items": [ { "label","url","platform" } ] }   // outbound CTAs; no backend

   Most builders are pure (read only their `block` arg). The exceptions read
   single-source-of-truth data from SITE.business via getBusiness(): `map`
   (address/embed fallback) and `hours` (the week of opening times). New blocks
   should stay pure unless they're rendering SSOT business data.

   IMPORTANT: block text intentionally supports small trusted inline HTML
   (<em>, <a>). Author these values yourself; never feed user-supplied raw
   input into them unless you sanitize first.
---------------------------------------------------------------------- */

// Path to the content file, relative to the page. Must be served over http
// (not file://) or the fetch is blocked by CORS.
const DATA_URL = "site-spec.json";

// Populated from the fetched JSON on boot. Empty until then; if the load fails
// it stays empty and the error screen is shown.
let SITE = {};

/* ----------------------------------------------------------------------
   2. SMALL HELPERS
---------------------------------------------------------------------- */

const TAB_HASH_PREFIX = "#/";

function panelId(id) {
    return `panel-${id}`;
}

function tabHash(id) {
    return `${TAB_HASH_PREFIX}${encodeURIComponent(id)}`;
}

function readTabHash() {
    const hash = location.hash || "";

    if (hash.startsWith(TAB_HASH_PREFIX)) {
        return decodeURIComponent(hash.slice(TAB_HASH_PREFIX.length));
    }

    // Legacy support for old URLs like #kontakt.
    // After we rename panels to panel-kontakt, this no longer causes native anchor scrolling.
    if (hash.startsWith("#")) {
        return decodeURIComponent(hash.slice(1));
    }

    return "";
}

function scrollToTopInstant() {
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;

    html.style.scrollBehavior = "auto";
    window.scrollTo({top: 0, left: 0, behavior: "auto"});
    html.style.scrollBehavior = previous;
}

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

// Build an anchor's attrs with the standard external-link decoration applied:
// external (http/https) targets open in a new tab with rel="noopener
// noreferrer"; internal/relative ones are left untouched. `base` carries any
// other attrs (class, aria-label, …). One place owns this so every outbound
// link is decorated identically — see also the sanitizer, which applies the
// same rel to authored <a> tags in rich text.
const linkAttrs = (url, base = {}) => {
    const attrs = {...base, href: url};
    if (isExternalUrl(url)) {
        attrs.target = "_blank";
        attrs.rel = "noopener noreferrer";
    }
    return attrs;
};

/* ----------------------------------------------------------------------
   3. SINGLE SOURCE OF TRUTH — business resolution

   Contact + legal data lives in exactly one place: SITE.business. Blocks that
   need a phone/email/social reference it by KEY instead of restating the
   value, so a number is typed once in the whole spec. resolveRef() turns a
   key ("phone", "email", or a social icon key) into a {label, handle, url,
   icon} link descriptor, or null if the spec doesn't define it.
---------------------------------------------------------------------- */

function getBusiness() {
    return SITE.business && typeof SITE.business === "object" ? SITE.business : {};
}

/* Strip spaces/formatting from a phone number to build a tel: href. */
const telHref = (phone = "") => "tel:" + String(phone).replace(/[^\d+]/g, "");

/* Slovak display names for what KIND of contact a row is ("Telefón" over the
   number). Same hardcoded-Slovak precedent as the hours block's day names.
   Used by resolveRef() for SSOT rows and as the icon-key fallback for inline
   links items (an explicit item `kind` always wins). */
const KIND_LABELS = {
    phone: "Telefón",
    email: "E-mail",
    instagram: "Instagram",
    youtube: "YouTube",
};

function resolveRef(key) {
    const b = getBusiness();

    if (key === "phone" && b.phone) {
        return {label: b.phone, handle: "", url: telHref(b.phone), icon: "phone", kind: KIND_LABELS.phone};
    }
    if (key === "email" && b.email) {
        return {label: b.email, handle: "", url: "mailto:" + b.email, icon: "email", kind: KIND_LABELS.email};
    }

    // Otherwise treat the key as a social icon key and pull from socials[].
    const social = (SITE.socials || []).find((s) => s && s.icon === key);
    if (social) {
        return {label: social.label, handle: "", url: social.url, icon: social.icon, kind: KIND_LABELS[social.icon] || ""};
    }

    return null;
}

/* ----------------------------------------------------------------------
   4. SAFE INLINE HTML

   Several blocks accept small inline HTML authored in the spec. As soon as
   that text can come from an LLM or a client intake form, raw innerHTML is a
   hole. sanitizeInline() keeps an allowlist of harmless inline tags and drops
   everything else (scripts, event handlers, javascript: URLs). Use it on any
   spec-authored rich text before it reaches innerHTML.
---------------------------------------------------------------------- */

const INLINE_ALLOWED = {
    em: [], strong: [], b: [], i: [], br: [], span: [],
    a: ["href", "title"],
};

function sanitizeInline(html = "") {
    const tpl = document.createElement("template");
    tpl.innerHTML = String(html);

    const walk = (node) => {
        // Iterate over a static copy: we mutate the tree as we go.
        Array.from(node.childNodes).forEach((child) => {
            if (child.nodeType === Node.TEXT_NODE) return;
            if (child.nodeType !== Node.ELEMENT_NODE) {
                child.remove();
                return;
            }
            const tag = child.tagName.toLowerCase();
            const allowed = INLINE_ALLOWED[tag];
            if (!allowed) {
                // Disallowed element: keep its text, drop the wrapper.
                child.replaceWith(...Array.from(child.childNodes));
                return;
            }
            // Strip every attribute except the allowlisted ones.
            Array.from(child.attributes).forEach((attr) => {
                if (!allowed.includes(attr.name.toLowerCase())) child.removeAttribute(attr.name);
            });
            // Block javascript:/data: hrefs; force safe rel/target on links.
            if (tag === "a") {
                const href = child.getAttribute("href") || "";
                if (/^\s*(javascript|data):/i.test(href)) child.removeAttribute("href");
                if (isExternalUrl(href)) {
                    child.setAttribute("target", "_blank");
                    child.setAttribute("rel", "noopener noreferrer");
                }
            }
            walk(child);
        });
    };

    walk(tpl.content);
    return tpl.innerHTML;
}

/* Render spec text honoring its declared `format`. Defaults to the sanitized
   inline-HTML path (back-compatible with existing specs); "plain" escapes
   everything; "markdown" handles a tiny inline subset then sanitizes. */
function renderRichText(text = "", format = "html") {
    if (format === "plain") return escapeAttr(text);
    if (format === "markdown") {
        const md = escapeAttr(text)
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
        return sanitizeInline(md);
    }
    return sanitizeInline(text);
}

/* The ordered list of sections, normalized + guarded. Every render path and
   the tab logic go through this, so a missing/empty `sections` array degrades
   to an empty site instead of throwing. Entries without an `id` are dropped
   (an id is required to anchor the tab + URL hash). */
function getSections() {
    const list = Array.isArray(SITE.sections) ? SITE.sections : [];
    return list.filter((s) => s && s.id);
}

/* Derive the nav (tabs) from the sections array — the array IS the nav.
   Falls back to the id when a section has no explicit label. */
function navItems() {
    return getSections().map((s) => ({id: s.id, label: s.label || s.id}));
}

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
    email:
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<rect x="3" y="5" width="18" height="14" rx="2"/>' +
        '<path d="m3 7 9 6 9-6"/>' +
        "</svg>",
    phone:
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>' +
        "</svg>",
};

/* Build the row of social links shown next to the brand: a colored icon plus
   its visible label. Routes through el() and linkAttrs() so external links
   get target=_blank + rel=noopener for free, same as every other link. */
function buildSocials(items) {
    const wrap = el("div", {class: "socials"});

    items.forEach((it) => {
        const icon = SOCIAL_ICONS[it.icon] || "";

        const attrs = linkAttrs(it.url, {
            class: `socials__link socials__link--${it.icon}`,
            "aria-label": it.label,
        });

        wrap.appendChild(
            el("a", attrs, `${icon}<span class="socials__label">${it.label}</span>`)
        );
    });

    return wrap;
}

/* ----------------------------------------------------------------------
   5. BLOCK BUILDERS

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

/* text — a prose paragraph. Inline HTML is sanitized to an allowlist; set
   `format: "markdown"` for a small markdown subset or "plain" to escape all. */
function buildText(block) {
    if (!block.text) return null;
    const html = renderRichText(block.text, block.format);
    return el("div", {class: "prose section__text"}, `<p>${html}</p>`);
}

/* cards — a responsive card grid. `linked: true` + an item `url` makes the
   whole card a link. An item `icon` adds a monochrome icon (a black PNG on a
   transparent background, skull-badge style) to the left of the text,
   vertically centered; styles.css owns
   the sizing and the dark-theme inversion (--mono-icon-filter), so one asset
   re-themes in light/dark for free. Cards have no background photos. */
function buildCards(block) {
    const items = block.items || [];
    if (!items.length) return null;

    const linked = !!block.linked;
    const grid = el("div", {class: "card-grid"});

    items.forEach((it) => {
        // Optional monochrome icon (black PNG on transparent, like the skull
        // badge), shown to the LEFT of the text, vertically centered. The
        // text (title/body/meta) is wrapped in .card__body so the card can
        // switch to a row layout (.card--icon) without breaking the meta's
        // stick-to-bottom behavior on plain cards. CSS inverts the icon in
        // dark theme via --mono-icon-filter so black art stays visible on
        // both themes. Decorative: alt is empty, the title carries meaning.
        const icon = typeof it.icon === "string" ? it.icon.trim() : "";

        const text = `
            <h3>${it.title}</h3>
            <p>${it.body}</p>
            ${it.meta ? `<span class="card__meta">${it.meta}</span>` : ""}
        `;

        const inner = icon
            ? `<span class="card__icon" aria-hidden="true"><img src="${icon.replace(/"/g, "&quot;")}" alt="" loading="lazy"/></span><div class="card__body">${text}</div>`
            : text;

        const cardClass = icon ? "card card--icon" : "card";

        if (linked && it.url) {
            const attrs = linkAttrs(it.url, {class: `${cardClass} card__link`});
            grid.appendChild(el("a", attrs, inner));
        } else {
            grid.appendChild(el("article", {class: cardClass}, inner));
        }
    });

    return grid;
}

/* links — the contact/social link rows.
   Row anatomy: icon | (kind label over value) | optional handle | arrow cue.
   The kind ("Telefón", "Instagram", …) comes from KIND_LABELS via the icon
   key, or an explicit item `kind`; the persistent arrow is the same
   clickability cue redirect cards use, so rows never need explaining.
   `layout: "grid"` renders the rows as side-by-side tiles instead. */
function buildLinks(block) {
    // Resolve `use: ["phone","email","instagram"]` against business/socials —
    // the SSOT path — then append any explicit inline items after them.
    const fromRefs = (block.use || [])
        .map(resolveRef)
        .filter(Boolean);
    const items = fromRefs.concat(block.items || []);
    if (!items.length) return null;

    const ul = el("ul", {class: `link-list${block.layout === "grid" ? " link-list--grid" : ""}`});

    items.forEach((it) => {
        if (!it || !it.url) return;

        const attrs = linkAttrs(it.url, {
            class: it.icon ? `link-list--${it.icon}` : null,
        });

        // Optional leading icon — `icon` must match a key in SOCIAL_ICONS.
        const icon = it.icon && SOCIAL_ICONS[it.icon]
            ? `<span class="link-list__icon" aria-hidden="true">${SOCIAL_ICONS[it.icon]}</span>`
            : "";

        // Small muted "what is this" line above the value. Explicit item
        // `kind` wins; otherwise derived from the icon key. Optional.
        const kind = it.kind || KIND_LABELS[it.icon] || "";
        const kindHtml = kind ? `<span class="link-list__kind">${sanitizeInline(String(kind))}</span>` : "";
        const labelHtml = it.label ? `<span class="label">${sanitizeInline(String(it.label))}</span>` : "";
        // Only render the handle span when there is one — an empty span here
        // breaks the :has() spacing in CSS (and `undefined` used to leak in).
        const handleHtml = it.handle ? `<span class="handle">${sanitizeInline(String(it.handle))}</span>` : "";

        const a = el(
            "a",
            attrs,
            `${icon}<span class="link-list__text">${kindHtml}${labelHtml}</span>${handleHtml}<span class="link-list__arrow" aria-hidden="true"></span>`
        );

        const li = el("li");
        li.appendChild(a);
        ul.appendChild(li);
    });

    return ul.children.length ? ul : null;
}

/* map — location block with two modes:
   - "embed" (default): the live Google Maps iframe + an "Open in Maps" button.
   - "static": a clean themed card with no iframe — the location name, an
     optional address line (only if `address` is set), and the button. */
function buildMap(block) {
    const b = getBusiness();
    const mode = block.mode === "static" ? "static" : "embed";
    // Fall back to the business-level map fields so the URL is typed once.
    const embed = block.embed || b.mapEmbed;
    const href = block.url || b.mapUrl || embed;

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
                `<a href="${href}" target="_blank" rel="noopener noreferrer">Otvoriť Mapy</a>`
            )
        );

        return card;
    }

    // ---- Embed mode (live iframe), the default ----
    if (!embed) return null;

    const frag = document.createDocumentFragment();

    const wrap = el("div", {class: "map-embed"});
    wrap.appendChild(
        el("iframe", {
            src: embed,
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
            `<a href="${href || embed}" target="_blank" rel="noopener noreferrer">Otvoriť mapy</a>`
        )
    );

    return frag;
}

/* table — a structured table (e.g. a price list).
   Block shape: { name?, blurb?, headings: [...], rows: [[...], ...] }
   Short rows are padded with empty cells and extra cells are ignored, so a
   ragged row never breaks the grid. The last column is right-aligned and
   accent-colored, which reads naturally as a price/value column. */
function buildTable(block) {
    const headings = block.headings || [];
    const rows = block.rows || [];
    if (!headings.length || !rows.length) return null;

    const name = block.name;
    const blurb = block.blurb;
    const lastCol = headings.length - 1;

    const wrapper = el("div", {class: "table-block"});

    if (name) {
        wrapper.appendChild(el("h3", {class: "block__name table__name"}, name));
    }
    if (blurb) {
        wrapper.appendChild(el("div", {class: "prose block__blurb table__blurb"}, `<p>${blurb}</p>`));
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

    // Body. One <tr> per row; cells are read positionally against headings.
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
   5B. FAQ / ACCORDION

   buildFaq(block) returns a list of expand/collapse question rows.
   Shape: { name?, blurb?, items: [ { q, a }, ... ] }  (q + a required per item)
   Each row is a native <button> toggling an answer panel — keyboard-operable
   and screen-reader-labelled via aria-expanded + aria-controls, no JS state
   machine needed (the click handler just flips the attribute + hidden). `q`
   is plain text; `a` allows the same trusted inline HTML as text/table blurbs
   (authored content only — never raw user/LLM input). Returns null if empty so
   a misfilled block disappears instead of rendering broken; the validator
   flags the emptiness separately.
---------------------------------------------------------------------- */

let faqSeq = 0;

function buildFaq(block) {
    const items = (block.items || []).filter(
        (it) => it && (it.q != null) && (it.a != null)
    );
    if (!items.length) return null;

    const wrapper = el("div", {class: "faq-block"});

    if (block.name) {
        wrapper.appendChild(el("h3", {class: "block__name faq__name"}, block.name));
    }
    if (block.blurb) {
        wrapper.appendChild(el("div", {class: "prose block__blurb faq__blurb"}, `<p>${block.blurb}</p>`));
    }

    const list = el("div", {class: "faq__list"});
    const seq = ++faqSeq;

    items.forEach((it, i) => {
        const panelId = `faq-${seq}-${i}`;
        const btnId = `faq-${seq}-${i}-btn`;

        const item = el("div", {class: "faq__item"});

        // Question: a real <button> so it's keyboard + screen-reader native.
        // Plain text only — set via textContent, not innerHTML.
        const btn = el("button", {
            type: "button",
            class: "faq__q",
            id: btnId,
            "aria-expanded": "false",
            "aria-controls": panelId,
        });
        btn.appendChild(el("span", {class: "faq__q-text"})).textContent = String(it.q);
        btn.appendChild(el("span", {class: "faq__icon", "aria-hidden": "true"}));

        // Answer: trusted inline HTML (matches text/table), hidden until opened.
        const panel = el("div", {
            class: "faq__a",
            id: panelId,
            role: "region",
            "aria-labelledby": btnId,
            hidden: true,
        }, `<div class="prose">${it.a}</div>`);

        btn.addEventListener("click", () => {
            const open = btn.getAttribute("aria-expanded") === "true";
            btn.setAttribute("aria-expanded", open ? "false" : "true");
            panel.hidden = open;
        });

        item.appendChild(btn);
        item.appendChild(panel);
        list.appendChild(item);
    });

    wrapper.appendChild(list);
    return wrapper;
}

/* ----------------------------------------------------------------------
   6. SLIDESHOW / CAROUSEL (reusable)

   buildCarousel(block) returns a self-contained carousel node for a slideshow
   block: { name?, blurb?, slides: [ {src, title, caption, text}, ... ] }
   (only `src` is required per slide).
---------------------------------------------------------------------- */

let carouselSeq = 0;

/* Shared lightbox: one overlay reused by every carousel, created lazily on
   first open. Shows the full image letterboxed (object-fit: contain in CSS). */
let lightboxApi = null;

function getLightbox() {
    if (lightboxApi) return lightboxApi;

    const overlay = el("div", {
        class: "lightbox",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Zväčšený obrázok",
        hidden: true,
    });

    const closeBtn = el("button", {
        type: "button",
        class: "lightbox__close",
        "aria-label": "Zavrieť",
    }, "&times;");

    const prevBtn = el("button", {
        type: "button",
        class: "lightbox__nav lightbox__nav--prev",
        "aria-label": "Predchádzajúci obrázok",
    }, "&#10094;"); // ❮

    const nextBtn = el("button", {
        type: "button",
        class: "lightbox__nav lightbox__nav--next",
        "aria-label": "Ďalší obrázok",
    }, "&#10095;"); // ❯

    const img = el("img", {class: "lightbox__img", alt: ""});
    const cap = el("p", {class: "lightbox__caption"});

    overlay.appendChild(closeBtn);
    overlay.appendChild(prevBtn);
    overlay.appendChild(nextBtn);
    overlay.appendChild(img);
    overlay.appendChild(cap);
    document.body.appendChild(overlay);

    let lastFocused = null;
    let isOpen = false;        // tracked independently of `hidden`
    let hideTimer = null;      // pending fade-out → hide
    let slides = [];           // current carousel's slides
    let index = 0;

    const render = () => {
        const s = slides[index] || {};
        img.src = s.src || "";
        img.alt = s.caption || "";
        cap.textContent = s.caption || "";
        cap.style.display = s.caption ? "" : "none";

        // Hide prev/next when there's only one image.
        const multi = slides.length > 1;
        prevBtn.style.display = multi ? "" : "none";
        nextBtn.style.display = multi ? "" : "none";
    };

    const go = (delta) => {
        if (slides.length < 2) return;
        index = (index + delta + slides.length) % slides.length;
        render();
    };

    const close = () => {
        isOpen = false;
        overlay.classList.remove("is-open");
        document.body.classList.remove("lightbox-open");
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            if (!isOpen) {
                overlay.hidden = true;
                img.removeAttribute("src");
            }
            hideTimer = null;
        }, 200);
        if (lastFocused && lastFocused.focus) lastFocused.focus();
    };

    const open = (slideList, startIndex) => {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }

        slides = Array.isArray(slideList) ? slideList : [];
        index = Math.max(0, Math.min(startIndex || 0, slides.length - 1));
        lastFocused = document.activeElement;
        isOpen = true;

        render();
        overlay.hidden = false;
        document.body.classList.add("lightbox-open");
        requestAnimationFrame(() => overlay.classList.add("is-open"));
        closeBtn.focus();
    };

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        go(-1);
    });
    nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        go(1);
    });

    // Click on the backdrop (but not the image or any control) closes.
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
    });

    document.addEventListener("keydown", (e) => {
        if (!isOpen) return;
        if (e.key === "Escape") close();
        else if (e.key === "ArrowRight") go(1);
        else if (e.key === "ArrowLeft") go(-1);
    });

    lightboxApi = {open, close, isOpen: () => isOpen};
    return lightboxApi;
}

/* Normalize image entries ({src,title,caption,text}) into the {src,caption}
   shape the shared lightbox renders. Shared by the carousel and the gallery so
   both feed the lightbox identically. */
function toLightboxSlides(list) {
    return (list || []).map((s, i) => ({
        src: s.src,
        caption:
            [s.title, s.caption, s.text].filter(Boolean).join(" — ") ||
            (s.title || s.caption || `Obrázok ${i + 1}`),
    }));
}

function buildCarousel(block) {
    block = block || {};
    const list = (block.slides || []).filter((s) => s && s.src);
    if (!list.length) return null;

    const name = block.name;
    const blurb = block.blurb;
    const multi = list.length > 1;
    const uid = `carousel-${++carouselSeq}`;

    const baseLabel = multi ? `Image carousel, ${list.length} slides` : "Image";

    const wrapper = el("div", {class: "carousel-block"});

    if (name) {
        wrapper.appendChild(el("h3", {class: "block__name carousel__name", id: `${uid}-name`}, name));
    }
    if (blurb) {
        wrapper.appendChild(el("div", {class: "prose block__blurb carousel__blurb"}, `<p>${blurb}</p>`));
    }

    const root = el("div", {
        class: "carousel" + (multi ? "" : " carousel--single"),
        role: "group",
        "aria-roledescription": "carousel",
        "aria-label": name ? `${name}: ${baseLabel}` : baseLabel,
        "aria-labelledby": name ? `${uid}-name` : null,
    });

    const viewport = el("div", {class: "carousel__viewport"});

    const lightboxSlides = toLightboxSlides(list);

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

        if (multi) {
            slide.appendChild(
                el("span", {class: "carousel__counter", "aria-hidden": "true"},
                    `${i + 1} / ${list.length}`)
            );
        }

        const trigger = el("button", {
            type: "button",
            class: "carousel__expand",
            "aria-label": `Zväčšiť obrázok: ${altText}`,
        });

        const img = el("img", {
            class: "carousel__img",
            src: s.src,
            alt: escapeAttr(altText),
            loading: i === 0 ? "eager" : "lazy",
            decoding: "async",
        });

        img.addEventListener("error", () => {
            img.classList.add("is-broken");
        });

        trigger.appendChild(img);
        trigger.addEventListener("click", () => getLightbox().open(lightboxSlides, i));
        slide.appendChild(trigger);

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

    const AUTOPLAY_MS = 5000;
    const prefersReducedMotion = window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let timer = null;

    const stop = () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    };

    const start = () => {
        if (prefersReducedMotion || timer) return;
        timer = setInterval(() => setActive(index + 1), AUTOPLAY_MS);
    };

    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);

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

    const manual = (fn) => () => {
        fn();
        stop();
        start();
    };

    prevBtn.addEventListener("click", manual(() => setActive(index - 1)));
    nextBtn.addEventListener("click", manual(() => setActive(index + 1)));

    root.appendChild(prevBtn);
    root.appendChild(nextBtn);

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
        dot.addEventListener("click", manual(() => setActive(i)));
        dotWrap.appendChild(dot);
        return dot;
    });

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
        stop();
        start();
    });

    root.appendChild(dotWrap);

    setActive(0);
    start(); // begin autoplay
    wrapper.appendChild(root);
    return wrapper;
}

/* ----------------------------------------------------------------------
   6B. GALLERY / PHOTO (image grid, shares the carousel's lightbox)

   buildGallery(block) renders a responsive grid of image tiles. Same theme
   tokens and the SAME shared lightbox as the carousel (getLightbox), but every
   tiles are shown one page at a time (see perPage); a pager steps between pages.
   Tiles are image-only — no caption strip under them. Click any tile → the
   lightbox opens at that image's absolute index, then arrow through the WHOLE
   set (across pages). Broken images fail silently (panel background shows
   through), matching the carousel.

   Block shape:
   { "type": "gallery", "name"?, "blurb"?, "columns"?: 2|3|4, "perPage"?: int,
     "images": [ { "src", "title"?, "caption"? } ] }  // src required

   title/caption are NOT rendered as visible tile captions — they feed the
   image alt text and the lightbox caption only. perPage defaults to 12.

   buildPhoto(block) is single-image sugar: normalizes to a one-image gallery so
   it shares the styling + lightbox. Shape: { "type": "photo", "src", ... }.
---------------------------------------------------------------------- */

const GALLERY_PER_PAGE_DEFAULT = 12;

function buildGallery(block) {
    block = block || {};
    const list = (block.images || []).filter((s) => s && s.src);
    if (!list.length) return null;

    const name = block.name;
    const blurb = block.blurb;
    const uid = `gallery-${++carouselSeq}`; // reuse the carousel sequence counter

    // Same data the carousel feeds the lightbox — identical preview experience.
    // Built once over the FULL list so lightbox indices are absolute: arrowing
    // in the lightbox traverses every image regardless of the visible page.
    const lightboxSlides = toLightboxSlides(list);

    // How many tiles per page. Clamp to a sane minimum; default keeps a few
    // rows visible without dumping a whole archive at once.
    let perPage = Number(block.perPage);
    if (!Number.isInteger(perPage) || perPage < 1) perPage = GALLERY_PER_PAGE_DEFAULT;

    const pageCount = Math.ceil(list.length / perPage);
    const paged = pageCount > 1;
    let page = 0; // current page index (0-based)

    const wrapper = el("div", {class: "gallery-block"});

    if (name) {
        wrapper.appendChild(el("h3", {class: "block__name gallery__name", id: `${uid}-name`}, name));
    }
    if (blurb) {
        wrapper.appendChild(el("div", {class: "prose block__blurb gallery__blurb"}, `<p>${blurb}</p>`));
    }

    const gridAttrs = {
        class: "gallery__grid",
        role: "list",
        "aria-label": name || `Galéria, ${list.length} obrázkov`,
    };
    const cols = Number(block.columns);
    if (cols === 2 || cols === 3 || cols === 4) {
        gridAttrs["data-columns"] = String(cols);
    }
    const grid = el("div", gridAttrs);

    // Build one tile for absolute index `absI` in the full list.
    const buildTile = (s, absI) => {
        const altText = s.title || s.caption || `Obrázok ${absI + 1}`;

        // Each tile is a real button → focusable + keyboard-openable, exactly
        // like the carousel's .carousel__expand trigger.
        const trigger = el("button", {
            type: "button",
            class: "gallery__item",
            role: "listitem",
            "aria-label": `Zväčšiť obrázok: ${altText}`,
        });

        const img = el("img", {
            class: "gallery__img",
            src: s.src,
            alt: escapeAttr(altText),
            // First row of the FIRST page eager; everything else lazy.
            loading: absI < 4 ? "eager" : "lazy",
            decoding: "async",
        });

        img.addEventListener("error", () => {
            img.classList.add("is-broken"); // silent fail, like .carousel__img
        });

        trigger.appendChild(img);

        // Tap a tile → open the shared lightbox at its ABSOLUTE index, so the
        // lightbox can arrow across the whole set, not just the visible page.
        trigger.addEventListener("click", () => getLightbox().open(lightboxSlides, absI));

        return trigger;
    };

    // Render the tiles for the current page (replaces grid contents).
    const renderPage = () => {
        grid.replaceChildren();
        const start = page * perPage;
        const end = Math.min(start + perPage, list.length);
        for (let i = start; i < end; i++) {
            grid.appendChild(buildTile(list[i], i));
        }
    };

    renderPage();
    wrapper.appendChild(grid);

    // Pager: only when the set spans more than one page.
    if (paged) {
        const pager = el("nav", {
            class: "gallery__pager",
            "aria-label": name ? `Stránkovanie galérie: ${name}` : "Stránkovanie galérie",
        });

        const status = el("span", {
            class: "gallery__pager-status",
            "aria-live": "polite",
        });

        const prev = el("button", {
            type: "button",
            class: "gallery__pager-btn gallery__pager-btn--prev",
            "aria-label": "Predchádzajúca strana",
        }, "&#10094;"); // ❮

        const next = el("button", {
            type: "button",
            class: "gallery__pager-btn gallery__pager-btn--next",
            "aria-label": "Ďalšia strana",
        }, "&#10095;"); // ❯

        const syncControls = () => {
            status.textContent = `${page + 1} / ${pageCount}`;
            prev.disabled = page === 0;
            next.disabled = page === pageCount - 1;
        };

        const goToPage = (next0) => {
            const clamped = Math.max(0, Math.min(next0, pageCount - 1));
            if (clamped === page) return;
            page = clamped;
            renderPage();
            syncControls();
            // Keep the gallery heading/top in view after a page change.
            wrapper.scrollIntoView({block: "nearest", behavior: "smooth"});
        };

        prev.addEventListener("click", () => goToPage(page - 1));
        next.addEventListener("click", () => goToPage(page + 1));

        pager.appendChild(prev);
        pager.appendChild(status);
        pager.appendChild(next);
        syncControls();

        wrapper.appendChild(pager);
    }

    return wrapper;
}

function buildPhoto(block) {
    if (!block || !block.src) return null;
    return buildGallery({
        name: block.name,
        blurb: block.blurb,
        images: [{src: block.src, title: block.title, caption: block.caption, text: block.text}],
    });
}

/* ----------------------------------------------------------------------
   6C. OPENING HOURS

   Renders SITE.business.hours as a seven-row week (Pondelok…Nedeľa). Hours
   are single-source-of-truth: the block carries no hours data, only an
   optional name/blurb, and reads business.hours by key — same philosophy as
   the links block referencing phone/email. Today's row is highlighted
   (is-today + aria-current); no open/closed-now logic.

   business.hours shape (all keys optional; a missing day shows a dash):
     { "mon": "9:00–17:00", ..., "sat": "Zatvorené", "sun": "Zatvorené" }

   Block shape: { "type": "hours", "name"?, "blurb"? }
---------------------------------------------------------------------- */

// Fixed Mon-first week. JS getDay() is Sun=0..Sat=6; HOURS_DAY_BY_GETDAY maps
// that into our key order so "today" lands on the right row.
const HOURS_DAYS = [
    {key: "mon", label: "Pondelok"},
    {key: "tue", label: "Utorok"},
    {key: "wed", label: "Streda"},
    {key: "thu", label: "Štvrtok"},
    {key: "fri", label: "Piatok"},
    {key: "sat", label: "Sobota"},
    {key: "sun", label: "Nedeľa"},
];
const HOURS_DAY_BY_GETDAY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function buildHours(block) {
    block = block || {};
    const hours = getBusiness().hours;
    if (!hours || typeof hours !== "object") return null;

    // Need at least one real day value, else there's nothing to show.
    const hasAny = HOURS_DAYS.some((d) => typeof hours[d.key] === "string" && hours[d.key].trim());
    if (!hasAny) return null;

    const name = block.name;
    const blurb = block.blurb;
    const todayKey = HOURS_DAY_BY_GETDAY[new Date().getDay()];

    const wrapper = el("div", {class: "hours-block"});

    if (name) {
        wrapper.appendChild(el("h3", {class: "block__name hours__name"}, name));
    }
    if (blurb) {
        wrapper.appendChild(el("div", {class: "prose block__blurb hours__blurb"}, `<p>${blurb}</p>`));
    }

    const dl = el("dl", {class: "hours__list"});

    HOURS_DAYS.forEach((d) => {
        const raw = hours[d.key];
        const value = (typeof raw === "string" && raw.trim()) ? raw.trim() : "—";
        const isToday = d.key === todayKey;

        const row = el("div", {
            class: isToday ? "hours__row is-today" : "hours__row",
            "aria-current": isToday ? "date" : false,
        });

        row.appendChild(el("dt", {class: "hours__day"}, d.label));
        row.appendChild(el("dd", {class: "hours__value"}, escapeAttr(value)));
        dl.appendChild(row);
    });

    wrapper.appendChild(dl);
    return wrapper;
}

/* review — a "leave a review" call-to-action. Pure builder.

   This block does NOT collect or store reviews (the engine is no-build and
   has no backend). It renders one or more outbound buttons that send the
   visitor to where reviews actually live and are moderated — Google Business,
   Facebook, etc. The "submission" happens on the platform's own page.

   Shape: { name?, blurb?, items: [ { label, url, platform? } ] }
     - label    (required) visible button text, plain.
     - url      (required) the external review page. Skipped if missing.
     - platform (optional) one of REVIEW_ICONS keys (google, facebook) for a
                leading brand icon + tint class; unknown/absent = generic icon. */

/* Self-contained brand glyphs for review CTAs. Kept here (not in SOCIAL_ICONS)
   because these are link buttons, not the brand-row social icons. */
const REVIEW_ICONS = {
    google:
        '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
        '<path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>' +
        '<path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>' +
        '<path fill="#fbbc05" d="M5.85 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.67-2.84z"/>' +
        '<path fill="#ea4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.16-3.16C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.67 2.84C6.71 7.3 9.14 5.38 12 5.38z"/>' +
        "</svg>",
    facebook:
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="#1877f2" aria-hidden="true">' +
        '<path d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12z"/>' +
        "</svg>",
    generic:
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="m12 3 2.6 5.27 5.82.85-4.21 4.1.99 5.78L12 16.27 6.8 19l.99-5.78-4.21-4.1 5.82-.85L12 3z"/>' +
        "</svg>",
};

function buildReview(block) {
    const items = (block.items || []).filter((it) => it && it.url && it.label);
    if (!items.length) return null;

    const wrapper = el("div", {class: "review-block"});

    if (block.name) {
        wrapper.appendChild(el("h3", {class: "block__name review__name"}, block.name));
    }
    if (block.blurb) {
        wrapper.appendChild(el("div", {class: "prose block__blurb review__blurb"}, `<p>${block.blurb}</p>`));
    }

    const list = el("div", {class: "review__list"});

    items.forEach((it) => {
        const platform = typeof it.platform === "string" ? it.platform : "";
        const icon = REVIEW_ICONS[platform] || REVIEW_ICONS.generic;

        const attrs = linkAttrs(it.url, {
            class: platform ? `review__cta review__cta--${platform}` : "review__cta",
        });

        // label is plain text → sanitizeInline escapes it. icon is authored SVG.
        const a = el(
            "a",
            attrs,
            `<span class="review__cta-icon" aria-hidden="true">${icon}</span>` +
            `<span class="review__cta-label">${sanitizeInline(String(it.label))}</span>` +
            `<span class="review__cta-arrow" aria-hidden="true"></span>`
        );

        list.appendChild(a);
    });

    wrapper.appendChild(list);
    return wrapper;
}

/* ----------------------------------------------------------------------
   7. BLOCK DISPATCH
---------------------------------------------------------------------- */

const BLOCK_RENDERERS = {
    hero: buildHero,
    text: buildText,
    cards: buildCards,
    links: buildLinks,
    map: buildMap,
    slideshow: buildCarousel,
    table: buildTable,
    faq: buildFaq,
    gallery: buildGallery,
    photo: buildPhoto,
    hours: buildHours,
    review: buildReview,
};

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
   8. RENDER NAVIGATION

   Tabs are derived from the sections array (navItems()), so there is no
   separate nav list to keep in sync.
---------------------------------------------------------------------- */

function renderNav() {
    const desktop = $("#navDesktop");
    const mobile = $("#navMobile");
    const brand = $("#brand");

    if (!desktop || !mobile || !brand) return;

    // Header brand: text by default; an optional spec-level `brandImage`
    // (e.g. a PNG logo) replaces the text visually. The brand string still
    // matters — it becomes the image's alt, and keeps feeding the footer
    // copyright and metadata, so it stays the single source of truth for the
    // name. Monochrome black-on-transparent logos are auto-inverted in dark
    // theme by CSS (--mono-icon-filter on .brand__img).
    const brandImage = typeof SITE.brandImage === "string" ? SITE.brandImage.trim() : "";
    if (brandImage) {
        brand.textContent = "";
        brand.classList.add("brand--image");
        brand.appendChild(el("img", {
            class: "brand__img",
            src: brandImage,
            alt: SITE.brand || "Home",
        }));
    } else {
        brand.textContent = SITE.brand;
    }

    const firstId = navItems()[0] && navItems()[0].id;
    if (firstId) {
        brand.href = tabHash(firstId);
    }

    // Wrap the skull mascot, brand, and optional socials into one left-side
    // header cluster so header-fit measures skull + brand + socials as a unit.
    const brandWrap = el("div", {class: "brand-wrap"});
    brand.replaceWith(brandWrap);

    const skull = document.getElementById("headerSkull");
    if (skull) {
        brandWrap.appendChild(skull);
    }

    brandWrap.appendChild(brand);

    if (SITE.socials && SITE.socials.length) {
        brandWrap.appendChild(buildSocials(SITE.socials));
    }

    desktop.setAttribute("role", "tablist");
    desktop.setAttribute("aria-label", "Main sections");

    navItems().forEach((item) => {
        // Desktop nav is the real ARIA tablist. These IDs are unique.
        desktop.appendChild(
            el(
                "a",
                {
                    href: tabHash(item.id),
                    "data-nav": item.id,
                    role: "tab",
                    id: `tab-${item.id}`,
                    "aria-controls": panelId(item.id),
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
                    href: tabHash(item.id),
                    "data-nav": item.id,
                },
                item.label
            )
        );
    });

    // A copy of the social links at the bottom of the mobile drawer.
    if (SITE.socials && SITE.socials.length) {
        mobile.appendChild(buildSocials(SITE.socials));
    }
}

/* ----------------------------------------------------------------------
   9. RENDER CONTENT SECTIONS

   Each section in the array is rendered as its optional title followed by its
   blocks, in order. Reorder a section by reordering its `blocks`; reorder the
   site by reordering the `sections` array.
---------------------------------------------------------------------- */

function buildSection(section) {
    const node = el("section", {
        id: panelId(section.id),
        class: "section",
        role: "tabpanel",
        "aria-labelledby": `tab-${section.id}`,
        tabindex: "-1",
    });

    // Optional section heading. The hero block carries its own headline, so a
    // section that leads with hero usually omits `title`.
    if (section.title) {
        node.appendChild(el("h2", {class: "section__title"}, section.title));
    }

    const blocks = section.blocks || [];
    blocks.forEach((block) => {
        const rendered = renderBlock(block);
        if (!rendered) return;

        const wrap = el("div", {class: "block"});
        wrap.appendChild(rendered);
        node.appendChild(wrap);
    });

    return node;
}

function renderContent() {
    const main = $("#main");
    if (!main) return;

    main.innerHTML = "";

    // One panel per section, in array order.
    getSections().forEach((section) => {
        main.appendChild(buildSection(section));
    });
}

function renderFooter() {
    const f = $("#siteFooter");
    if (!f) return;

    // JSON can't compute a value, so the year is filled in here at render time.
    const year = (SITE.footer && SITE.footer.year) || new Date().getFullYear();
    const note = (SITE.footer && SITE.footer.note) || "";

    f.innerHTML = "";

    const copyright = el("span", {}, `© ${year} ${SITE.brand || ""}`.trim());
    f.append(copyright);

    // Optional visitor count, attached right after the © line. Driven by
    // meta.analytics.countUrl (e.g. a GoatCounter /counter/TOTAL.json
    // endpoint); absent config = no count, no request. The fetch is
    // best-effort: any failure leaves the footer untouched, never throws.
    const analytics = SITE.meta && SITE.meta.analytics;
    if (analytics && analytics.countUrl) {
        // Link to the public dashboard if one is configured, else a plain span.
        const countEl = analytics.dashboardUrl
            ? el("a", linkAttrs(analytics.dashboardUrl, {
                class: "footer__count",
                "aria-label": "Štatistiky návštevnosti",
            }))
            : el("span", {class: "footer__count"});
        f.append(countEl);
        renderVisitorCount(countEl, analytics.countUrl, analytics.countLabel);
    }

    f.append(el("span", {}, note));
}

/* Fetch the visitor count from a GoatCounter-style JSON endpoint and write it
   into `target`. Best-effort: the count.js script (loaded in index.html) does
   the actual tracking; this only displays the number. Requires "Allow adding
   visitor counts on your website" to be enabled in the GoatCounter site
   settings, otherwise the endpoint won't return a usable count. */
async function renderVisitorCount(target, url, label) {
    try {
        const res = await fetch(url, {headers: {Accept: "application/json"}});
        if (!res.ok) return;
        const data = await res.json();
        // GoatCounter returns { count: "1,234", count_unique: "..." }; count is
        // already a localized string. Fall back across field names defensively.
        const count = data.count_unique || data.count;
        if (count == null || count === "") return;
        target.textContent = label ? `${count} ${label}` : String(count);
    } catch (err) {
        // Network/parse failure — leave the footer count empty, never break.
        console.warn("Visitor count unavailable:", err);
    }
}

/* ----------------------------------------------------------------------
   10. RENDER THEME

   Brand-defining design tokens live in SITE.theme so one engine can produce
   differently-branded sites from config alone. This writes them as :root
   custom properties at boot; styles.css holds the defaults, so any token the
   spec omits simply keeps its CSS value. Structural CSS is NOT touched here —
   only the brand knobs (accent, fonts, sizing, social tints).
---------------------------------------------------------------------- */

function renderTheme() {
    const t = SITE.theme;
    if (!t || typeof t !== "object") return;

    const root = document.documentElement.style;
    const setVar = (name, value) => {
        if (value === undefined || value === null || value === "") return;
        root.setProperty(name, String(value));
    };

    setVar("--accent", t.accent);
    setVar("--root-scale", t.rootScale);
    setVar("--content-width", t.contentWidth);
    setVar("--radius", t.radius);
    setVar("--font-sans", t.fontSans);
    setVar("--font-serif", t.fontHeading);
    setVar("--font-brand", t.fontBrand);

    // Per-platform social brand tints, e.g. { instagram: "#e1306c" }.
    if (t.socialColors && typeof t.socialColors === "object") {
        Object.entries(t.socialColors).forEach(([key, color]) => {
            setVar(`--brand-${key}`, color);
        });
    }
}

/* ----------------------------------------------------------------------
   11. RENDER DOCUMENT HEAD

   Single source of truth for the page's metadata: everything here is driven
   by SITE.meta. The tags also exist statically in index.html so crawlers and
   social scrapers (which don't run JS) still see them — this function keeps
   them in sync with the config and is the canonical place to change them.

   Idempotent: each tag is found-or-created by a stable selector and only its
   value is updated, so running this never duplicates tags. To change the
   title/description/OG/etc., edit SITE.meta in site-spec.json — not the HTML.
---------------------------------------------------------------------- */

function renderHead() {
    const meta = SITE.meta;
    if (!meta) return;

    // <html lang>
    if (meta.lang) document.documentElement.setAttribute("lang", meta.lang);

    // <title>
    if (meta.title) document.title = meta.title;

    /* Find a <meta>/<link> by attribute (e.g. name="description" or
       property="og:title"); create it in <head> if absent, then set its value
       attribute. Keeps one tag per key — no duplicates on re-run. */
    const setMeta = (attr, key, valueAttr, value) => {
        if (value === undefined || value === null) return;
        const head = document.head;
        let node = head.querySelector(`meta[${attr}="${key}"]`);
        if (!node) {
            node = document.createElement("meta");
            node.setAttribute(attr, key);
            head.appendChild(node);
        }
        node.setAttribute(valueAttr, String(value));
    };

    const setLink = (rel, href) => {
        if (!href) return;
        const head = document.head;
        let node = head.querySelector(`link[rel="${rel}"]`);
        if (!node) {
            node = document.createElement("link");
            node.setAttribute("rel", rel);
            head.appendChild(node);
        }
        node.setAttribute("href", href);
    };

    // Standard meta (name="...")
    setMeta("name", "description", "content", meta.description);
    setMeta("name", "author", "content", meta.author);
    setMeta("name", "theme-color", "content", meta.themeColor);
    setMeta("name", "twitter:card", "content", meta.twitterCard);

    // Open Graph (property="..."). og:description can differ from the plain
    // meta description; fall back to it when not separately specified.
    setMeta("property", "og:type", "content", meta.ogType);
    setMeta("property", "og:title", "content", meta.title);
    setMeta("property", "og:description", "content", meta.ogDescription || meta.description);
    setMeta("property", "og:url", "content", meta.domain);
    if (meta.ogImage) setMeta("property", "og:image", "content", meta.ogImage);

    // Canonical
    setLink("canonical", meta.domain);
}

/* ----------------------------------------------------------------------
   12. INPUT MODE
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
   13. THEME (light / dark + localStorage)
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
        const bg = getComputedStyle(document.body).getPropertyValue("--bg-base").trim();
        if (bg) meta.setAttribute("content", bg);
    }
}

function initTheme() {
    const toggle = $("#themeToggle");
    if (!toggle) return;

    const stored = getStoredTheme();
    const theme = stored || "dark";

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
   14. MOBILE MENU
---------------------------------------------------------------------- */

function initMobileMenu() {
    const toggle = $("#menuToggle");
    const nav = $("#navMobile");
    const scrim = $("#navScrim");

    if (!toggle || !nav || !scrim) return;

    // Close button inside the drawer (frosted drawer needs an explicit X).
    let closeBtn = nav.querySelector(".nav-mobile__close");
    if (!closeBtn) {
        closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "nav-mobile__close";
        closeBtn.setAttribute("aria-label", "Close menu");
        closeBtn.innerHTML = "&times;";
        nav.prepend(closeBtn);
    }

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
    closeBtn.addEventListener("click", close);
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
   15. TABS

   Each section is a tab panel; only one is shown at a time. The URL hash
   drives the active tab, so direct links and browser navigation work. The
   tab/panel id list comes from the sections array.
---------------------------------------------------------------------- */

function initTabs() {
    if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
    }

    const nav = navItems();
    const links = Array.from(document.querySelectorAll("[data-nav]"));
    const desktopTabs = Array.from(document.querySelectorAll("#navDesktop [role='tab']"));
    const panels = nav.map((n) => document.getElementById(panelId(n.id))).filter(Boolean);
    const ids = nav.map((n) => n.id);
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

    let firstShow = true;

    const show = (rawId, {focusPanel = false, push = true, scrollTop = true} = {}) => {
        const id = normalize(rawId);

        panels.forEach((p) => {
            const active = p.id === panelId(id);
            p.hidden = !active;

            // Do not animate the initial render. Only animate real tab changes.
            p.classList.toggle("section--active", active && !firstShow);
        });

        firstShow = false;

        links.forEach((link) => setActiveLink(link, id));

        if (push && readTabHash() !== id) {
            history.pushState(null, "", tabHash(id));
        }

        if (scrollTop) {
            scrollToTopInstant();
        }

        if (focusPanel) {
            const panel = document.getElementById(panelId(id));
            if (panel) panel.focus({preventScroll: true});
        }
    };

    // Click / tap.
    links.forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            show(link.getAttribute("data-nav"));

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

    window.addEventListener("hashchange", () => {
        show(readTabHash() || defaultId, {push: false});
    });

    window.addEventListener("popstate", () => {
        show(readTabHash() || defaultId, {push: false});
    });

    // Initial render: read #/kontakt or legacy #kontakt, but do not let browser anchor-scroll.
    show(readTabHash() || defaultId, {push: false, scrollTop: true});
}

/* ----------------------------------------------------------------------
   16. HEADER FIT
---------------------------------------------------------------------- */

function initHeaderFit() {
    const header = $(".site-header");
    const brandWrap = $(".brand-wrap");
    const nav = $("#navDesktop");

    if (!header || !brandWrap || !nav) return;

    const BUFFER = 24;

    const apply = () => {
        header.classList.remove("force-mobile-nav");

        if (window.innerWidth <= 640) return;

        const socials = brandWrap.querySelectorAll(".socials__link");
        const leftEdgeEl = socials.length
            ? socials[socials.length - 1]
            : brandWrap.lastElementChild;
        const firstTab = nav.querySelector("a");

        if (!leftEdgeEl || !firstTab) return;

        const leftRight = leftEdgeEl.getBoundingClientRect().right;
        const tabLeft = firstTab.getBoundingClientRect().left;

        const gap = tabLeft - leftRight;

        if (gap < BUFFER) {
            header.classList.add("force-mobile-nav");
        } else {
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

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(apply).catch(() => {
        });
    }
}

/* ----------------------------------------------------------------------
   17. BACKGROUND
---------------------------------------------------------------------- */

function initBackground() {
    const layers = [$("#bg"), $("#bg2")].filter(Boolean);
    const list = SITE.backgrounds;

    if (layers.length < 2 || !list || !list.length) {
        const bg = layers[0];
        if (bg && list && list.length) {
            const img = new Image();
            img.onload = () => {
                bg.style.backgroundImage = `url("${list[0]}")`;
                bg.classList.add("is-active");
            };
            img.src = list[0];
        }
        return;
    }

    const HOLD = 8000;

    let index = 0;       // which image in the list is showing
    let front = 0;       // which layer is currently on top (0 or 1)

    const show = (i, layerIndex) => {
        const layer = layers[layerIndex];
        const src = list[i];
        const img = new Image();

        img.onload = () => {
            layer.style.backgroundImage = `url("${src}")`;

            layer.classList.remove("is-active");
            void layer.offsetWidth;
            layer.classList.add("is-active");

            layers[1 - layerIndex].classList.remove("is-active");
        };

        img.onerror = () => {
            // Image missing — skip to the next one on the next tick.
        };

        img.src = src;
    };

    show(index, front);

    if (list.length < 2) return;

    setInterval(() => {
        index = (index + 1) % list.length;   // next image, in order
        front = 1 - front;                    // swap to the other layer
        show(index, front);
    }, HOLD);
}

/* ----------------------------------------------------------------------
   18. BOOT
---------------------------------------------------------------------- */

/* Fetch the content JSON. JSON is the single source of truth — there is no
   inline fallback to merge onto, so this just loads + parses + returns it.

   Returns { data, error }:
     - data:  the parsed JSON on success, otherwise null.
     - error: null on success, otherwise { kind, detail } describing why the
              load failed. init() turns a null/empty result into the error
              screen.

   Failure shapes:
     - "fetch" — couldn't load it at all (404 / network / file:// CORS).
     - "parse" — loaded, but the body wasn't valid JSON. */
async function loadContent() {
    let res;
    try {
        res = await fetch(DATA_URL, {headers: {Accept: "application/json"}});
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`.trim());
    } catch (err) {
        console.error("Content fetch failed:", err);
        return {data: null, error: {kind: "fetch", detail: `Could not load ${DATA_URL}: ${err.message}`}};
    }

    try {
        const data = await res.json();
        return {data, error: null};
    } catch (err) {
        console.error("Content parse failed:", err);
        return {data: null, error: {kind: "parse", detail: `${DATA_URL} is not valid JSON: ${err.message}`}};
    }
}

/* The visible screen shown when there is nothing to render: the JSON failed
   to load/parse, or loaded but had no usable sections. Plain DOM, themed via
   the same CSS vars, no deps. Gives the visitor a calm "temporarily
   unavailable" message + a contact escape hatch, and tucks the technical
   reason into a <details> for whoever maintains the site.

   It lays down a minimal brand + footer so the chrome isn't half-built, and
   skips the nav/tabs/background wiring that assume real sections exist.

   Note: when the JSON failed to load, SITE is empty, so the brand and the
   contact escape hatch below simply render nothing — that's fine. If the JSON
   loaded but was merely missing sections, brand/socials may still show. */
function renderErrorState(reason) {
    const main = $("#main");

    // Minimal header brand (empty if the JSON never loaded).
    const brand = $("#brand");
    if (brand) brand.textContent = SITE.brand || "";

    if (main) {
        main.innerHTML = "";

        const wrap = el("div", {class: "block"});
        const box = el("div", {class: "error-state", role: "alert"});

        box.appendChild(el("h1", {class: "error-state__title"}, "Stránka je dočasne nedostupná"));
        box.appendChild(el(
            "p",
            {class: "error-state__lead"},
            "Obsah sa práve nepodarilo načítať. Skús to prosím o chvíľu znova. "
        ));

        // Contact escape hatch from socials, if any survived (none if the JSON
        // failed to load) — so the visitor isn't fully stuck.
        const socials = (SITE.socials || []).filter((s) => s && s.url);
        if (socials.length) {
            box.appendChild(buildSocials(socials));
        }

        // Technical detail for the maintainer, collapsed by default.
        if (reason && reason.detail) {
            const details = el("details", {class: "error-state__details"});
            details.appendChild(el("summary", {}, "Technické detaily"));
            details.appendChild(el("p", {}, escapeAttr(reason.detail)));
            box.appendChild(details);
        }

        wrap.appendChild(box);
        main.appendChild(wrap);
    }

    // A footer is harmless and keeps the page feeling whole.
    renderFooter();
}

/*
 * Built from m-remis/static-web-template
 * https://github.com/m-remis/static-web-template
 */

async function init() {
    // Reveal the page exactly once, no matter which path init() takes (normal
    // render OR the error screen). The shell starts hidden via html.site-booting
    // (set inline in index.html before first paint) to avoid a flash of the
    // empty layout; we swap to site-ready here so the finished page fades in.
    // Must run on every exit, or the page would stay invisible — hence finally.
    const reveal = () => {
        const html = document.documentElement;
        html.classList.remove("site-booting");
        html.classList.add("site-ready");
    };

    try {
        const {data, error} = await loadContent();
        SITE = data || {};

        // Drive the document head (title, meta, OG, canonical) from SITE.meta.
        // Done first so the metadata is correct even if we fall through to the
        // error screen below.
        renderHead();

        // Apply brand design tokens from SITE.theme (before content paints, and
        // before the error screen, so both are correctly branded).
        renderTheme();

        // JSON is the single source of truth: render it, or show the error
        // screen. Three ways we end up with nothing to render:
        //   - "fetch": couldn't load the file (404 / network / file:// CORS),
        //   - "parse": loaded but wasn't valid JSON,
        //   - "empty": loaded + parsed fine, but had no usable `sections`.
        const hasContent = getSections().length > 0;

        if (!hasContent) {
            const reason = error || {
                kind: "empty",
                detail: `${DATA_URL} loaded but contained no usable "sections".`,
            };
            console.error("No renderable content — showing error screen:", reason.detail);

            renderErrorState(reason);
            initInputMode();
            initTheme();
            return;
        }

        renderNav();
        renderContent();
        renderFooter();
        initInputMode();
        initTheme();
        initMobileMenu();
        initHeaderFit();
        initTabs();
        initBackground();

        try {
            initSkull();
        } catch (err) {
            console.warn("Skull init failed:", err);
        }
    } finally {
        reveal();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}