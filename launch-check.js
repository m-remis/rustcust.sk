#!/usr/bin/env node
/* =========================================================
   launch-check.js — static-site launch preflight

   A dev-only tool. NOT loaded by the page. Run by hand before
   shipping a client site:

       node launch-check.js

   It inspects the current folder and validates the things that
   silently ship wrong: placeholder text, fake contact data,
   broken/missing/unused assets, weak SEO metadata, malformed
   site-spec.json, broken manifest icon paths.

   Errors  -> printed under "Errors", exit code 1 (blocks launch).
   Warnings-> printed under "Warnings", exit code 0 (won't block).

   Zero npm dependencies. CommonJS. Node built-ins only.

   Built from m-remis/static-web-template
   ========================================================= */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

/* CLI flags. v0 default is human-readable output; --json emits a machine-
   readable report for CI/tooling. --help prints usage. */
const ARGV = process.argv.slice(2);
const OPTS = {
    json: ARGV.includes("--json"),
    help: ARGV.includes("--help") || ARGV.includes("-h"),
};

if (OPTS.help) {
    console.log(`launch-check.js — static-site launch preflight

Usage:
  node launch-check.js [options]

Options:
  --json    Emit a machine-readable JSON report instead of text.
  -h,--help Show this help.

Exit codes:
  0  pass (no blocking errors)
  1  fail (blocking errors found)`);
    process.exit(0);
}

/* The block types the engine actually knows (BLOCK_RENDERERS in engine.js).
   An unknown type renders to nothing, so flag it here before it ships. */
const KNOWN_BLOCK_TYPES = [
    "hero", "text", "cards", "links", "map", "slideshow", "table",
];

/* Image extensions we treat as asset references when found in strings. */
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif", ".ico", ".avif"];

/* Placeholder / filler markers. Case-insensitive substring match against every
   string in the spec. Kept deliberately specific to avoid false hits on real
   Slovak/English copy. */
const PLACEHOLDER_MARKERS = [
    "lorem", "ipsum", "bla bla", "nejaky", "nejaký", "doplnit", "doplniť",
    "sem vlož", "tbd", "fixme", "todo", "placeholder", "dummy",
    "your company", "your name", "your email", "example text", "sample text",
];

/* Obviously-fake contact values. */
const FAKE_EMAILS = [
    "r@r.sk", "test@test.sk", "demo@example.com", "info@example.com",
    "your@email.com", "name@example.com", "email@example.com",
];
const FAKE_PHONE_DIGITS = ["000000000", "123456789", "1234567890"];

/* ---- Collected results --------------------------------------------------- */

const errors = [];   // [{ category, message }]
const warnings = [];

function fail(category, message) {
    errors.push({ category, message });
}
function warn(category, message) {
    warnings.push({ category, message });
}

/* ---- Small fs helpers ---------------------------------------------------- */

function fileExists(rel) {
    try {
        return fs.existsSync(path.join(ROOT, rel));
    } catch {
        return false;
    }
}

function readText(rel) {
    try {
        return fs.readFileSync(path.join(ROOT, rel), "utf8");
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
   with forward slashes. Skips nothing — caller decides what's unused. */
function walkDir(rel) {
    const out = [];
    const abs = path.join(ROOT, rel);
    let entries;
    try {
        entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
        return out;
    }
    for (const ent of entries) {
        const childRel = path.posix.join(rel, ent.name);
        if (ent.isDirectory()) {
            out.push(...walkDir(childRel));
        } else if (ent.isFile()) {
            out.push(childRel);
        }
    }
    return out;
}

/* Normalize an asset reference to a repo-relative path we can existence-check.
   Handles the manifest convention of root-absolute "/foo.png" by trying both
   the literal path and an assets/-relative interpretation. */
function normalizeRef(ref) {
    if (!ref) return ref;
    let r = ref.trim().replace(/^\.\//, "");
    // strip query/hash
    r = r.split(/[?#]/)[0];
    return r;
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

/* Collect every string that looks like an image asset reference, anywhere in
   the spec. Returns array of { ref, path }. */
function collectAssetRefs(node) {
    const refs = [];
    walkValues(node, (val, p) => {
        if (typeof val !== "string") return;
        const low = val.toLowerCase();
        if (!low.startsWith("assets/") && !low.startsWith("/")) return;
        if (!IMAGE_EXT.some((ext) => low.endsWith(ext))) return;
        refs.push({ ref: val, path: p });
    });
    return refs;
}

/* ---- Checks -------------------------------------------------------------- */

function checkRequiredFiles() {
    const required = [
        "index.html", "styles.css", "site-spec.json",
        "site.webmanifest", "robots.txt", "sitemap.xml",
    ];
    for (const f of required) {
        if (!fileExists(f)) fail("missing", `Missing required file: ${f}`);
    }
    if (!fileExists("script.js") && !fileExists("engine.js")) {
        fail("missing", "Missing runtime script: expected script.js or engine.js");
    }
}

function checkSpecShape(spec) {
    if (!spec || typeof spec !== "object") {
        fail("spec", "site-spec.json is not an object");
        return;
    }
    const sections = spec.sections;
    if (!Array.isArray(sections)) {
        fail("spec", "site-spec.json: \"sections\" must be an array");
        return;
    }
    if (sections.length === 0) {
        fail("spec", "site-spec.json: \"sections\" is empty");
        return;
    }

    const seenIds = new Set();
    sections.forEach((sec, i) => {
        const where = `$.sections[${i}]`;
        if (!sec || typeof sec !== "object") {
            fail("spec", `${where} is not an object`);
            return;
        }
        if (!sec.id) {
            fail("spec", `${where} is missing "id"`);
        } else {
            if (seenIds.has(sec.id)) {
                fail("spec", `Duplicate section id: ${sec.id}`);
            }
            seenIds.add(sec.id);
        }
        if (!sec.label) {
            warn("spec", `${where} (id=${sec.id || "?"}) is missing "label" — the nav tab will be blank`);
        }
        // NOTE: type lives on BLOCKS, not sections. A section has blocks[].
        if (!Array.isArray(sec.blocks) || sec.blocks.length === 0) {
            warn("spec", `${where} (id=${sec.id || "?"}) has no blocks — the tab will render empty`);
            return;
        }
        sec.blocks.forEach((block, j) => {
            const bwhere = `${where}.blocks[${j}]`;
            if (!block || typeof block !== "object" || !block.type) {
                fail("spec", `${bwhere} is missing "type"`);
                return;
            }
            if (!KNOWN_BLOCK_TYPES.includes(block.type)) {
                fail("spec", `${bwhere} has unknown block type "${block.type}" (engine will skip it). Known: ${KNOWN_BLOCK_TYPES.join(", ")}`);
            }
            checkBlockRequiredFields(block, bwhere);
        });
    });
}

/* Per-type required fields. Mirrors what each builder needs to render anything;
   a builder returns null on bad input, so these would silently vanish. */
function checkBlockRequiredFields(block, where) {
    switch (block.type) {
        case "cards":
            if (!Array.isArray(block.items) || block.items.length === 0) {
                fail("spec", `${where} (cards) has no "items"`);
            }
            break;
        case "links":
            if (!Array.isArray(block.items) || block.items.length === 0) {
                fail("spec", `${where} (links) has no "items"`);
            }
            break;
        case "table":
            if (!Array.isArray(block.headings) || block.headings.length === 0) {
                fail("spec", `${where} (table) has no "headings"`);
            }
            if (!Array.isArray(block.rows) || block.rows.length === 0) {
                fail("spec", `${where} (table) has no "rows"`);
            }
            break;
        case "slideshow":
            if (!Array.isArray(block.slides) || block.slides.length === 0) {
                fail("spec", `${where} (slideshow) has no "slides"`);
            }
            break;
        case "map":
            if (!block.url && !block.embed) {
                fail("spec", `${where} (map) has neither "url" nor "embed"`);
            }
            break;
        case "hero":
            if (!block.title) {
                warn("spec", `${where} (hero) has no "title"`);
            }
            break;
        case "text":
            if (!block.text) {
                warn("spec", `${where} (text) has no "text"`);
            }
            break;
        default:
            break;
    }
}

function checkPlaceholders(spec) {
    walkValues(spec, (val, p) => {
        if (typeof val !== "string") return;
        const low = val.toLowerCase();
        for (const marker of PLACEHOLDER_MARKERS) {
            if (low.includes(marker)) {
                fail("content", `Placeholder text found at ${p}: "${truncate(val)}" (matched "${marker}")`);
                break; // one hit per string is enough
            }
        }
    });
}

function checkContactData(spec) {
    // Gather candidate values by scanning the whole spec. Contact data lives in
    // different shapes: a "links" block (handle/url) and a "Firemné údaje"
    // table (rows). So scan recursively rather than assuming named fields.
    const emails = new Set();
    const phones = new Set();
    let icoVal = null;
    let dicVal = null;

    walkValues(spec, (val, p) => {
        if (typeof val !== "string") return;
        const v = val.trim();
        const low = v.toLowerCase();

        // emails: mailto: links and bare addresses
        const mail = low.startsWith("mailto:") ? v.slice(7) : v;
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) emails.add(mail.toLowerCase());

        // phones: tel: links, or numbers with phone-like formatting (+, spaces,
        // dashes, parens). A bare run of digits is NOT assumed to be a phone —
        // it could be IČO/DIČ, a price, a year, etc.
        if (low.startsWith("tel:")) {
            phones.add(v);
        } else if (/[+]/.test(v) && /\d[\d\s()+-]{6,}\d/.test(v)) {
            phones.add(v);
        } else if (/^\(?\+?\d[\d\s()-]{8,}\d$/.test(v) && /[\s()-]/.test(v)) {
            phones.add(v);
        }
    });

    // IČO / DIČ commonly live in a key/value table; find rows whose label cell
    // looks like ICO/DIC and read the adjacent value cell.
    findLabeledValues(spec, (label, value) => {
        const l = label.toLowerCase();
        if (l.includes("ičo") || l === "ico" || l.includes("ico")) icoVal = value;
        if (l.includes("dič") || l === "dic" || l.includes("dic")) dicVal = value;
    });

    // ---- Email ----
    if (emails.size === 0) {
        fail("content", "No email address found anywhere in the spec");
    } else {
        for (const e of emails) {
            if (FAKE_EMAILS.includes(e) || /@(example|test)\./.test(e) || /^(.)\1*@/.test(e)) {
                fail("content", `Email looks fake or invalid: ${e}`);
            }
        }
    }

    // ---- Phone ----
    if (phones.size === 0) {
        fail("content", "No phone number found anywhere in the spec");
    } else {
        const seenDigits = new Set();
        for (const ph of phones) {
            const digits = ph.replace(/\D/g, "");
            if (seenDigits.has(digits)) continue; // same number, different form
            seenDigits.add(digits);
            // Strip a leading country code (e.g. 421, 1) before judging the
            // subscriber part, so "+421 000 000 00" is caught as all-zeros.
            const local = digits.replace(/^(00)?(421|420|1|44|49|33|39|34)/, "");
            if (digits.length < 9) {
                fail("content", `Phone looks too short: ${ph}`);
            } else if (
                /^0+$/.test(digits) ||
                /^0+$/.test(local) ||              // all-zero subscriber number
                FAKE_PHONE_DIGITS.includes(digits) ||
                /^(\d)\1+$/.test(digits) ||        // all same digit
                /^123456789/.test(local)           // sequential dummy
            ) {
                fail("content", `Phone looks fake or invalid: ${ph}`);
            }
        }
    }

    // ---- IČO / DIČ (Slovak) — only validate if present ----
    if (icoVal != null) {
        const d = String(icoVal).replace(/\s/g, "");
        if (!/^\d{8}$/.test(d) || /^0+$/.test(d)) {
            fail("content", `IČO looks fake or invalid: ${icoVal} (expected 8 digits)`);
        }
    }
    if (dicVal != null) {
        const d = String(dicVal).replace(/\s/g, "");
        if (!/^\d{10}$/.test(d) || /^0+$/.test(d)) {
            fail("content", `DIČ looks fake or invalid: ${dicVal} (expected 10 digits)`);
        }
    }
}

/* Walk table-like rows ([label, value] pairs) and links items
   ({label, handle}) calling cb(label, value) for each pair. */
function findLabeledValues(spec, cb) {
    walkValues2(spec, (node) => {
        if (!node || typeof node !== "object") return;
        // table rows: array of [label, value, ...]
        if (Array.isArray(node.rows)) {
            for (const row of node.rows) {
                if (Array.isArray(row) && row.length >= 2) {
                    cb(String(row[0]), String(row[1]));
                }
            }
        }
        // links items: { label, handle }
        if (Array.isArray(node.items)) {
            for (const it of node.items) {
                if (it && typeof it === "object" && it.label != null && it.handle != null) {
                    cb(String(it.label), String(it.handle));
                }
            }
        }
    });
}

/* Like walkValues but visits objects/arrays (not just primitives). */
function walkValues2(node, cb) {
    cb(node);
    if (Array.isArray(node)) {
        node.forEach((v) => walkValues2(v, cb));
    } else if (node && typeof node === "object") {
        for (const v of Object.values(node)) walkValues2(v, cb);
    }
}

function checkSeo(html, spec) {
    if (html == null) return; // missing-file already reported
    const has = (re) => re.test(html);

    if (!has(/<title>[^<]*\S[^<]*<\/title>/i)) {
        fail("seo", "index.html is missing a non-empty <title>");
    }
    if (!has(/<meta\s+name=["']description["']/i)) {
        fail("seo", "index.html is missing <meta name=\"description\">");
    }
    if (!has(/<link\s+rel=["']icon["']/i) && !has(/<link\s+rel=["']shortcut icon["']/i)) {
        fail("seo", "index.html is missing a favicon link");
    }

    // og:image is emitted by the engine only if meta.ogImage is set, AND should
    // exist as a static fallback in index.html. Flag if neither is present.
    const ogImageInHtml = has(/property=["']og:image["']/i);
    const ogImageInSpec = !!(spec && spec.meta && spec.meta.ogImage);
    if (!ogImageInHtml && !ogImageInSpec) {
        fail("seo", "Missing og:image (not in index.html and meta.ogImage is unset) — no social-share preview image");
    }

    // Warnings
    if (!has(/property=["']og:title["']/i)) warn("seo", "index.html has no og:title");
    if (!has(/property=["']og:description["']/i)) warn("seo", "index.html has no og:description");
    if (!has(/<html[^>]*\slang=/i)) warn("seo", "index.html should set <html lang=\"...\">");
    if (!has(/<link\s+rel=["']canonical["']/i)) warn("seo", "index.html has no canonical link");
}

/* ---- HTML scraping helpers (regex, no parser dependency) ----------------- */

/* Value of <meta name="X" content="..."> or <meta property="X" content="...">. */
function htmlMeta(html, key) {
    if (!html) return null;
    const re = new RegExp(
        `<meta\\s+(?:name|property)=["']${escapeRe(key)}["']\\s+content=["']([^"']*)["']`,
        "i"
    );
    const m = html.match(re);
    return m ? m[1] : null;
}

/* href of <link rel="X" href="..."> (rel/href in either order). */
function htmlLinkHref(html, rel) {
    if (!html) return null;
    const re1 = new RegExp(`<link\\s+rel=["']${escapeRe(rel)}["']\\s+href=["']([^"']*)["']`, "i");
    const re2 = new RegExp(`<link\\s+href=["']([^"']*)["']\\s+rel=["']${escapeRe(rel)}["']`, "i");
    const m = html.match(re1) || html.match(re2);
    return m ? m[1] : null;
}

function htmlTitle(html) {
    if (!html) return null;
    const m = html.match(/<title>([^<]*)<\/title>/i);
    return m ? m[1].trim() : null;
}

function htmlLang(html) {
    if (!html) return null;
    const m = html.match(/<html[^>]*\slang=["']([^"']*)["']/i);
    return m ? m[1] : null;
}

function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Normalize a URL for comparison: lowercase host, collapse to scheme://host/path
   with a single trailing slash, ignore trailing-slash differences. */
function normUrl(u) {
    if (!u) return "";
    let s = String(u).trim();
    // strip a trailing path file like /sitemap.xml is NOT done here — caller
    // decides what to compare. Just normalize trailing slash + case of host.
    s = s.replace(/\/+$/, "/");          // collapse multiple trailing slashes
    if (!/\/$/.test(s) && !/\.[a-z]{2,5}$/i.test(s.split("/").pop())) s += "/";
    return s.toLowerCase();
}

/* Known template/placeholder domains that must never reach production. */
const PLACEHOLDER_DOMAINS = [
    "example.com", "example.org", "yourdomain", "your-domain",
    "m-remis.github.io/static-web-template", "username.github.io",
    "localhost",
];

/* Check that meta.domain is mirrored consistently across every file that
   hardcodes a copy of it. meta.domain is the single source of truth. */
function checkDomainConsistency(spec, html) {
    const domain = spec && spec.meta && spec.meta.domain;
    if (!domain) {
        fail("seo", "meta.domain is not set in site-spec.json — canonical/og:url/sitemap can't be verified");
        return;
    }

    const low = domain.toLowerCase();
    for (const ph of PLACEHOLDER_DOMAINS) {
        if (low.includes(ph)) {
            fail("seo", `meta.domain still points at a placeholder/template domain: ${domain}`);
            break;
        }
    }
    if (!/^https?:\/\//i.test(domain)) {
        warn("seo", `meta.domain should be a full URL with scheme (got "${domain}")`);
    }

    const want = normUrl(domain);
    const wantHost = hostOf(domain);

    // index.html canonical + og:url should equal the domain.
    if (html) {
        const canonical = htmlLinkHref(html, "canonical");
        if (canonical && normUrl(canonical) !== want) {
            fail("seo", `index.html canonical (${canonical}) does not match meta.domain (${domain})`);
        }
        const ogUrl = htmlMeta(html, "og:url");
        if (ogUrl && normUrl(ogUrl) !== want) {
            fail("seo", `index.html og:url (${ogUrl}) does not match meta.domain (${domain})`);
        }
    }

    // sitemap.xml <loc> should equal the domain.
    const sitemap = readText("sitemap.xml");
    if (sitemap != null) {
        const locs = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => m[1]);
        if (locs.length === 0) {
            fail("seo", "sitemap.xml has no <loc> entries");
        } else if (!locs.some((l) => normUrl(l) === want)) {
            fail("seo", `sitemap.xml <loc> (${locs[0]}) does not match meta.domain (${domain})`);
        }
        for (const l of locs) {
            const lh = l.toLowerCase();
            if (PLACEHOLDER_DOMAINS.some((ph) => lh.includes(ph))) {
                fail("seo", `sitemap.xml still references a placeholder domain: ${l}`);
            }
        }
    }

    // robots.txt Sitemap: line should point at <domain>/sitemap.xml on the
    // same host.
    const robots = readText("robots.txt");
    if (robots != null) {
        const m = robots.match(/^\s*Sitemap:\s*(\S+)/im);
        if (!m) {
            warn("seo", "robots.txt has no Sitemap: line");
        } else {
            const sitemapUrl = m[1];
            if (hostOf(sitemapUrl) !== wantHost) {
                fail("seo", `robots.txt Sitemap host (${sitemapUrl}) does not match meta.domain host (${wantHost})`);
            }
            const sl = sitemapUrl.toLowerCase();
            if (PLACEHOLDER_DOMAINS.some((ph) => sl.includes(ph))) {
                fail("seo", `robots.txt Sitemap line still references a placeholder domain: ${sitemapUrl}`);
            }
        }
    }

    // CNAME (custom-domain deploys only) — if present, its host should match.
    const cname = readText("CNAME");
    if (cname != null) {
        const cn = cname.trim().split(/\s+/)[0];
        if (cn && cn.toLowerCase() !== wantHost) {
            warn("seo", `CNAME (${cn}) does not match meta.domain host (${wantHost}) — intended if you redirect www↔apex, otherwise a mismatch`);
        }
    }
}

function hostOf(u) {
    if (!u) return "";
    return String(u).trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/.*$/, "")
        .toLowerCase();
}

/* Check that the static <head> fallback in index.html agrees with meta.
   renderHead() overwrites these at runtime, so a mismatch isn't fatal — but a
   stale fallback is what crawlers/scrapers that don't run JS actually see, so
   it should be kept honest. These are warnings. Also flags the theme-color
   hex mirrors (index.html + manifest) drifting from meta.themeColor. */
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
            warn("seo", `index.html ${name} fallback ("${truncate(inHtml)}") differs from meta ("${truncate(inMeta)}") — crawlers see the stale fallback`);
        }
    }

    // <html lang> vs meta.lang
    const lang = htmlLang(html);
    if (meta.lang && lang && lang.toLowerCase() !== String(meta.lang).toLowerCase()) {
        warn("seo", `index.html <html lang="${lang}"> differs from meta.lang ("${meta.lang}")`);
    }

    // theme-color hex should match across meta + manifest.
    if (manifestRes && manifestRes.ok && meta.themeColor) {
        const m = manifestRes.data;
        if (m.theme_color && m.theme_color.toLowerCase() !== String(meta.themeColor).toLowerCase()) {
            warn("seo", `manifest theme_color (${m.theme_color}) differs from meta.themeColor (${meta.themeColor})`);
        }
    }
}

function checkManifest(manifestRes, referenced) {
    if (manifestRes.error === "missing") return; // already reported as required file
    if (!manifestRes.ok) {
        fail("manifest", `site.webmanifest is not valid JSON: ${manifestRes.error}`);
        return;
    }
    const m = manifestRes.data;
    if (!m.name) fail("manifest", "Manifest has no \"name\"");
    if (!Array.isArray(m.icons) || m.icons.length === 0) {
        fail("manifest", "Manifest has no icons");
    } else {
        m.icons.forEach((icon, i) => {
            const src = icon && icon.src;
            if (!src) {
                fail("manifest", `Manifest icon[${i}] has no "src"`);
                return;
            }
            // The path as written must resolve. Try the literal path; if it
            // only exists under assets/ (a root-absolute "/foo.png" mistake),
            // that's still broken as written — fail with a fix hint.
            const literal = normalizeRef(src.replace(/^\//, ""));
            const inAssets = path.posix.join("assets", path.posix.basename(literal));
            const literalExists = fileExists(literal);
            const assetsExists = fileExists(inAssets);

            if (!literalExists && !assetsExists) {
                fail("manifest", `Manifest icon path does not exist: ${src}`);
            } else if (!literalExists && assetsExists) {
                // Written path won't resolve; the file is elsewhere.
                fail("manifest", `Manifest icon path does not exist as written: ${src} (file is at ${inAssets} — fix the src to point there)`);
            }
            referenced.add(literal);
            referenced.add(inAssets);
        });
    }
    if (!m.short_name) warn("manifest", "Manifest has no short_name");
    if (!m.theme_color) warn("manifest", "Manifest has no theme_color");
    if (!m.background_color) warn("manifest", "Manifest has no background_color");
}

function checkAssets(spec, html, referenced) {
    // Referenced from spec
    const specRefs = collectAssetRefs(spec);
    for (const { ref, path: jp } of specRefs) {
        const norm = normalizeRef(ref.replace(/^\//, ""));
        if (!fileExists(norm)) {
            fail("assets", `Referenced asset does not exist: ${ref} (at ${jp})`);
        }
        referenced.add(norm);
    }

    // Referenced from index.html (favicon, manifest link, images)
    if (html) {
        const htmlRefs = html.match(/(?:href|src)=["']([^"']+)["']/gi) || [];
        for (const raw of htmlRefs) {
            const m = raw.match(/["']([^"']+)["']/);
            if (!m) continue;
            const val = m[1];
            const low = val.toLowerCase();
            if (!IMAGE_EXT.some((ext) => low.split(/[?#]/)[0].endsWith(ext))) continue;
            const norm = normalizeRef(val.replace(/^\//, ""));
            if (norm.startsWith("assets/")) {
                if (!fileExists(norm)) {
                    fail("assets", `index.html references missing asset: ${val}`);
                }
                referenced.add(norm);
            }
        }
    }

    // Unused assets: files under assets/ that nothing referenced.
    const onDisk = walkDir("assets");
    for (const f of onDisk) {
        // skip favicon family + manifest icons (referenced indirectly / by convention)
        if (!referenced.has(f)) {
            warn("assets", `Unused asset: ${f}`);
        }
    }
}

function checkImageAlt(spec) {
    // Warn on content images (slideshow slides, etc.) that have a src but no
    // descriptive text the engine could use for alt. Background images are
    // decorative — skip them.
    for (const sec of spec.sections || []) {
        for (const block of sec.blocks || []) {
            if (block.type === "slideshow" && Array.isArray(block.slides)) {
                block.slides.forEach((s, i) => {
                    if (s && s.src && !s.title && !s.caption && !s.text && !s.alt) {
                        warn("accessibility", `Slide ${i} in section "${sec.id}" has no title/caption/alt — image will fall back to "Slide ${i + 1}"`);
                    }
                });
            }
        }
    }
}

function checkContentQuality(spec) {
    for (const sec of spec.sections || []) {
        for (const block of sec.blocks || []) {
            if (block.type === "hero" || sec.id === "home") {
                if (block.type === "hero" && block.lead && block.lead.length < 40) {
                    warn("content", `Hero section "${sec.id}" has very short lead text`);
                }
            }
        }
        // pricing-ish section with no price-looking content
        const idl = (sec.id || "").toLowerCase();
        if (idl.includes("cennik") || idl.includes("cenník") || idl.includes("pricing")) {
            const blob = JSON.stringify(sec).toLowerCase();
            const hasPrice = /€|eur|\bod \d|dohodou|cena|price/.test(blob);
            if (!hasPrice) {
                warn("content", `Pricing section "${sec.id}" does not appear to contain prices`);
            }
        }
    }
}

/* ---- Output -------------------------------------------------------------- */

function truncate(s, n = 60) {
    s = String(s).replace(/\s+/g, " ").trim();
    return s.length > n ? s.slice(0, n) + "…" : s;
}

function groupByCategory(list) {
    const map = new Map();
    for (const { category, message } of list) {
        if (!map.has(category)) map.set(category, []);
        map.get(category).push(message);
    }
    return map;
}

function printGroup(title, list) {
    if (!list.length) return;
    console.log(`\n${title}:\n`);
    const grouped = groupByCategory(list);
    for (const [cat, msgs] of grouped) {
        console.log(`[${cat}]`);
        for (const m of msgs) console.log(`- ${m}`);
        console.log("");
    }
}

function printReport() {
    if (errors.length === 0 && warnings.length === 0) {
        console.log("PASS\n\nNo blocking launch problems found.");
        return;
    }
    if (errors.length === 0) {
        console.log("PASS");
        printGroup("Warnings", warnings);
        return;
    }
    console.log("FAIL");
    printGroup("Errors", errors);
    printGroup("Warnings", warnings);
}

/* Machine-readable report for --json. Stable shape for CI/tooling:
   { status, ok, counts:{errors,warnings}, errors:[{category,message}], warnings:[...] } */
function printReportJson() {
    const report = {
        status: errors.length ? "fail" : "pass",
        ok: errors.length === 0,
        counts: { errors: errors.length, warnings: warnings.length },
        errors,
        warnings,
    };
    console.log(JSON.stringify(report, null, 2));
}

/* Single dispatch point so every exit path honors --json. */
function report() {
    if (OPTS.json) printReportJson();
    else printReport();
}

/* ---- Main ---------------------------------------------------------------- */

function main() {
    checkRequiredFiles();

    const specRes = readJson("site-spec.json");
    if (specRes.error === "missing") {
        // already failed in checkRequiredFiles; nothing more to validate
        report();
        process.exit(errors.length ? 1 : 0);
    }
    if (!specRes.ok) {
        fail("spec", `site-spec.json is not valid JSON: ${specRes.error}`);
        report();
        process.exit(1);
    }

    const spec = specRes.data;
    const html = readText("index.html");
    const manifestRes = readJson("site.webmanifest");

    // Tracks every asset path something legitimately points at, so leftover
    // files on disk can be flagged as unused.
    const referenced = new Set();
    // favicon family is referenced by convention even if not in spec
    ["assets/favicon.ico", "assets/favicon-96x96.png", "assets/apple-touch-icon.png"]
        .forEach((f) => referenced.add(f));

    checkSpecShape(spec);
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
    process.exit(errors.length ? 1 : 0);
}

main();

/* Built from m-remis/static-web-template */