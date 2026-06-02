/* =========================================================
   Static site template
   script.js — content data + UI logic
   ========================================================= */

"use strict";

import {initSkull} from "./animation/skull/skull.js";

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
       Carousels autoplay (5s, pause on hover/focus) and any image can be
       clicked to expand in a full-screen lightbox.

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
    // the defaults below; anything it omits falls back to what's here.
    //
    // For this RustCust version, keep it null if you paste this directly into
    // script.js. If you later move the content into an external JSON file, set:
    //
    // dataUrl: "site.json"
    //
    // Important: real JSON cannot contain these comments.
    dataUrl: null,

    brand: "RustCust",

    // The tabs, in order. `id` ties each one to a key in `sections` below.
    //
    // Client wanted the homepage split into:
    // - Servis
    // - Guiding
    // - Custom
    //
    // Contact stays as its own tab because people should not hunt for phone,
    // email, Instagram, or address.
    nav: [
        {id: "home", label: "Domov"},
        {id: "servis", label: "Servis"},
        {id: "guiding", label: "Guiding"},
        {id: "custom", label: "Custom"},
        {id: "findme", label: "Kde ma nájdete"},
        {id: "kontakt", label: "Kontakt"},
    ],

    // Every section, keyed by the nav id.
    //
    // Each section is:
    //
    // sectionId: {
    //     title: "Optional section heading",
    //     blocks: [
    //         { type: "text", ... },
    //         { type: "cards", ... },
    //         { type: "table", ... },
    //         { type: "slideshow", ... },
    //         ...
    //     ],
    // }
    //
    // To rearrange the page, move blocks up/down. No hardcoded per-tab layout.
    sections: {
        home: {
            // No title here — the hero block carries its own big headline.
            //
            // Homepage strategy:
            // - short intro
            // - explain RustCust in one sentence
            // - three cards leading to Servis / Guiding / Custom
            // - visual proof via slideshow
            blocks: [
                {
                    type: "hero",
                    width: "wide",
                    eyebrow: "RustCust — cyklodielňa",

                    // <em>…</em> renders in the accent color.
                    // Keep this short. Long hero headlines look like ass on mobile.
                    title: "Servis bicyklov a lyží, custom úpravy a guiding v <em>Rajci</em>.",

                    // One or two short sentences max.
                    // Extra explanation belongs in a text block below.
                    lead: "Bla bla bla nejaky text",
                },
                {
                    type: "text",
                    width: "wide",

                    text: "RustCust je malá cyklodielňa v Rajci. Namiesto anonymného servisu ponúka osobný prístup, praktické riešenia a prácu, ktorú je vidieť na výsledku.",
                },
                {
                    type: "cards",
                    linked: true,

                    // These are the three homepage pillars the client asked for.
                    // Each card links to its own tab via hash.
                    items: [
                        {
                            title: "Servis",
                            body: "Diagnostika, nastavenie, umývanie, opravy bicyklov, ručný servis lyží a snowboardov v zimnom období.",
                            meta: "Cenník a podmienky",
                            url: "#servis",
                        },
                        {
                            title: "Guiding",
                            body: "Lokálne výjazdy, bikeškola a sprevádzanie po trasách v okolí Rajca a Rajeckej doliny.",
                            meta: "Balíky a rezervácia",
                            url: "#guiding",
                        },
                        {
                            title: "Custom",
                            body: "Zákazkové úpravy, prestavby retro bicyklov, custom sedlá a drobnosti na mieru.",
                            meta: "Projekty a úpravy",
                            url: "#custom",
                        },
                    ],
                },
                {
                    type: "slideshow",
                    name: "RustCust v skratke",

                    // Replace these placeholders with real RustCust images.
                    // Good homepage images:
                    // - workshop / dielňa
                    // - bike service detail
                    // - riding / guiding
                    // - finished custom bike
                    //
                    // With your preview/lightbox feature, users can click images
                    // and open them larger.
                    slides: [
                        {
                            src: "assets/slides/shop.jpg",
                            title: "Cyklodielňa v Rajci",
                            caption: "Servis, opravy a úpravy bicyklov.",
                        },
                        {
                            src: "assets/slides/flight.jpg",
                            title: "Guiding",
                            caption: "Lokálne trasy a výjazdy v okolí Rajca.",
                        },
                        {
                            src: "assets/slides/peugeot.jpg",
                            title: "Custom práca",
                            caption: "Retro bicykle, prestavby a detaily na mieru.",
                        },
                    ],
                },
            ],
        },

        servis: {
            title: "Servis.",

            // Service tab strategy:
            // - explain what he does
            // - show service categories
            // - show actual price table
            // - show service conditions
            // - end with contact CTA links
            // - include service/workshop photos
            blocks: [
                {
                    type: "text",

                    // Important: pricing disclaimer belongs near the top.
                    // Bike service is not a clean e-shop product because the final
                    // price depends on bike condition, parts, and hidden problems.
                    text: "Servis bicyklov, cyklohygiena a v zimnom období aj ručný servis lyží a snowboardov. Každý bicykel je iný, preto sa výsledná cena môže líšiť podľa stavu, rozsahu práce a použitých dielov.",
                },
                {
                    type: "cards",

                    // Quick service category overview before the full cenník.
                    items: [
                        {
                            title: "Bicykle",
                            body: "Diagnostika, nastavenie bŕzd a radenia, centrovanie, kontrola spojov, premazanie a bežné servisné úkony.",
                            meta: "Diagnostika / veľký servis",
                        },
                        {
                            title: "Cyklohygiena",
                            body: "Základné alebo detailné umytie bicykla vrátane čistenia pohonu, sušenia a premazania.",
                            meta: "Čistý bike jazdí lepšie",
                        },
                        {
                            title: "Lyže a snowboardy",
                            body: "V zimnom období ručný servis lyží a snowboardov podľa dohody.",
                            meta: "Zimný servis",
                        },
                    ],
                },
                {
                    type: "table",
                    name: "Cenník servisu bicyklov",

                    // Keep the warning. It prevents customers from treating
                    // complex service work like a fixed checkout price.
                    blurb: "Ceny sú orientačné a môžu sa líšiť podľa stavu bicykla a náročnosti práce. Materiál nie je zahrnutý v cene služby.",

                    // Last column is styled as value/price by your table CSS.
                    headings: ["Úkon", "Popis", "Cena"],
                    rows: [
                        [
                            "Diagnostika a kontrola bicykla",
                            "Základná kontrola stavu bicykla.",
                            "12 €",
                        ],
                        [
                            "Malý servis",
                            "Diagnostika, nastavenie bŕzd a prehadzovačiek, kontrola a premazanie spojov, dotiahnutie skrutiek momentovým kľúčom, čistenie a premazanie reťaze, dofúkanie kolies.",
                            "30 €",
                        ],
                        [
                            "Stredný servis",
                            "Malý servis + centrovanie kolies, kontrola a nastavenie nábojov.",
                            "45 €",
                        ],
                        [
                            "Veľký servis",
                            "Stredný servis + umývanie bicykla, dôkladné vyčistenie pohonu ultrazvukom, premazanie a nastavenie pohonu, čistenie a odmastenie bŕzd, kontrola a premazanie ložísk v hlavovom a stredovom zložení, výmena bowdenov a laniek.",
                            "95 €",
                        ],
                        [
                            "Základné umytie",
                            "Celkové umytie bicykla, sušenie, premazanie reťaze.",
                            "15 €",
                        ],
                        [
                            "Detailné umytie",
                            "Základné umytie + čistenie pohonu v ultrazvuku, následné premazanie a čistenie citlivých súčiastok parou.",
                            "25 €",
                        ],
                        [
                            "Mimo-cenníkové úkony",
                            "Práca mimo základného cenníka podľa dohody.",
                            "35 €/hod",
                        ],
                    ],
                },
                {
                    type: "table",
                    name: "Podmienky servisu",

                    // This is better as a table than as a wall of paragraphs.
                    // User sees the rule and the explanation quickly.
                    headings: ["Podmienka", "Detail"],
                    rows: [
                        [
                            "Odhad ceny",
                            "Odhadovaná cena servisu sa môže líšiť od reálnej ceny. Každý bicykel je jedinečný.",
                        ],
                        [
                            "Schválenie práce",
                            "Akýkoľvek zákrok sa vykonáva až po odsúhlasení zákazníkom.",
                        ],
                        [
                            "Retro a vintage bicykle",
                            "Servis starších bicyklov môže byť časovo a technicky náročnejší.",
                        ],
                        [
                            "Doplnky",
                            "Doplnky, ktoré by sa mohli poškodiť pri manipulácii, je potrebné vopred demontovať.",
                        ],
                        [
                            "Nadmerne špinavý bicykel",
                            "Pri nadmerne špinavom bicykli môže byť účtovaný poplatok za čistenie 15 €.",
                        ],
                        [
                            "Skladovanie",
                            "Ak si zákazník nevyzdvihne bicykel do troch pracovných dní od dohodnutého termínu, môže byť účtované skladovanie 2 €/deň.",
                        ],
                    ],
                },
                {
                    type: "slideshow",
                    name: "Servis a dielňa",

                    slides: [
                        {
                            src: "assets/slides/mr_fix.jpg",
                            title: "Servis bicyklov",
                            caption: "Diagnostika, nastavenie a opravy.",
                        },
                        {
                            src: "assets/slides/mr_fix_2.jpg",
                            title: "Servis bicyklov",
                            caption: "Diagnostika, nastavenie a opravy.",
                        },
                        {
                            src: "assets/slides/mr_clean.jpg",
                            title: "Cyklohygiena",
                            caption: "Čistenie a starostlivosť o pohon.",
                        },
                    ],
                },
            ],
        },

        guiding: {
            title: "Guiding.",

            // Guiding tab strategy:
            // - do NOT build a real e-shop
            // - present guiding as packages / booking options
            // - prices can stay "dohodou" until he confirms them
            // - CTA should be reservation/contact, not checkout
            blocks: [
                {
                    type: "text",
                    text: "Guiding je pre ľudí, ktorí chcú spoznať lokálne trasy, jazdiť istejšie alebo si dať výjazd bez toho, aby museli riešiť plánovanie. Vhodné pre jednotlivcov, dvojice aj malé skupiny.",
                },
                {
                    type: "cards",

                    // These are “eshop-ish” visually, but without cart/payment.
                    // That is the right compromise for a small local guiding offer.
                    items: [
                        {
                            title: "Lokálny výjazd",
                            body: "Krátky výjazd v okolí Rajca podľa kondície a skúseností jazdcov.",
                            meta: "Jednoduchý štart",
                        },
                        {
                            title: "Individuálny guiding",
                            body: "Trasa, tempo a náročnosť podľa dohody. Vhodné pre ľudí, ktorí chcú jazdiť konkrétny typ terénu.",
                            meta: "Na mieru",
                        },
                        {
                            title: "Bikeškola",
                            body: "Základy techniky jazdy, istota na bicykli, práca s telom a bicyklom v teréne.",
                            meta: "Technika a istota",
                        },
                    ],
                },
                {
                    type: "table",
                    name: "Guiding balíky",

                    // These are placeholders. Do not ship fake prices.
                    // Ask RustCust to confirm exact duration, price, and maximum group size.
                    blurb: "Tieto ceny sú zatiaľ návrh štruktúry",

                    headings: ["Balík", "Popis", "Cena"],
                    rows: [
                        [
                            "Krátky výjazd",
                            "2–3 hodiny, lokálna trasa v okolí Rajca.",
                            "dohodou",
                        ],
                        [
                            "Poldenný guiding",
                            "Dlhší výjazd s plánovanou trasou a prestávkami.",
                            "dohodou",
                        ],
                        [
                            "Individuálny guiding",
                            "Trasa, tempo a náročnosť podľa dohody.",
                            "dohodou",
                        ],
                        [
                            "Bikeškola",
                            "Základy techniky jazdy alebo individuálna práca na konkrétnych zručnostiach.",
                            "dohodou",
                        ],
                    ],
                },
                {
                    type: "slideshow",
                    name: "Výjazdy a trasy",

                    // Use real guiding photos here.
                    // Strong options:
                    // - riding in forest
                    // - group ride
                    // - trail / viewpoint
                    // - technique lesson

                    slides: [
                        {
                            src: "assets/slides/ride.jpg",
                            title: "Lokálne trasy",
                            caption: "Výjazdy v okolí Rajca.",
                        },
                        {
                            src: "assets/slides/ride_2.jpg",
                            title: "Bikeškola",
                            caption: "Technika jazdy a istota na bicykli.",
                        },
                        {
                            src: "assets/slides/ride_3.jpg",
                            title: "Na mieru",
                            caption: "Tempo a náročnosť podľa skupiny.",
                        },
                    ],
                },
            ],
        },

        custom: {
            title: "Custom.",

            // Custom tab strategy:
            // - make it visual
            // - show project types
            // - avoid rigid prices
            // - use slideshow/lightbox heavily
            blocks: [
                {
                    type: "text",
                    text: "Custom časť je o úpravách, opravách a prestavbách bicyklov, najmä retro a vintage kúskov. Cieľom nie je len funkčnosť, ale aj charakter, detail a výsledok, ktorý dáva bicyklu nový život.",
                },
                {
                    type: "cards",
                    items: [
                        {
                            title: "Retro prestavby",
                            body: "Úpravy starších bicyklov na praktické mestské alebo štýlové jazdenie.",
                            meta: "Nový život pre starý bike",
                        },
                        {
                            title: "Custom detaily",
                            body: "Sedlá, poťahy, drobnosti na mieru a úpravy podľa predstavy zákazníka.",
                            meta: "Detail robí celok",
                        },
                        {
                            title: "Individuálne projekty",
                            body: "Každý custom projekt sa rieši individuálne podľa bicykla, rozpočtu a cieľa.",
                            meta: "Cena dohodou",
                        },
                    ],
                },
                {
                    type: "table",
                    name: "Custom práce",

                    // For custom work, hard fixed prices can backfire.
                    // This keeps the site transparent without promising nonsense.
                    blurb: "Pri custom práci je lepšie uvádzať orientačné kategórie, nie tvrdý e-shop cenník. Finálna cena závisí od bicykla, dielov a rozsahu zásahu.",

                    headings: ["Typ práce", "Popis", "Cena"],
                    rows: [
                        [
                            "Konzultácia projektu",
                            "Zhodnotenie bicykla, predstavy, možností a odhad rozsahu práce.",
                            "dohodou",
                        ],
                        [
                            "Retro prestavba",
                            "Úprava staršieho bicykla na nový účel alebo štýl.",
                            "dohodou",
                        ],
                        [
                            "Custom sedlo / detail",
                            "Poťah, doplnok alebo drobná úprava na mieru.",
                            "dohodou",
                        ],
                        [
                            "Individuálny projekt",
                            "Komplexnejšia zákazková práca podľa dohody.",
                            "dohodou",
                        ],
                    ],
                },
                {
                    type: "slideshow",
                    name: "Hotové custom projekty",

                    // This should be the money block.
                    // Put best photos here:
                    // - before/after
                    // - full bike side profile
                    // - detail shots
                    // - saddle / leather / paint / cockpit details
                    slides: [
                        {
                            src: "assets/slides/custom.jpeg",
                            title: "BMX",
                            caption: "Prestavba a úprava na mieru.",
                        },
                        {
                            src: "assets/slides/custom_2.jpeg",
                            title: "Detail práce",
                            caption: "Custom lakovanie",
                        },
                        {
                            src: "assets/slides/custom_3.jpeg",
                            title: "Detail práce",
                            caption: "Sedlo",
                        },
                        {
                            src: "assets/slides/custom_4.jpeg",
                            title: "Hotový projekt",
                            caption: "Bicykel pripravený späť do života.",
                        },
                    ],
                },
            ],
        },

        findme: {
            title: "Kde ma nájdeš.",
            blocks: [
                {
                    type: "text",
                    text: "Cyklodielňu RustCust nájdeš na adrese M. R. Štefánika 624/10, Rajec.",
                },
                {
                    type: "map",

                    // Location only. Do not reuse this address in Firemné údaje unless
                    // it is also the official registered business address.
                    mode: "embed",

                    // Google Maps embed for the physical workshop/location.
                    embed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2612.8265648432184!2d18.631298776804456!3d49.08993598438358!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4714f55524f56759%3A0xcec166df13056af7!2sCyklodie%C5%88a%20RustCust!5e0!3m2!1ssk!2sus!4v1780425535664!5m2!1ssk!2sus",
                    // Normal map link used by the "Open in Maps" button.
                    url: "https://maps.app.goo.gl/sC1H3aNMKeq9ZPvG6",

                    label: "Mapa s polohou cyklodielne RustCust",
                    address: "M. R. Štefánika 624/10, Rajec",
                },
                {
                    type: "slideshow",
                    name: "Cyklodielňa",
                    slides: [
                        {
                            src: "assets/slides/workshop_outside.png",
                            title: "Cyklodielňa RustCust",
                            caption: "M. R. Štefánika 624/10",
                            text: "Rajec",
                        },
                    ],
                },
            ],
        },

        kontakt: {
            title: "Kontakt.",

            // Contact tab strategy:
            // - no backend form
            // - no spam magnet
            // - use phone and email
            // - location lives in "Kde ma nájdete"
            // - business table should contain only confirmed official business data
            blocks: [
                {
                    type: "text",
                    text: "Napíš, zavolaj alebo sa ozvi cez Instagram. Určite sa dohodneme.",
                },
                {
                    type: "links",
                    items: [
                        {
                            label: "Telefón",
                            handle: "+421 000 000 00",
                            url: "tel:+42100000000",
                            icon: "phone",
                        },
                        {
                            label: "Email",
                            handle: "r@r.sk",
                            url: "mailto:r@r.sk",
                            icon: "email",
                        },
                        {
                            label: "Instagram",
                            handle: "@rustcust",
                            url: "https://www.instagram.com/rustcust/",
                            icon: "instagram",
                        },
                    ],
                },
                {
                    type: "table",
                    name: "Firemné údaje",

                    // Do not put the workshop/location address here unless it is also
                    // the official registered business address.
                    headings: ["Údaj", "Hodnota"],
                    rows: [
                        [
                            "Prevádzka",
                            "RustCust – cyklodielňa",
                        ],
                        [
                            "Meno",
                            "Rastislav Buchta",
                        ],
                        [
                            "IČO",
                            "0",
                        ],
                        [
                            "DIČ",
                            "0",
                        ],
                    ],
                },
            ],
        },
    },

    footer: {
        note: "Created and maintained by <a href=\"https://michal-remis.com/?utm_campaign=visitor_origin&utm_source=rustcust.sk/\" target=\"_blank\" rel=\"noopener noreferrer\">Michal</a>.",
        year: new Date().getFullYear(),
    },

    // Social links shown next to the brand in the header and inside the mobile
    // drawer. Keep this short. Too many social links will fight the desktop nav.
    //
    // `icon` must match a key in SOCIAL_ICONS. Current template supports
    // instagram/youtube unless you add more icons manually.
    socials: [
        {
            label: "RustCust",
            icon: "instagram",
            url: "https://www.instagram.com/rustcust/",
        },
    ],

    // Background images.
    //
    // Replace with real RustCust background photos. Best options:
    // - workshop atmosphere
    // - bike detail
    // - forest/trail/guiding shot
    //
    // Keep them compressed. Huge photos will make the site feel slow.
    backgrounds: [
        "assets/background/background.jpg",
        "assets/background/background_2.jpg",
        "assets/background/background_3.jpg",
        "assets/background/background_4.jpg",
        "assets/background/background_5.jpg",
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
     "n / total" counter. Real <button>s, ARIA, and keyboard arrow support.
   - Autoplay: advances every 5s, pauses on hover and keyboard focus, and is
     disabled entirely under prefers-reduced-motion. Any manual interaction
     restarts the timer so the landed-on slide gets its full dwell.
   - Expand: every image is wrapped in a button; clicking it opens a shared
     full-screen lightbox showing the full image letterboxed (no cropping).

   Each carousel keeps its own `index` and timer in closure scope, so multiple
   carousels on the page never interfere with one another.
---------------------------------------------------------------------- */

let carouselSeq = 0;

/* Shared lightbox: one overlay reused by every carousel, created lazily on
   first open. Shows the full image letterboxed (object-fit: contain in CSS) —
   each image keeps its own aspect ratio inside a uniform frame, no cropping.

   open(slides, startIndex) takes the clicked carousel's full slide list and the
   index that was clicked, so prev/next (buttons + arrow keys) cycle within that
   one carousel. Each slide is { src, caption } (caption already joined). */
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
        // Fade out, then hide + clear the src. Guarded by isOpen so a fast
        // reopen during the fade cancels this hide (the reopen clears the timer
        // too, below).
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
        // Cancel any pending hide from a just-closed instance so reopening
        // immediately works (this was the "can't open it again" bug).
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
        // Next frame so the fade-in transition runs from hidden → visible.
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

    // Slide data for the lightbox (this carousel only): src + a joined caption.
    // Prev/next in the expanded view cycles through exactly these.
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

        // Counter chip ("n / total"), top-left, multi only — mirrors W3Schools.
        if (multi) {
            slide.appendChild(
                el("span", {class: "carousel__counter", "aria-hidden": "true"},
                    `${i + 1} / ${list.length}`)
            );
        }

        // The image lives inside a real <button> so it's keyboard-focusable and
        // opens the lightbox on click/Enter/Space.
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

        // If an image path is wrong, hide that slide's broken-image icon and
        // fall back to a neutral frame — consistent with the background's
        // silent-fail behavior elsewhere in the template.
        img.addEventListener("error", () => {
            img.classList.add("is-broken");
        });

        trigger.appendChild(img);
        trigger.addEventListener("click", () => getLightbox().open(lightboxSlides, i));
        slide.appendChild(trigger);

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

    // Single slide: nothing more to wire up (image is still click-to-expand).
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

    // ---- Autoplay: advance every 5s; pause on hover/focus; disabled under
    // prefers-reduced-motion. Manual nav restarts the timer (full dwell). ----
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

    // Pause on pointer hover and keyboard focus anywhere in the carousel.
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

    // Wrap a slide change so a manual action also resets the autoplay timer,
    // giving the slide the user landed on its full interval before advancing.
    const manual = (fn) => () => {
        fn();
        stop();
        start();
    };

    prevBtn.addEventListener("click", manual(() => setActive(index - 1)));
    nextBtn.addEventListener("click", manual(() => setActive(index + 1)));

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
        dot.addEventListener("click", manual(() => setActive(i)));
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

    // Wrap the skull mascot, brand, and optional socials into one left-side
    // header cluster. The skull starts in index.html before #brand; renderNav()
    // moves it into .brand-wrap so header-fit treats skull + brand + socials as
    // one unit. Build the wrapper even when there are no socials, otherwise the
    // skull would stay outside the measured header cluster.
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

        // The rightmost thing in the left cluster and the first tab.
        // Prefer the last social link, but fall back to the brand/skull cluster
        // when there are no socials, so header-fit still works.
        const socials = brandWrap.querySelectorAll(".socials__link");
        const leftEdgeEl = socials.length
            ? socials[socials.length - 1]
            : brandWrap.lastElementChild;
        const firstTab = nav.querySelector("a");

        if (!leftEdgeEl || !firstTab) return;

        const leftRight = leftEdgeEl.getBoundingClientRect().right;
        const tabLeft = firstTab.getBoundingClientRect().left;

        // gap = horizontal space between the left cluster and the nav.
        const gap = tabLeft - leftRight;

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
    const layers = [$("#bg"), $("#bg2")].filter(Boolean);
    const list = SITE.backgrounds;

    if (layers.length < 2 || !list || !list.length) {
        // Fallback: single image, no cycling (e.g. only one layer present).
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

    // How long each image stays before crossfading to the next.
    const HOLD = 8000;

    let index = 0;       // which image in the list is showing
    let front = 0;       // which layer is currently on top (0 or 1)

    const show = (i, layerIndex) => {
        const layer = layers[layerIndex];
        const src = list[i];
        const img = new Image();

        img.onload = () => {
            layer.style.backgroundImage = `url("${src}")`;

            // Restart the drift animation from the start on this layer.
            layer.classList.remove("is-active");
            // Force reflow so removing + re-adding the class re-triggers the
            // CSS animation, otherwise the browser ignores the re-add.
            void layer.offsetWidth;
            layer.classList.add("is-active");

            // Fade the other layer out.
            layers[1 - layerIndex].classList.remove("is-active");
        };

        img.onerror = () => {
            // Image missing — skip to the next one on the next tick.
        };

        img.src = src;
    };

    // Show the first image immediately on the front layer.
    show(index, front);

    // Only cycle if there's more than one image.
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

    // Skull mascot — runs after renderNav() moved #headerSkull into .brand-wrap.
    // Wrapped so that even if the skull module fails, the rest of the site still
    // renders normally.
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