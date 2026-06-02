/* =========================================================
   Static site template
   script.js — content data + UI logic
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

   BLOCK WIDTH
   -----------
   Each block sits in a width tier set automatically by type (see BLOCK_WIDTHS).
   Override per block with "width": "narrow" | "wide".

   BLOCK TYPES (each block is an object with a "type"):
     { "type": "hero", "eyebrow", "title", "lead" }
     { "type": "text", "text": "Paragraph. Inline <em>…</em> and <a …> ok." }
     { "type": "cards", "linked": false, "items": [ { "title","body","meta","url" } ] }
     { "type": "links", "items": [ { "label","handle","url","icon" } ] }
     { "type": "map", "mode": "embed", "embed","url","label","address" }
     { "type": "slideshow", "name","blurb", "slides": [ { "src","title","caption","text" } ] }
     { "type": "table", "name","blurb", "headings": [...], "rows": [ [...], ... ] }

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
        const attrs = {
            href: it.url,
            class: it.icon ? `link-list--${it.icon}` : null,
        };
        if (isExternalUrl(it.url)) {
            attrs.target = "_blank";
            attrs.rel = "noopener noreferrer";
        }

        // Optional leading icon — `icon` must match a key in SOCIAL_ICONS.
        const icon = it.icon && SOCIAL_ICONS[it.icon]
            ? `<span class="link-list__icon" aria-hidden="true">${SOCIAL_ICONS[it.icon]}</span>`
            : "";

        const a = el(
            "a",
            attrs,
            `${icon}<span class="label">${it.label}</span><span class="handle">${it.handle}</span>`
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
     optional address line (only if `address` is set), and the button. */
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
                `<a href="${href}" target="_blank" rel="noopener noreferrer">Otvoriť Mapy</a>`
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
            `<a href="${href || block.embed}" target="_blank" rel="noopener noreferrer">Otvoriť mapy</a>`
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
   2C. SLIDESHOW / CAROUSEL (reusable)

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

    const viewport = el("div", {class: "carousel__viewport"});

    const lightboxSlides = list.map((s, i) => ({
        src: s.src,
        caption:
            [s.title, s.caption, s.text].filter(Boolean).join(" — ") ||
            (s.title || s.caption || `Slide ${i + 1}`),
    }));

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
   2D. BLOCK DISPATCH
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

   Tabs are derived from the sections array (navItems()), so there is no
   separate nav list to keep in sync.
---------------------------------------------------------------------- */

function renderNav() {
    const desktop = $("#navDesktop");
    const mobile = $("#navMobile");
    const brand = $("#brand");

    if (!desktop || !mobile || !brand) return;

    brand.textContent = SITE.brand;

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

    // A copy of the social links at the bottom of the mobile drawer.
    if (SITE.socials && SITE.socials.length) {
        mobile.appendChild(buildSocials(SITE.socials));
    }
}

/* ----------------------------------------------------------------------
   4. RENDER CONTENT SECTIONS

   Each section in the array is rendered as its optional title followed by its
   blocks, in order. Reorder a section by reordering its `blocks`; reorder the
   site by reordering the `sections` array.
---------------------------------------------------------------------- */

function buildSection(section) {
    const node = el("section", {
        id: section.id,
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
    f.append(
        el("span", {}, `© ${year} ${SITE.brand || ""}`.trim()),
        el("span", {}, note)
    );
}

/* ----------------------------------------------------------------------
   5A. INPUT MODE
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
   6. MOBILE MENU
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
   7. TABS

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
    const panels = nav.map((n) => document.getElementById(n.id)).filter(Boolean);
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
            const toTop = () => window.scrollTo(0, 0);
            toTop();
            requestAnimationFrame(toTop);

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
        show(location.hash.slice(1) || defaultId, {push: false});
    });

    window.addEventListener("popstate", () => {
        show(location.hash.slice(1) || defaultId, {push: false});
    });

    show(location.hash.slice(1) || defaultId, {push: false, forceTop: true});
}

/* ----------------------------------------------------------------------
   8B. HEADER FIT
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
   8. BACKGROUND
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
   9. BOOT
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

        const wrap = el("div", {class: "block block--wide"});
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
    const {data, error} = await loadContent();
    SITE = data || {};

    // JSON is the single source of truth: render it, or show the error screen.
    // Three ways we end up with nothing to render:
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
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}