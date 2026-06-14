#!/usr/bin/env node
/* =========================================================
   launch-check.js — static-site launch preflight

   A dev-only tool. NOT loaded by the page. Run before shipping
   a client site:

       node launch-check.js
       node launch-check.js --strict
       node launch-check.js --json
       node launch-check.js --root ./dist

   It inspects the current static-site folder and validates the
   things that silently ship wrong: placeholder text, fake contact
   data, broken/missing/unused assets, weak SEO metadata, malformed
   site-spec.json, broken manifest icon paths, bad internal links,
   and block/schema drift.

   Errors   -> printed under "Errors", exit code 1 (blocks launch).
   Warnings -> printed under "Warnings", exit code 0 by default.
               Use --strict to treat warnings as launch blockers.

   Zero npm dependencies. CommonJS. Node built-ins only.

   Built from m-remis/static-web-template
   ========================================================= */

"use strict";

const fs = require("fs");
const path = require("path");

/* ---- CLI ---------------------------------------------------------------- */

const ARGV = process.argv.slice(2);

function hasFlag(name) {
    return ARGV.includes(name);
}

function readOption(name, fallback = null) {
    const prefix = `${name}=`;
    const inline = ARGV.find((arg) => arg.startsWith(prefix));
    if (inline) return inline.slice(prefix.length);

    const idx = ARGV.indexOf(name);
    if (idx !== -1 && ARGV[idx + 1] && !ARGV[idx + 1].startsWith("--")) {
        return ARGV[idx + 1];
    }

    return fallback;
}

const OPTS = {
    json: hasFlag("--json"),
    help: hasFlag("--help") || hasFlag("-h"),
    strict: hasFlag("--strict"),
    noUnusedAssets: hasFlag("--no-unused-assets"),
    root: readOption("--root", process.cwd()),
    siteSpec: readOption("--site-spec", "site-spec.json"),
    maxImageKb: Number(readOption("--max-image-kb", "900")),
    maxCssKb: Number(readOption("--max-css-kb", "250")),
    maxJsKb: Number(readOption("--max-js-kb", "250")),
};

const ROOT = path.resolve(OPTS.root);
const SPEC_FILE = normalizeCliPath(OPTS.siteSpec);

if (OPTS.help) {
    console.log(`launch-check.js — static-site launch preflight

Usage:
  node launch-check.js [options]

Options:
  --json                  Emit a machine-readable JSON report.
  --strict                Treat warnings as blocking failures.
  --root <dir>            Check another folder instead of cwd.
  --site-spec <file>      Use another JSON spec file. Default: site-spec.json
  --no-unused-assets      Do not warn about unused files under assets/.
  --max-image-kb <n>      Warn when image assets exceed n KB. Default: 900
  --max-css-kb <n>        Warn when CSS files exceed n KB. Default: 250
  --max-js-kb <n>         Warn when JS files exceed n KB. Default: 250
  -h,--help               Show this help.

Exit codes:
  0  pass
  1  fail

Notes:
  Errors always fail.
  Warnings only fail with --strict.`);
    process.exit(0);
}

function normalizeCliPath(p) {
    return String(p || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

/* ---- Static contract ----------------------------------------------------- */

/* The block types the engine/template is expected to support.
   Keep this close to BLOCK_RENDERERS in engine.js. A missing entry here causes
   false launch failures; a missing renderer in engine.js still means the page
   cannot render the block. */
const BLOCK_RULES = Object.freeze({
    hero: {
        description: "landing hero block",
    },
    text: {
        description: "rich/free text block",
    },
    cards: {
        description: "card grid block",
    },
    links: {
        description: "contact/social links block",
    },
    map: {
        description: "map embed/link block",
    },
    slideshow: {
        description: "carousel/slideshow block",
    },
    table: {
        description: "responsive table block",
    },
    faq: {
        description: "FAQ / accordion block",
    },
    photo: {
        description: "single image/photo block",
    },
    gallery: {
        description: "image gallery/lightbox block",
    },
    hours: {
        description: "opening hours block (reads business.hours)",
    },
    review: {
        description: "leave-a-review CTA block (outbound links, no backend)",
    },
});

const KNOWN_BLOCK_TYPES = Object.keys(BLOCK_RULES);

/* Asset extensions we treat as local references when found in strings. */
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif", ".ico", ".avif"];
const CSS_EXT = [".css"];
const JS_EXT = [".js", ".mjs"];
const LOCAL_ASSET_EXT = [...IMAGE_EXT, ...CSS_EXT, ...JS_EXT, ".json", ".webmanifest", ".txt", ".xml"];

/* Placeholder / filler markers. Case-insensitive substring match against every
   string in the spec. Kept deliberately practical for Slovak small-business
   sites, while avoiding extremely generic words that would false-positive. */
const PLACEHOLDER_MARKERS = [
    "lorem", "ipsum", "bla bla",
    "nejaky", "nejaký",
    "doplnit", "doplniť",
    "docasne", "dočasne",
    "zatial", "zatiaľ",
    "sem vlož",
    "tbd", "fixme", "todo", "placeholder", "dummy",
    "your company", "your name", "your email", "your phone",
    "example text", "sample text", "testovací text", "testovaci text",
    "návrh štruktúry", "navrh struktury",
];

/* Obviously-fake contact values. */
const FAKE_EMAILS = [
    "r@r.sk", "test@test.sk", "demo@example.com", "info@example.com",
    "your@email.com", "name@example.com", "email@example.com",
];
const FAKE_PHONE_DIGITS = ["000000000", "123456789", "1234567890"];
const FAKE_SOCIAL_HANDLES = [
    "@test", "@demo", "@example", "@yourname", "@yourhandle", "@instagram",
];

const PLACEHOLDER_DOMAINS = [
    "example.com", "example.org", "yourdomain", "your-domain",
    "m-remis.github.io/static-web-template", "username.github.io",
    "localhost", "127.0.0.1",
];

/* ---- Collected results --------------------------------------------------- */

const errors = [];   // [{ category, code, message }]
const warnings = []; // [{ category, code, message }]

/* Set once by checkSpecShape so block checks can consult the single-source-of-
   truth fallbacks the engine uses: a map block inherits business.mapEmbed /
   mapUrl, and a links block can resolve `use: [...]` against business/socials.
   Without this, map/links blocks that rely on those fallbacks (and render
   fine) get flagged as empty. */
let specBusiness = {};
let specSocials = [];

function fail(category, code, message) {
    if (message == null) {
        message = code;
        code = "ERROR";
    }
    errors.push({ category, code, message });
}

function warn(category, code, message) {
    if (message == null) {
        message = code;
        code = "WARNING";
    }
    warnings.push({ category, code, message });
}

/* ---- Small fs helpers ---------------------------------------------------- */

function absPath(rel) {
    return path.join(ROOT, rel);
}

function fileExists(rel) {
    if (!rel) return false;
    try {
        return fs.existsSync(absPath(rel));
    } catch {
        return false;
    }
}

function readText(rel) {
    try {
        return fs.readFileSync(absPath(rel), "utf8");
    } catch {
        return null;
    }
}

/* Returns { ok, data, error }. ok=false with error set if missing or invalid. */
function readJson(rel) {
    const raw = readText(rel);
    if (raw == null) return { ok: false, data: null, error: "missing" };
    try {
        return { ok: true, data: JSON.parse(raw), error: null };
    } catch (e) {
        return { ok: false, data: null, error: e.message };
    }
}

/* Recursively list every file under a dir, returned as repo-relative paths
   with forward slashes. Skips hidden directories and dependency/build dirs. */
function walkDir(rel) {
    const out = [];
    const abs = absPath(rel);
    let entries;

    try {
        entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
        return out;
    }

    for (const ent of entries) {
        if (shouldSkipFsEntry(ent.name)) continue;

        const childRel = path.posix.join(rel, ent.name);
        if (ent.isDirectory()) {
            out.push(...walkDir(childRel));
        } else if (ent.isFile()) {
            out.push(childRel);
        }
    }

    return out;
}

function shouldSkipFsEntry(name) {
    return name === ".git" ||
        name === ".github" ||
        name === "node_modules" ||
        name === "dist" ||
        name === "build" ||
        name === ".DS_Store";
}

function fileSizeBytes(rel) {
    try {
        return fs.statSync(absPath(rel)).size;
    } catch {
        return null;
    }
}

/* Normalize a local reference to a repo-relative path we can existence-check. */
function normalizeRef(ref) {
    if (!ref) return ref;
    let r = String(ref).trim().replace(/\\/g, "/").replace(/^\.\//, "");
    r = r.split(/[?#]/)[0];
    r = r.replace(/^\//, "");
    return r;
}

function isExternalUrl(value) {
    return /^https?:\/\//i.test(String(value || ""));
}

function isProtocolUrl(value) {
    return /^[a-z][a-z0-9+.-]*:/i.test(String(value || ""));
}

function isLocalReference(value) {
    if (typeof value !== "string") return false;
    const v = value.trim();
    if (!v || v.startsWith("#")) return false;
    if (v.startsWith("mailto:") || v.startsWith("tel:")) return false;
    if (isExternalUrl(v)) return false;
    if (isProtocolUrl(v)) return false;
    return true;
}

function hasExtension(value, exts) {
    const clean = String(value || "").split(/[?#]/)[0].toLowerCase();
    return exts.some((ext) => clean.endsWith(ext));
}

/* ---- Spec traversal ------------------------------------------------------ */

/* Walk every value in a parsed JSON object, calling cb(value, jsonPath) for
   each primitive (string/number/bool). jsonPath is a $.a.b[0].c style string. */
function walkValues(node, cb, pathStr = "$") {
    if (Array.isArray(node)) {
        node.forEach((v, i) => walkValues(v, cb, `${pathStr}[${i}]`));
    } else if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node)) {
            walkValues(v, cb, `${pathStr}.${k}`);
        }
    } else {
        cb(node, pathStr);
    }
}

/* Like walkValues but visits objects/arrays too. */
function walkNodes(node, cb, pathStr = "$") {
    cb(node, pathStr);
    if (Array.isArray(node)) {
        node.forEach((v, i) => walkNodes(v, cb, `${pathStr}[${i}]`));
    } else if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node)) {
            walkNodes(v, cb, `${pathStr}.${k}`);
        }
    }
}

/* Collect every string that looks like a local asset reference, anywhere in
   the spec. Returns array of { ref, path }. */
function collectAssetRefs(node) {
    const refs = [];
    walkValues(node, (val, p) => {
        if (typeof val !== "string") return;
        const v = val.trim();
        if (!v) return;
        if (!isLocalReference(v) && !v.startsWith("/")) return;
        if (!hasExtension(v, LOCAL_ASSET_EXT)) return;
        refs.push({ ref: v, path: p });
    });
    return refs;
}

/* ---- Required files ------------------------------------------------------ */

function checkRequiredFiles() {
    const required = [
        "index.html",
        "styles.css",
        SPEC_FILE,
        "site.webmanifest",
        "robots.txt",
        "sitemap.xml",
    ];

    for (const f of required) {
        if (!fileExists(f)) fail("missing", "MISSING_FILE", `Missing required file: ${f}`);
    }

    if (!fileExists("script.js") && !fileExists("engine.js")) {
        fail("missing", "MISSING_RUNTIME", "Missing runtime script: expected script.js or engine.js");
    }
}

/* ---- Spec shape / blocks ------------------------------------------------- */

function checkSpecShape(spec) {
    if (!spec || typeof spec !== "object") {
        fail("spec", "SPEC_NOT_OBJECT", `${SPEC_FILE} is not an object`);
        return;
    }

    // Capture SSOT sources for block checks (map fallback, links `use`).
    specBusiness = (spec.business && typeof spec.business === "object") ? spec.business : {};
    specSocials = Array.isArray(spec.socials) ? spec.socials : [];

    if (!spec.brand || typeof spec.brand !== "string") {
        warn("spec", "MISSING_BRAND", `${SPEC_FILE}: missing top-level "brand"`);
    }

    checkMetaShape(spec.meta || {});

    const sections = spec.sections;
    if (!Array.isArray(sections)) {
        fail("spec", "SECTIONS_NOT_ARRAY", `${SPEC_FILE}: "sections" must be an array`);
        return;
    }
    if (sections.length === 0) {
        fail("spec", "SECTIONS_EMPTY", `${SPEC_FILE}: "sections" is empty`);
        return;
    }

    const seenIds = new Set();
    const seenLabels = new Set();
    const sectionIds = collectSectionIds(spec);

    sections.forEach((sec, i) => {
        const where = `$.sections[${i}]`;
        if (!sec || typeof sec !== "object") {
            fail("spec", "SECTION_NOT_OBJECT", `${where} is not an object`);
            return;
        }

        if (!sec.id) {
            fail("spec", "SECTION_MISSING_ID", `${where} is missing "id"`);
        } else {
            const id = String(sec.id);
            if (!/^[a-z0-9][a-z0-9_-]*$/i.test(id)) {
                warn("spec", "SECTION_ID_FORMAT", `${where} id "${id}" should be URL-hash friendly: letters, numbers, _, -`);
            }
            if (seenIds.has(id)) {
                fail("spec", "DUPLICATE_SECTION_ID", `Duplicate section id: ${id}`);
            }
            seenIds.add(id);
        }

        if (!sec.label) {
            warn("spec", "SECTION_MISSING_LABEL", `${where} (id=${sec.id || "?"}) is missing "label" — the nav tab will be blank`);
        } else {
            const labelKey = String(sec.label).trim().toLowerCase();
            if (seenLabels.has(labelKey)) {
                warn("spec", "DUPLICATE_SECTION_LABEL", `${where} label "${sec.label}" is duplicated in nav`);
            }
            seenLabels.add(labelKey);
        }

        if (!Array.isArray(sec.blocks) || sec.blocks.length === 0) {
            warn("spec", "SECTION_EMPTY", `${where} (id=${sec.id || "?"}) has no blocks — the tab will render empty`);
            return;
        }

        const seenBlockNames = new Set();

        sec.blocks.forEach((block, j) => {
            const bwhere = `${where}.blocks[${j}]`;
            if (!block || typeof block !== "object") {
                fail("spec", "BLOCK_NOT_OBJECT", `${bwhere} is not an object`);
                return;
            }
            if (!block.type) {
                fail("spec", "BLOCK_MISSING_TYPE", `${bwhere} is missing "type"`);
                return;
            }
            if (!KNOWN_BLOCK_TYPES.includes(block.type)) {
                fail(
                    "spec",
                    "UNKNOWN_BLOCK_TYPE",
                    `${bwhere} has unknown block type "${block.type}" (engine will likely skip it). Known: ${KNOWN_BLOCK_TYPES.join(", ")}`
                );
                return;
            }

            if (block.name) {
                const nameKey = String(block.name).trim().toLowerCase();
                if (seenBlockNames.has(nameKey)) {
                    warn("content", "DUPLICATE_BLOCK_NAME", `${bwhere} duplicates block name "${block.name}" inside section "${sec.id || "?"}"`);
                }
                seenBlockNames.add(nameKey);
            }

            checkBlockRequiredFields(block, bwhere, sec, sectionIds);
        });
    });
}

function checkMetaShape(meta) {
    if (!meta || typeof meta !== "object") {
        fail("spec", "META_NOT_OBJECT", `${SPEC_FILE}: "meta" must be an object`);
        return;
    }

    const required = ["lang", "domain", "title", "description", "author", "themeColor"];
    for (const key of required) {
        if (!meta[key]) warn("spec", "META_FIELD_MISSING", `${SPEC_FILE}: meta.${key} is missing`);
    }

    if (meta.description && String(meta.description).length > 170) {
        warn("seo", "META_DESCRIPTION_LONG", `meta.description is ${String(meta.description).length} chars — usually keep it around 150-160`);
    }

    if (meta.title && String(meta.title).length > 70) {
        warn("seo", "META_TITLE_LONG", `meta.title is ${String(meta.title).length} chars — social/search snippets may truncate it`);
    }

    if (meta.themeColor && !/^#[0-9a-f]{6}$/i.test(String(meta.themeColor))) {
        warn("seo", "THEME_COLOR_FORMAT", `meta.themeColor should be a 6-digit hex color, got "${meta.themeColor}"`);
    }

    if (meta.domain) {
        checkUrlValue(meta.domain, "$.meta.domain", { allowHash: false, allowRelative: false, allowMailTel: false });
    }

    if (meta.ogImage) {
        checkUrlValue(meta.ogImage, "$.meta.ogImage", { allowHash: false, allowRelative: true, allowMailTel: false });
    }

    if (meta.analytics && typeof meta.analytics === "object") {
        for (const key of ["countUrl", "dashboardUrl"]) {
            if (meta.analytics[key]) {
                checkUrlValue(meta.analytics[key], `$.meta.analytics.${key}`, { allowHash: false, allowRelative: false, allowMailTel: false });
            }
        }
    }
}

/* Per-type required fields. Mirrors what each builder needs to render anything;
   a builder returning null or empty should be caught here before shipping. */
function checkBlockRequiredFields(block, where, section, sectionIds) {
    switch (block.type) {
        case "hero":
            checkHeroBlock(block, where);
            break;
        case "text":
            checkTextBlock(block, where);
            break;
        case "cards":
            checkCardsBlock(block, where, sectionIds);
            break;
        case "links":
            checkLinksBlock(block, where, sectionIds);
            break;
        case "table":
            checkTableBlock(block, where);
            break;
        case "faq":
            checkFaqBlock(block, where);
            break;
        case "slideshow":
            checkSlideshowBlock(block, where, section);
            break;
        case "map":
            checkMapBlock(block, where);
            break;
        case "photo":
            checkPhotoBlock(block, where, section);
            break;
        case "gallery":
            checkGalleryBlock(block, where, section);
            break;
        case "hours":
            checkHoursBlock(block, where);
            break;
        case "review":
            checkReviewBlock(block, where);
            break;
        default:
            // Unknown types are handled before dispatch.
            break;
    }
}

function checkHeroBlock(block, where) {
    if (!hasNonEmptyString(block.title)) {
        warn("spec", "HERO_MISSING_TITLE", `${where} (hero) has no "title"`);
    }
    if (!hasNonEmptyString(block.lead)) {
        warn("content", "HERO_MISSING_LEAD", `${where} (hero) has no "lead"`);
    } else if (plainTextLength(block.lead) < 40) {
        warn("content", "HERO_SHORT_LEAD", `${where} (hero) has very short lead text`);
    }
}

function checkTextBlock(block, where) {
    if (!hasNonEmptyString(block.text)) {
        warn("spec", "TEXT_MISSING_TEXT", `${where} (text) has no "text"`);
    } else if (plainTextLength(block.text) < 20) {
        warn("content", "TEXT_TOO_SHORT", `${where} (text) is very short`);
    }
}

function checkCardsBlock(block, where, sectionIds) {
    if (!Array.isArray(block.items) || block.items.length === 0) {
        fail("spec", "CARDS_EMPTY", `${where} (cards) has no "items"`);
        return;
    }

    const seenTitles = new Set();
    block.items.forEach((item, i) => {
        const iw = `${where}.items[${i}]`;
        if (!item || typeof item !== "object") {
            fail("spec", "CARD_NOT_OBJECT", `${iw} is not an object`);
            return;
        }

        if (!hasNonEmptyString(item.title)) {
            warn("content", "CARD_MISSING_TITLE", `${iw} has no title`);
        } else {
            checkDuplicateValue(seenTitles, item.title, "content", "DUPLICATE_CARD_TITLE", `${iw} duplicates card title`);
        }

        // An icon-led nav card is complete with just icon + title + meta —
        // it works as a visual button. Only nag on plain text cards.
        if (!hasNonEmptyString(item.body) && !hasNonEmptyString(item.icon)) {
            warn("content", "CARD_MISSING_BODY", `${iw} has no body`);
        }

        if (hasNonEmptyString(item.image)) {
            fail("spec", "CARD_IMAGE_REMOVED", `${iw} uses "image" — card background photos were removed; use "icon" (monochrome black PNG on transparent) instead`);
        }

        if (block.linked && !item.url) {
            warn("links", "LINKED_CARD_WITHOUT_URL", `${iw} is inside linked cards but has no url`);
        }

        if (item.url) checkUrlValue(item.url, `${iw}.url`, { sectionIds });
    });
}

function checkLinksBlock(block, where, sectionIds) {
    const use = Array.isArray(block.use) ? block.use : [];
    const items = Array.isArray(block.items) ? block.items : [];

    if (block.layout != null && block.layout !== "rows" && block.layout !== "grid") {
        warn("spec", "LINKS_BAD_LAYOUT",
            `${where} (links) has unknown layout "${block.layout}" (expected "rows" | "grid") — the engine falls back to rows`);
    }

    // The engine builds rows from `use` (SSOT refs into business/socials) AND
    // any inline `items`, in that order. Empty only if BOTH are empty.
    if (use.length === 0 && items.length === 0) {
        fail("spec", "LINKS_EMPTY", `${where} (links) has neither "use" refs nor "items"`);
        return;
    }

    // Validate each `use` key resolves to something the engine can render: a
    // contact field on business, or a social entry by icon key. An unresolved
    // ref is silently dropped at runtime, so the row just vanishes.
    if (use.length) {
        const socialKeys = new Set(specSocials.map((s) => s && s.icon).filter(Boolean));
        const resolvable = (key) => {
            if (key === "phone") return hasNonEmptyString(specBusiness.phone);
            if (key === "email") return hasNonEmptyString(specBusiness.email);
            return socialKeys.has(key);
        };
        const seenUse = new Set();
        use.forEach((key, i) => {
            const kw = `${where}.use[${i}]`;
            if (!hasNonEmptyString(key)) {
                fail("spec", "LINK_USE_EMPTY", `${kw} is an empty ref`);
                return;
            }
            if (!resolvable(key)) {
                warn("links", "LINK_USE_UNRESOLVED", `${kw} ref "${key}" matches no business field or social — the engine will drop this row`);
            }
            checkDuplicateValue(seenUse, key, "links", "DUPLICATE_LINK_USE", `${kw} duplicates ref "${key}"`);
        });
    }

    const seenLabels = new Set();
    const seenUrls = new Set();

    items.forEach((item, i) => {
        const iw = `${where}.items[${i}]`;
        if (!item || typeof item !== "object") {
            fail("spec", "LINK_ITEM_NOT_OBJECT", `${iw} is not an object`);
            return;
        }

        if (!hasNonEmptyString(item.label)) {
            warn("links", "LINK_MISSING_LABEL", `${iw} has no label`);
        } else {
            checkDuplicateValue(seenLabels, item.label, "links", "DUPLICATE_LINK_LABEL", `${iw} duplicates link label`);
        }

        if (!hasNonEmptyString(item.handle)) {
            warn("links", "LINK_MISSING_HANDLE", `${iw} has no handle`);
        }

        if (!hasNonEmptyString(item.url)) {
            fail("links", "LINK_MISSING_URL", `${iw} has no url`);
        } else {
            checkDuplicateValue(seenUrls, item.url, "links", "DUPLICATE_LINK_URL", `${iw} duplicates link url`);
            checkUrlValue(item.url, `${iw}.url`, { sectionIds });
            checkLinkHandleConsistency(item, iw);
        }
    });
}

function checkTableBlock(block, where) {
    if (!Array.isArray(block.headings) || block.headings.length === 0) {
        fail("spec", "TABLE_MISSING_HEADINGS", `${where} (table) has no "headings"`);
    }
    if (!Array.isArray(block.rows) || block.rows.length === 0) {
        fail("spec", "TABLE_MISSING_ROWS", `${where} (table) has no "rows"`);
        return;
    }

    const headingCount = Array.isArray(block.headings) ? block.headings.length : 0;
    const seenRows = new Set();

    block.rows.forEach((row, i) => {
        const rw = `${where}.rows[${i}]`;
        if (!Array.isArray(row)) {
            fail("spec", "TABLE_ROW_NOT_ARRAY", `${rw} is not an array`);
            return;
        }

        if (headingCount > 0 && row.length !== headingCount) {
            warn("spec", "TABLE_ROW_WIDTH_MISMATCH", `${rw} has ${row.length} cells, but table has ${headingCount} headings`);
        }

        const rowKey = JSON.stringify(row).toLowerCase();
        if (seenRows.has(rowKey)) {
            warn("content", "DUPLICATE_TABLE_ROW", `${rw} duplicates another row in the same table`);
        }
        seenRows.add(rowKey);

        row.forEach((cell, j) => {
            if (cell == null || String(cell).trim() === "") {
                warn("content", "EMPTY_TABLE_CELL", `${rw}[${j}] is empty`);
            }
        });
    });
}

function checkFaqBlock(block, where) {
    if (!Array.isArray(block.items) || block.items.length === 0) {
        fail("spec", "FAQ_EMPTY", `${where} (faq) has no "items"`);
        return;
    }

    const seenQ = new Set();
    block.items.forEach((it, i) => {
        const iw = `${where}.items[${i}]`;
        if (!hasNonEmptyString(it && it.q)) {
            fail("spec", "FAQ_ITEM_NO_QUESTION", `${iw} (faq) has no "q" (question)`);
        }
        if (!hasNonEmptyString(it && it.a)) {
            fail("spec", "FAQ_ITEM_NO_ANSWER", `${iw} (faq) has no "a" (answer)`);
        } else if (plainTextLength(it.a) < 15) {
            warn("content", "FAQ_ANSWER_TOO_SHORT", `${iw} (faq) answer is very short`);
        }
        if (it && it.q) {
            checkDuplicateValue(seenQ, it.q, "content", "DUPLICATE_FAQ_QUESTION", `${iw} duplicates another question in the same block`);
        }
    });
}

/* Platforms with a dedicated brand icon in engine.js REVIEW_ICONS. Others
   render with the generic star glyph — not an error, just a soft note. */
const REVIEW_PLATFORMS = ["google", "facebook"];

function checkReviewBlock(block, where) {
    if (!Array.isArray(block.items) || block.items.length === 0) {
        fail("spec", "REVIEW_EMPTY", `${where} (review) has no "items"`);
        return;
    }

    const seenUrl = new Set();
    block.items.forEach((it, i) => {
        const iw = `${where}.items[${i}]`;

        if (!hasNonEmptyString(it && it.label)) {
            fail("spec", "REVIEW_ITEM_NO_LABEL", `${iw} (review) has no "label"`);
        }

        if (!hasNonEmptyString(it && it.url)) {
            fail("spec", "REVIEW_ITEM_NO_URL", `${iw} (review) has no "url" — the CTA wouldn't render`);
        } else {
            // Review CTAs point at an external platform; a local/relative URL is
            // almost certainly a mistake here.
            if (!isExternalUrl(it.url)) {
                warn("links", "REVIEW_URL_NOT_EXTERNAL", `${iw} (review) "url" isn't an http(s) link`);
            }
            checkDuplicateValue(seenUrl, it.url, "links", "DUPLICATE_REVIEW_URL", `${iw} duplicates another review URL in the same block`);
        }

        if (hasNonEmptyString(it && it.platform) && !REVIEW_PLATFORMS.includes(it.platform)) {
            warn("content", "REVIEW_UNKNOWN_PLATFORM", `${iw} (review) "platform" "${it.platform}" has no brand icon — renders a generic star`);
        }
    });
}

function checkSlideshowBlock(block, where, section) {
    if (!Array.isArray(block.slides) || block.slides.length === 0) {
        fail("spec", "SLIDESHOW_EMPTY", `${where} (slideshow) has no "slides"`);
        return;
    }

    const seenSrc = new Set();
    block.slides.forEach((slide, i) => {
        const sw = `${where}.slides[${i}]`;
        checkImageLike(slide, sw, {
            kind: "Slide",
            requireText: false,
            sectionId: section && section.id,
        });
        if (slide && slide.src) {
            checkDuplicateValue(seenSrc, slide.src, "assets", "DUPLICATE_SLIDE_SRC", `${sw} duplicates slide image`);
        }
    });
}

function checkMapBlock(block, where) {
    // The engine falls back to business.mapEmbed / mapUrl when the block omits
    // url/embed (SSOT). Only fail if NOTHING — block or business — supplies a
    // source, which is the case the engine renders to nothing.
    const bizEmbed = hasNonEmptyString(specBusiness.mapEmbed);
    const bizUrl = hasNonEmptyString(specBusiness.mapUrl);
    if (!block.url && !block.embed && !bizEmbed && !bizUrl) {
        fail("spec", "MAP_MISSING_URL", `${where} (map) has no "url"/"embed" and business has no mapUrl/mapEmbed to fall back to`);
        return;
    }

    if (block.url) {
        checkUrlValue(block.url, `${where}.url`, { allowRelative: false, allowHash: false, allowMailTel: false });
    }
    if (block.embed) {
        checkUrlValue(block.embed, `${where}.embed`, { allowRelative: false, allowHash: false, allowMailTel: false });
    }
    if (!block.label && !block.address) {
        warn("accessibility", "MAP_MISSING_LABEL", `${where} (map) has no label/address for accessible fallback text`);
    }
}

function checkPhotoBlock(block, where, section) {
    checkImageLike(block, where, {
        kind: "Photo",
        requireText: true,
        sectionId: section && section.id,
    });
}

function checkGalleryBlock(block, where, section) {
    if (!Array.isArray(block.images) || block.images.length === 0) {
        fail("spec", "GALLERY_EMPTY", `${where} (gallery) has no "images"`);
        return;
    }

    if (block.columns != null) {
        const n = Number(block.columns);
        if (!Number.isInteger(n) || n < 1 || n > 6) {
            warn("spec", "GALLERY_COLUMNS_INVALID", `${where} (gallery) columns should be an integer from 1 to 6`);
        }
    }

    if (block.perPage != null) {
        const n = Number(block.perPage);
        if (!Number.isInteger(n) || n < 1) {
            warn("spec", "GALLERY_PERPAGE_INVALID", `${where} (gallery) perPage should be a positive integer`);
        }
    }

    const seenSrc = new Set();
    block.images.forEach((img, i) => {
        const iw = `${where}.images[${i}]`;
        checkImageLike(img, iw, {
            kind: "Gallery image",
            requireText: false,
            sectionId: section && section.id,
        });
        if (img && img.src) {
            checkDuplicateValue(seenSrc, img.src, "assets", "DUPLICATE_GALLERY_SRC", `${iw} duplicates gallery image`);
        }
    });
}

const HOURS_DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function checkHoursBlock(block, where) {
    const hours = (specBusiness && typeof specBusiness.hours === "object") ? specBusiness.hours : null;

    if (!hours) {
        warn("spec", "HOURS_NO_BUSINESS_HOURS",
            `${where} (hours) has nothing to render: business.hours is not defined`);
        return;
    }

    const present = HOURS_DAY_KEYS.filter((k) => hasNonEmptyString(hours[k]));
    if (present.length === 0) {
        warn("spec", "HOURS_EMPTY",
            `${where} (hours) has nothing to render: business.hours defines no weekday values`);
    }

    // Catch typo'd day keys (e.g. "mom", "sut") that the schema's
    // additionalProperties:false would also reject, but flagged here in plain language.
    Object.keys(hours).forEach((k) => {
        if (!HOURS_DAY_KEYS.includes(k)) {
            warn("spec", "HOURS_UNKNOWN_DAY",
                `business.hours has unknown day key "${k}" (expected one of ${HOURS_DAY_KEYS.join(", ")})`);
        }
    });
}

function checkImageLike(node, where, options = {}) {
    const kind = options.kind || "Image";
    if (!node || typeof node !== "object") {
        fail("spec", "IMAGE_NOT_OBJECT", `${where} is not an object`);
        return;
    }

    if (!hasNonEmptyString(node.src)) {
        fail("spec", "IMAGE_MISSING_SRC", `${where} (${kind}) has no src`);
        return;
    }

    if (!hasExtension(node.src, IMAGE_EXT)) {
        warn("assets", "IMAGE_EXTENSION_UNKNOWN", `${where}.src does not look like a supported image file: ${node.src}`);
    }

    const hasDescription = hasNonEmptyString(node.alt) ||
        hasNonEmptyString(node.title) ||
        hasNonEmptyString(node.caption) ||
        hasNonEmptyString(node.text);

    if (!hasDescription) {
        const sectionSuffix = options.sectionId ? ` in section "${options.sectionId}"` : "";
        const severity = options.requireText ? fail : warn;
        severity(
            "accessibility",
            "IMAGE_MISSING_TEXT",
            `${where} (${kind})${sectionSuffix} has src but no alt/title/caption/text`
        );
    }
}

function hasNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}

function plainTextLength(value) {
    return String(value || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().length;
}

function checkDuplicateValue(seen, value, category, code, messagePrefix) {
    const key = String(value || "").trim().toLowerCase();
    if (!key) return;
    if (seen.has(key)) {
        warn(category, code, `${messagePrefix}: "${truncate(value)}"`);
    }
    seen.add(key);
}

function collectSectionIds(spec) {
    const ids = new Set();
    for (const sec of spec.sections || []) {
        if (sec && sec.id) ids.add(String(sec.id));
    }
    return ids;
}

/* ---- Content / placeholders / contact ---------------------------------- */

function checkPlaceholders(spec) {
    walkValues(spec, (val, p) => {
        if (typeof val !== "string") return;
        const low = val.toLowerCase();
        for (const marker of PLACEHOLDER_MARKERS) {
            if (low.includes(marker)) {
                fail("content", "PLACEHOLDER_TEXT", `Placeholder text found at ${p}: "${truncate(val)}" (matched "${marker}")`);
                break;
            }
        }
    });
}

function checkContactData(spec) {
    const emails = new Set();
    const phones = new Set();
    const socialHandles = new Set();
    let icoVal = null;
    let dicVal = null;

    walkValues(spec, (val) => {
        if (typeof val !== "string") return;
        const v = val.trim();
        const low = v.toLowerCase();

        const mail = low.startsWith("mailto:") ? v.slice(7) : v;
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) emails.add(mail.toLowerCase());

        if (low.startsWith("tel:")) {
            phones.add(v);
        } else if (/[+]/.test(v) && /\d[\d\s()+-]{6,}\d/.test(v)) {
            phones.add(v);
        } else if (/^\(?\+?\d[\d\s()-]{8,}\d$/.test(v) && /[\s()-]/.test(v)) {
            phones.add(v);
        }

        if (/^@[a-z0-9_.-]{2,}$/i.test(v)) {
            socialHandles.add(v.toLowerCase());
        }
    });

    findLabeledValues(spec, (label, value) => {
        const l = normalizeDiacritics(label).toLowerCase();
        if (l.includes("ico")) icoVal = value;
        if (l.includes("dic")) dicVal = value;
    });

    if (emails.size === 0) {
        fail("content", "EMAIL_MISSING", "No email address found anywhere in the spec");
    } else {
        for (const e of emails) {
            if (FAKE_EMAILS.includes(e) || /@(example|test)\./.test(e) || /^(.)\1*@/.test(e)) {
                fail("content", "EMAIL_FAKE", `Email looks fake or invalid: ${e}`);
            }
        }
    }

    if (phones.size === 0) {
        fail("content", "PHONE_MISSING", "No phone number found anywhere in the spec");
    } else {
        const seenDigits = new Set();
        for (const ph of phones) {
            const digits = ph.replace(/\D/g, "");
            if (seenDigits.has(digits)) continue;
            seenDigits.add(digits);

            const local = digits.replace(/^(00)?(421|420|1|44|49|33|39|34)/, "");
            if (digits.length < 9) {
                fail("content", "PHONE_TOO_SHORT", `Phone looks too short: ${ph}`);
            } else if (
                /^0+$/.test(digits) ||
                /^0+$/.test(local) ||
                FAKE_PHONE_DIGITS.includes(digits) ||
                FAKE_PHONE_DIGITS.includes(local) ||
                /^(\d)\1+$/.test(digits) ||
                /^123456789/.test(local)
            ) {
                fail("content", "PHONE_FAKE", `Phone looks fake or invalid: ${ph}`);
            }
        }
    }

    for (const handle of socialHandles) {
        if (FAKE_SOCIAL_HANDLES.includes(handle)) {
            fail("content", "SOCIAL_HANDLE_FAKE", `Social handle looks fake: ${handle}`);
        }
    }

    if (icoVal != null) {
        const d = String(icoVal).replace(/\s/g, "");
        if (!/^\d{8}$/.test(d) || /^0+$/.test(d)) {
            fail("content", "ICO_INVALID", `IČO looks fake or invalid: ${icoVal} (expected 8 digits)`);
        }
    }
    if (dicVal != null) {
        const d = String(dicVal).replace(/\s/g, "");
        if (!/^\d{10}$/.test(d) || /^0+$/.test(d)) {
            fail("content", "DIC_INVALID", `DIČ looks fake or invalid: ${dicVal} (expected 10 digits)`);
        }
    }
}

/* Walk table-like rows ([label, value] pairs) and links items
   ({label, handle}) calling cb(label, value) for each pair. */
function findLabeledValues(spec, cb) {
    walkNodes(spec, (node) => {
        if (!node || typeof node !== "object") return;

        if (Array.isArray(node.rows)) {
            for (const row of node.rows) {
                if (Array.isArray(row) && row.length >= 2) {
                    cb(String(row[0]), String(row[1]));
                }
            }
        }

        if (Array.isArray(node.items)) {
            for (const it of node.items) {
                if (it && typeof it === "object" && it.label != null && it.handle != null) {
                    cb(String(it.label), String(it.handle));
                }
            }
        }
    });
}

function normalizeDiacritics(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/* ---- URL/link validation ------------------------------------------------- */

function checkUrlValue(value, where, opts = {}) {
    const allowHash = opts.allowHash !== false;
    const allowRelative = opts.allowRelative !== false;
    const allowMailTel = opts.allowMailTel !== false;
    const sectionIds = opts.sectionIds || new Set();
    const v = String(value || "").trim();

    if (!v) {
        fail("links", "URL_EMPTY", `${where} is empty`);
        return;
    }

    if (/\s/.test(v)) {
        warn("links", "URL_CONTAINS_SPACE", `${where} contains whitespace: ${v}`);
    }

    if (v.startsWith("#")) {
        if (!allowHash) {
            fail("links", "URL_HASH_NOT_ALLOWED", `${where} must not be a hash link: ${v}`);
            return;
        }
        const id = v.slice(1);
        if (!id) {
            fail("links", "URL_EMPTY_HASH", `${where} is an empty hash link`);
        } else if (sectionIds.size > 0 && !sectionIds.has(id)) {
            fail("links", "BROKEN_HASH_LINK", `${where} points to missing section id: ${v}`);
        }
        return;
    }

    if (v.startsWith("mailto:")) {
        if (!allowMailTel) {
            fail("links", "URL_MAILTO_NOT_ALLOWED", `${where} must not be mailto: ${v}`);
            return;
        }
        const email = v.slice(7);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            fail("links", "MAILTO_INVALID", `${where} has invalid mailto: ${v}`);
        }
        return;
    }

    if (v.startsWith("tel:")) {
        if (!allowMailTel) {
            fail("links", "URL_TEL_NOT_ALLOWED", `${where} must not be tel: ${v}`);
            return;
        }
        const digits = v.replace(/\D/g, "");
        if (digits.length < 9) {
            fail("links", "TEL_INVALID", `${where} has invalid tel: ${v}`);
        }
        return;
    }

    if (isExternalUrl(v)) {
        try {
            // URL constructor catches malformed external URLs.
            // eslint-disable-next-line no-new
            new URL(v);
        } catch {
            fail("links", "URL_MALFORMED", `${where} has malformed URL: ${v}`);
        }
        return;
    }

    if (isProtocolUrl(v)) {
        warn("links", "URL_UNKNOWN_PROTOCOL", `${where} uses non-http protocol: ${v}`);
        return;
    }

    if (!allowRelative) {
        fail("links", "URL_RELATIVE_NOT_ALLOWED", `${where} must be an absolute URL: ${v}`);
    }
}

function checkLinkHandleConsistency(item, where) {
    const handle = String(item.handle || "").trim();
    const url = String(item.url || "").trim();
    if (!handle || !url) return;

    if (url.startsWith("mailto:")) {
        const mail = url.slice(7).toLowerCase();
        if (handle.toLowerCase() !== mail) {
            warn("links", "MAILTO_HANDLE_MISMATCH", `${where} handle (${handle}) differs from mailto (${mail})`);
        }
    }

    if (url.startsWith("tel:")) {
        const handleDigits = handle.replace(/\D/g, "");
        const urlDigits = url.replace(/\D/g, "");
        if (handleDigits && urlDigits && handleDigits !== urlDigits) {
            warn("links", "TEL_HANDLE_MISMATCH", `${where} handle (${handle}) differs from tel (${url})`);
        }
    }
}

/* ---- SEO / HTML helpers -------------------------------------------------- */

function checkSeo(html, spec) {
    if (html == null) return;

    if (!htmlTitle(html)) {
        fail("seo", "HTML_TITLE_MISSING", "index.html is missing a non-empty <title>");
    }
    if (!htmlMeta(html, "description")) {
        fail("seo", "HTML_DESCRIPTION_MISSING", "index.html is missing <meta name=\"description\">");
    }
    if (!htmlLinkHref(html, "icon") && !htmlLinkHref(html, "shortcut icon")) {
        fail("seo", "HTML_FAVICON_MISSING", "index.html is missing a favicon link");
    }

    const ogImageInHtml = !!htmlMeta(html, "og:image");
    const ogImageInSpec = !!(spec && spec.meta && spec.meta.ogImage);
    if (!ogImageInHtml && !ogImageInSpec) {
        fail("seo", "OG_IMAGE_MISSING", "Missing og:image (not in index.html and meta.ogImage is unset) — no social-share preview image");
    }

    if (!htmlMeta(html, "og:title")) warn("seo", "OG_TITLE_MISSING", "index.html has no og:title");
    if (!htmlMeta(html, "og:description")) warn("seo", "OG_DESCRIPTION_MISSING", "index.html has no og:description");
    if (!htmlLang(html)) warn("seo", "HTML_LANG_MISSING", "index.html should set <html lang=\"...\">");
    if (!htmlLinkHref(html, "canonical")) warn("seo", "CANONICAL_MISSING", "index.html has no canonical link");
}

/* Parse attributes from a single HTML tag. This is intentionally tiny and
   dependency-free; good enough for static template head tags. */
function parseAttrs(tag) {
    const attrs = {};
    const re = /([a-zA-Z_:.-]+)\s*=\s*(["'])(.*?)\2/g;
    let m;
    while ((m = re.exec(tag)) !== null) {
        attrs[m[1].toLowerCase()] = m[3];
    }
    return attrs;
}

function htmlMeta(html, key) {
    if (!html) return null;
    const tags = html.match(/<meta\b[^>]*>/gi) || [];
    const wanted = String(key).toLowerCase();

    for (const tag of tags) {
        const attrs = parseAttrs(tag);
        if ((attrs.name || "").toLowerCase() === wanted || (attrs.property || "").toLowerCase() === wanted) {
            return attrs.content || null;
        }
    }
    return null;
}

function htmlLinkHref(html, rel) {
    if (!html) return null;
    const tags = html.match(/<link\b[^>]*>/gi) || [];
    const wanted = String(rel).toLowerCase();

    for (const tag of tags) {
        const attrs = parseAttrs(tag);
        const rels = String(attrs.rel || "").toLowerCase().split(/\s+/).filter(Boolean);
        if (rels.includes(wanted) || String(attrs.rel || "").toLowerCase() === wanted) {
            return attrs.href || null;
        }
    }
    return null;
}

function htmlTitle(html) {
    if (!html) return null;
    const m = html.match(/<title>([^<]*)<\/title>/i);
    return m ? m[1].trim() : null;
}

function htmlLang(html) {
    if (!html) return null;
    const m = html.match(/<html\b[^>]*\slang=["']([^"']*)["']/i);
    return m ? m[1] : null;
}

function normUrl(u) {
    if (!u) return "";
    let s = String(u).trim();
    s = s.replace(/\/+$/, "/");
    if (!/\/$/.test(s) && !/\.[a-z0-9]{2,8}$/i.test(s.split("/").pop())) s += "/";
    return s.toLowerCase();
}

function hostOf(u) {
    if (!u) return "";
    try {
        if (/^https?:\/\//i.test(u)) return new URL(u).host.toLowerCase();
    } catch {
        // Fall through to string cleanup.
    }
    return String(u).trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/.*$/, "")
        .toLowerCase();
}

function checkDomainConsistency(spec, html) {
    const domain = spec && spec.meta && spec.meta.domain;
    if (!domain) {
        fail("seo", "DOMAIN_MISSING", "meta.domain is not set in site-spec.json — canonical/og:url/sitemap can't be verified");
        return;
    }

    const low = domain.toLowerCase();
    for (const ph of PLACEHOLDER_DOMAINS) {
        if (low.includes(ph)) {
            fail("seo", "DOMAIN_PLACEHOLDER", `meta.domain still points at a placeholder/template domain: ${domain}`);
            break;
        }
    }
    if (!/^https:\/\//i.test(domain)) {
        warn("seo", "DOMAIN_NOT_HTTPS", `meta.domain should normally be a full HTTPS URL (got "${domain}")`);
    }

    const want = normUrl(domain);
    const wantHost = hostOf(domain);

    if (html) {
        const canonical = htmlLinkHref(html, "canonical");
        if (canonical && normUrl(canonical) !== want) {
            fail("seo", "CANONICAL_DOMAIN_MISMATCH", `index.html canonical (${canonical}) does not match meta.domain (${domain})`);
        }
        const ogUrl = htmlMeta(html, "og:url");
        if (ogUrl && normUrl(ogUrl) !== want) {
            fail("seo", "OG_URL_DOMAIN_MISMATCH", `index.html og:url (${ogUrl}) does not match meta.domain (${domain})`);
        }
    }

    const sitemap = readText("sitemap.xml");
    if (sitemap != null) {
        const locs = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => m[1]);
        if (locs.length === 0) {
            fail("seo", "SITEMAP_EMPTY", "sitemap.xml has no <loc> entries");
        } else if (!locs.some((l) => normUrl(l) === want)) {
            fail("seo", "SITEMAP_DOMAIN_MISMATCH", `sitemap.xml <loc> (${locs[0]}) does not match meta.domain (${domain})`);
        }
        for (const l of locs) {
            const lh = l.toLowerCase();
            if (PLACEHOLDER_DOMAINS.some((ph) => lh.includes(ph))) {
                fail("seo", "SITEMAP_PLACEHOLDER", `sitemap.xml still references a placeholder domain: ${l}`);
            }
        }
    }

    const robots = readText("robots.txt");
    if (robots != null) {
        const m = robots.match(/^\s*Sitemap:\s*(\S+)/im);
        if (!m) {
            warn("seo", "ROBOTS_SITEMAP_MISSING", "robots.txt has no Sitemap: line");
        } else {
            const sitemapUrl = m[1];
            if (hostOf(sitemapUrl) !== wantHost) {
                fail("seo", "ROBOTS_SITEMAP_HOST_MISMATCH", `robots.txt Sitemap host (${sitemapUrl}) does not match meta.domain host (${wantHost})`);
            }
            const sl = sitemapUrl.toLowerCase();
            if (PLACEHOLDER_DOMAINS.some((ph) => sl.includes(ph))) {
                fail("seo", "ROBOTS_PLACEHOLDER", `robots.txt Sitemap line still references a placeholder domain: ${sitemapUrl}`);
            }
        }
    }

    const cname = readText("CNAME");
    if (cname != null) {
        const cn = cname.trim().split(/\s+/)[0];
        if (cn && cn.toLowerCase() !== wantHost) {
            warn("seo", "CNAME_DOMAIN_MISMATCH", `CNAME (${cn}) does not match meta.domain host (${wantHost}) — intended if you redirect www↔apex, otherwise a mismatch`);
        }
    }
}

function checkMetadataConsistency(spec, html, manifestRes) {
    const meta = (spec && spec.meta) || {};
    if (!html) return;

    const pairs = [
        ["title", htmlTitle(html), meta.title],
        ["meta description", htmlMeta(html, "description"), meta.description],
        ["meta author", htmlMeta(html, "author"), meta.author],
        ["og:title", htmlMeta(html, "og:title"), meta.title],
        ["og:description", htmlMeta(html, "og:description"), meta.ogDescription || meta.description],
        ["og:type", htmlMeta(html, "og:type"), meta.ogType],
        ["twitter:card", htmlMeta(html, "twitter:card"), meta.twitterCard],
        ["theme-color", htmlMeta(html, "theme-color"), meta.themeColor],
    ];

    for (const [name, inHtml, inMeta] of pairs) {
        if (inMeta != null && inHtml != null && inHtml.trim() !== String(inMeta).trim()) {
            warn("seo", "HTML_META_STALE", `index.html ${name} fallback ("${truncate(inHtml)}") differs from meta ("${truncate(inMeta)}") — crawlers see the stale fallback`);
        }
    }

    const lang = htmlLang(html);
    if (meta.lang && lang && lang.toLowerCase() !== String(meta.lang).toLowerCase()) {
        warn("seo", "HTML_LANG_STALE", `index.html <html lang="${lang}"> differs from meta.lang ("${meta.lang}")`);
    }

    if (manifestRes && manifestRes.ok && meta.themeColor) {
        const m = manifestRes.data;
        if (m.theme_color && m.theme_color.toLowerCase() !== String(meta.themeColor).toLowerCase()) {
            warn("seo", "MANIFEST_THEME_COLOR_MISMATCH", `manifest theme_color (${m.theme_color}) differs from meta.themeColor (${meta.themeColor})`);
        }
    }
}

/* ---- Manifest / assets --------------------------------------------------- */

function checkManifest(manifestRes, referenced) {
    if (manifestRes.error === "missing") return;
    if (!manifestRes.ok) {
        fail("manifest", "MANIFEST_JSON_INVALID", `site.webmanifest is not valid JSON: ${manifestRes.error}`);
        return;
    }

    const m = manifestRes.data;
    if (!m.name) fail("manifest", "MANIFEST_NAME_MISSING", "Manifest has no " + JSON.stringify("name"));
    if (!m.short_name) warn("manifest", "MANIFEST_SHORT_NAME_MISSING", "Manifest has no short_name");
    if (!m.theme_color) warn("manifest", "MANIFEST_THEME_COLOR_MISSING", "Manifest has no theme_color");
    if (!m.background_color) warn("manifest", "MANIFEST_BACKGROUND_COLOR_MISSING", "Manifest has no background_color");

    if (m.start_url && !String(m.start_url).startsWith(".") && !String(m.start_url).startsWith("/")) {
        warn("manifest", "MANIFEST_START_URL_ODD", `Manifest start_url looks unusual: ${m.start_url}`);
    }

    if (!Array.isArray(m.icons) || m.icons.length === 0) {
        fail("manifest", "MANIFEST_ICONS_MISSING", "Manifest has no icons");
        return;
    }

    m.icons.forEach((icon, i) => {
        const src = icon && icon.src;
        if (!src) {
            fail("manifest", "MANIFEST_ICON_SRC_MISSING", `Manifest icon[${i}] has no "src"`);
            return;
        }

        const literal = normalizeRef(src);
        const inAssets = path.posix.join("assets", path.posix.basename(literal));
        const literalExists = fileExists(literal);
        const assetsExists = fileExists(inAssets);

        if (!literalExists && !assetsExists) {
            fail("manifest", "MANIFEST_ICON_MISSING", `Manifest icon path does not exist: ${src}`);
        } else if (!literalExists && assetsExists) {
            fail("manifest", "MANIFEST_ICON_WRONG_PATH", `Manifest icon path does not exist as written: ${src} (file is at ${inAssets} — fix the src to point there)`);
        }

        if (!icon.sizes) warn("manifest", "MANIFEST_ICON_SIZES_MISSING", `Manifest icon[${i}] has no sizes`);
        if (!icon.type) warn("manifest", "MANIFEST_ICON_TYPE_MISSING", `Manifest icon[${i}] has no type`);

        referenced.add(literal);
        referenced.add(inAssets);
    });
}

function checkAssets(spec, html, referenced) {
    const specRefs = collectAssetRefs(spec);
    for (const { ref, path: jp } of specRefs) {
        const norm = normalizeRef(ref);
        if (!fileExists(norm)) {
            fail("assets", "ASSET_MISSING", `Referenced asset does not exist: ${ref} (at ${jp})`);
        }
        referenced.add(norm);
    }

    if (html) {
        const tags = html.match(/<(?:link|script|img|source)\b[^>]*>/gi) || [];
        for (const tag of tags) {
            const attrs = parseAttrs(tag);
            for (const attrName of ["href", "src", "srcset"]) {
                const val = attrs[attrName];
                if (!val) continue;
                for (const ref of splitPossibleSrcset(val)) {
                    // Protocol-relative URLs (//host/path) are remote, not local
                    // assets — skip them so e.g. //gc.zgo.at/count.js isn't
                    // mistaken for a missing repo file.
                    if (ref.startsWith("//")) continue;
                    if (!isLocalReference(ref) && !ref.startsWith("/")) continue;
                    const clean = normalizeRef(ref);
                    if (!hasExtension(clean, LOCAL_ASSET_EXT)) continue;
                    if (!fileExists(clean)) fail("assets", "HTML_ASSET_MISSING", `index.html references missing asset: ${ref}`);
                    referenced.add(clean);
                }
            }
        }
    }

    checkAssetSizes();

    if (!OPTS.noUnusedAssets) {
        const onDisk = walkDir("assets");
        for (const f of onDisk) {
            if (shouldIgnoreUnusedAsset(f)) continue;
            if (!referenced.has(f)) {
                warn("assets", "UNUSED_ASSET", `Unused asset: ${f}`);
            }
        }
    }
}

function splitPossibleSrcset(value) {
    return String(value || "")
        .split(",")
        .map((part) => part.trim().split(/\s+/)[0])
        .filter(Boolean);
}

function shouldIgnoreUnusedAsset(rel) {
    const file = path.posix.basename(rel).toLowerCase();
    return file === "favicon.ico" ||
        file.startsWith("favicon-") ||
        file === "apple-touch-icon.png" ||
        rel.includes("/.") ||
        rel.startsWith("animation/");
}

function checkAssetSizes() {
    const candidates = [
        ...walkDir("assets"),
        ...walkDir("animation"),
        ...walkRootFilesByExt([...CSS_EXT, ...JS_EXT]),
    ];

    const seen = new Set();
    for (const f of candidates) {
        if (seen.has(f)) continue;
        seen.add(f);

        const size = fileSizeBytes(f);
        if (size == null) continue;

        const ext = path.extname(f).toLowerCase();
        if (IMAGE_EXT.includes(ext) && size > OPTS.maxImageKb * 1024) {
            warn("performance", "IMAGE_TOO_LARGE", `${f} is ${formatKb(size)} — consider compressing/resizing it`);
        }
        if (CSS_EXT.includes(ext) && size > OPTS.maxCssKb * 1024) {
            warn("performance", "CSS_TOO_LARGE", `${f} is ${formatKb(size)} — big for a tiny static site`);
        }
        if (JS_EXT.includes(ext) && size > OPTS.maxJsKb * 1024) {
            warn("performance", "JS_TOO_LARGE", `${f} is ${formatKb(size)} — big for a tiny static site`);
        }
    }
}

function walkRootFilesByExt(exts) {
    let entries;
    try {
        entries = fs.readdirSync(ROOT, { withFileTypes: true });
    } catch {
        return [];
    }

    return entries
        .filter((ent) => ent.isFile())
        .map((ent) => ent.name)
        .filter((name) => hasExtension(name, exts));
}

function formatKb(bytes) {
    return `${Math.round(bytes / 1024)} KB`;
}

/* ---- Accessibility/content quality -------------------------------------- */

function checkImageAlt(spec) {
    for (const sec of spec.sections || []) {
        for (const block of sec.blocks || []) {
            if (!block || typeof block !== "object") continue;

            if (block.type === "slideshow" && Array.isArray(block.slides)) {
                block.slides.forEach((s, i) => {
                    if (s && s.src && !s.title && !s.caption && !s.text && !s.alt) {
                        warn("accessibility", "SLIDE_MISSING_TEXT", `Slide ${i} in section "${sec.id}" has no title/caption/alt — image may get weak fallback alt text`);
                    }
                });
            }

            if (block.type === "photo" && block.src && !block.title && !block.caption && !block.text && !block.alt) {
                fail("accessibility", "PHOTO_MISSING_TEXT", `Photo in section "${sec.id}" has no title/caption/alt/text`);
            }

            if (block.type === "gallery" && Array.isArray(block.images)) {
                block.images.forEach((img, i) => {
                    if (img && img.src && !img.title && !img.caption && !img.text && !img.alt) {
                        fail("accessibility", "GALLERY_IMAGE_MISSING_TEXT", `Gallery image ${i} in section "${sec.id}" has no title/caption/alt/text`);
                    }
                });
            }
        }
    }
}

function checkContentQuality(spec) {
    const hasContactishSection = (spec.sections || []).some((sec) => {
        const blob = `${sec.id || ""} ${sec.label || ""} ${sec.title || ""}`.toLowerCase();
        return blob.includes("kontakt") || blob.includes("contact");
    });

    if (!hasContactishSection) {
        warn("content", "CONTACT_SECTION_MISSING", "No contact/kontakt section found");
    }

    for (const sec of spec.sections || []) {
        const idl = normalizeDiacritics(sec.id || "").toLowerCase();
        const label = normalizeDiacritics(sec.label || "").toLowerCase();
        const blob = JSON.stringify(sec).toLowerCase();

        if (idl.includes("cennik") || label.includes("cennik") || idl.includes("pricing") || label.includes("pricing")) {
            const hasPrice = /€|eur|\bod \d|dohodou|cena|price/.test(blob);
            if (!hasPrice) {
                warn("content", "PRICING_WITHOUT_PRICES", `Pricing section "${sec.id}" does not appear to contain prices`);
            }
        }

        for (const block of sec.blocks || []) {
            if (!block || typeof block !== "object") continue;

            if (block.type === "table" && hasNonEmptyString(block.blurb) && block.blurb.length > 240) {
                warn("content", "TABLE_BLURB_LONG", `Table "${block.name || sec.id}" has a long blurb; it may be noisy on mobile`);
            }

            if (block.type === "cards" && Array.isArray(block.items) && block.items.length > 6) {
                warn("content", "CARDS_TOO_MANY", `Cards block in section "${sec.id}" has ${block.items.length} cards — maybe split it`);
            }
        }
    }
}

/* ---- Block-type registry consistency ------------------------------------ */

/* Drift guard. The set of supported block types is stated in three independent
   places that must agree, or sites break in confusing ways:
     1. engine.js   BLOCK_RENDERERS         — what actually renders
     2. launch-check.js KNOWN_BLOCK_TYPES   — what this validator accepts
     3. site-spec.schema.json  block type enum — what the editor allows
   When they disagree, a block can render but fail validation (or validate but
   not render, or be flagged invalid in the IDE). This check parses the other
   two sources and fails loudly on any mismatch, so adding a block type without
   updating all three is caught here instead of in production.

   It reads source text rather than importing: engine.js is an ES module (can't
   be require()d here), and parsing the few lines we need is robust enough. */
function checkBlockTypeRegistryConsistency() {
    const known = new Set(KNOWN_BLOCK_TYPES);

    // --- engine.js BLOCK_RENDERERS keys ---
    const engineSrc = readText("engine.js");
    if (engineSrc) {
        const m = engineSrc.match(/const BLOCK_RENDERERS\s*=\s*\{([\s\S]*?)\};/);
        if (!m) {
            warn("spec", "ENGINE_RENDERERS_UNREADABLE",
                "Could not locate BLOCK_RENDERERS in engine.js to cross-check block types");
        } else {
            const engineTypes = new Set(
                [...m[1].matchAll(/^\s*([A-Za-z_]\w*)\s*:/gm)].map((x) => x[1])
            );
            diffBlockSets("engine.js BLOCK_RENDERERS", engineTypes, known);
        }
    }

    // --- schema type enum ---
    const schemaRes = readJson("site-spec.schema.json");
    if (schemaRes.ok) {
        const enumArr =
            schemaRes.data &&
            schemaRes.data.$defs &&
            schemaRes.data.$defs.block &&
            schemaRes.data.$defs.block.properties &&
            schemaRes.data.$defs.block.properties.type &&
            schemaRes.data.$defs.block.properties.type.enum;
        if (!Array.isArray(enumArr)) {
            warn("spec", "SCHEMA_BLOCK_ENUM_MISSING",
                "Could not locate $defs.block.properties.type.enum in site-spec.schema.json");
        } else {
            diffBlockSets("site-spec.schema.json type enum", new Set(enumArr), known);
        }
    }
}

/* Report the two-way difference between a source's block-type set and the
   validator's KNOWN_BLOCK_TYPES, as hard errors (this is exactly the drift the
   check exists to stop). */
function diffBlockSets(sourceLabel, sourceSet, known) {
    const missingFromKnown = [...sourceSet].filter((t) => !known.has(t));
    const missingFromSource = [...known].filter((t) => !sourceSet.has(t));

    missingFromKnown.forEach((t) => {
        fail("spec", "BLOCK_TYPE_DRIFT",
            `Block type "${t}" is in ${sourceLabel} but not in launch-check.js KNOWN_BLOCK_TYPES — add it to BLOCK_RULES`);
    });
    missingFromSource.forEach((t) => {
        fail("spec", "BLOCK_TYPE_DRIFT",
            `Block type "${t}" is in launch-check.js but not in ${sourceLabel} — the three sources must agree`);
    });
}

/* ---- Output -------------------------------------------------------------- */

function truncate(s, n = 80) {
    s = String(s).replace(/\s+/g, " ").trim();
    return s.length > n ? s.slice(0, n) + "…" : s;
}

function groupByCategory(list) {
    const map = new Map();
    for (const item of list) {
        const category = item.category;
        if (!map.has(category)) map.set(category, []);
        map.get(category).push(item);
    }
    return map;
}

function printGroup(title, list) {
    if (!list.length) return;
    console.log(`\n${title}:\n`);
    const grouped = groupByCategory(list);
    for (const [cat, items] of grouped) {
        console.log(`[${cat}]`);
        for (const item of items) {
            console.log(`- ${item.code}: ${item.message}`);
        }
        console.log("");
    }
}

function hasBlockingProblems() {
    return errors.length > 0 || (OPTS.strict && warnings.length > 0);
}

function printReport() {
    const strictSuffix = OPTS.strict ? " (--strict)" : "";

    if (errors.length === 0 && warnings.length === 0) {
        console.log(`PASS${strictSuffix}\n\nNo launch problems found.`);
        return;
    }

    console.log(hasBlockingProblems() ? `FAIL${strictSuffix}` : `PASS${strictSuffix}`);
    printGroup("Errors", errors);
    printGroup("Warnings", warnings);
}

function printReportJson() {
    const blocking = hasBlockingProblems();
    const report = {
        status: blocking ? "fail" : "pass",
        ok: !blocking,
        strict: OPTS.strict,
        root: ROOT,
        siteSpec: SPEC_FILE,
        checkedAt: new Date().toISOString(),
        counts: {
            errors: errors.length,
            warnings: warnings.length,
            blocking: errors.length + (OPTS.strict ? warnings.length : 0),
        },
        errors,
        warnings,
    };
    console.log(JSON.stringify(report, null, 2));
}

function report() {
    if (OPTS.json) printReportJson();
    else printReport();
}

/* ---- Main ---------------------------------------------------------------- */

function main() {
    checkRequiredFiles();

    const specRes = readJson(SPEC_FILE);
    if (specRes.error === "missing") {
        report();
        process.exit(hasBlockingProblems() ? 1 : 0);
    }
    if (!specRes.ok) {
        fail("spec", "SPEC_JSON_INVALID", `${SPEC_FILE} is not valid JSON: ${specRes.error}`);
        report();
        process.exit(1);
    }

    const spec = specRes.data;
    const html = readText("index.html");
    const manifestRes = readJson("site.webmanifest");

    const referenced = new Set();
    [
        "assets/favicon.ico",
        "assets/favicon-96x96.png",
        "assets/apple-touch-icon.png",
        SPEC_FILE,
        "site.webmanifest",
        "robots.txt",
        "sitemap.xml",
        "styles.css",
        "engine.js",
        "script.js",
    ].forEach((f) => referenced.add(f));

    checkSpecShape(spec);
    checkBlockTypeRegistryConsistency();
    checkPlaceholders(spec);
    checkContactData(spec);
    checkSeo(html, spec);
    checkDomainConsistency(spec, html);
    checkMetadataConsistency(spec, html, manifestRes);
    checkManifest(manifestRes, referenced);
    checkAssets(spec, html, referenced);
    checkImageAlt(spec);
    checkContentQuality(spec);

    report();
    process.exit(hasBlockingProblems() ? 1 : 0);
}

main();

/* Built from m-remis/static-web-template */