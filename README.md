# Static site template

A small, fast, static site template.

No frameworks, no build step, no dependencies — just HTML, CSS, and vanilla JS.
Clone it, edit one block of text, drop in a couple of images, and deploy.

Built for small static websites: personal sites, portfolios, local business pages,
simple client landing pages, and similar no-backend projects.

## Quick start (≈ 5 minutes)

1. **Edit your content.** Open `script.js` and edit the `SITE` object at the
   very top, marked `◀━━ EDIT THIS BLOCK`.

   That's the brand name, all section text, projects, contact info, map, socials,
   and background image list. You rarely need to touch anything else.

2. **Set your map.** In `SITE.findMe.mapEmbed`, paste an embed URL from Google
   Maps → *Share* → *Embed a map* → copy the `src`.

   You can also just change the address in the existing `?q=...` URL.

3. **Add background images.** Drop images into `assets/background/` and list
   their paths in `SITE.backgrounds`.

   One background is picked at random per visit. Missing images fail silently to
   a plain background instead of breaking the page.

4. **Swap the favicon.** Replace `assets/favicon.ico` with your own.

5. **Update the metadata for SEO and sharing.** Search the project for
   `example.com` and replace it with your real domain in:

    * `index.html`
    * `sitemap.xml`
    * `robots.txt`

   Also update:

    * `site.webmanifest`
    * `LICENSE`
    * social preview metadata in `index.html`

   The site works before you do this, but search engines and social link previews
   will be wrong until you clean it up.

6. **Run the checklist.** Before shipping anything, go through
   `CLIENT-CHECKLIST.md`.

That's it. Open `index.html` directly in a browser, or serve it locally:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Using this template properly

This repository is meant to be used as a starting point, not as a framework.

The normal workflow is:

1. Create a new repository from this template.
2. Edit the `SITE` object at the top of `script.js`.
3. Replace the favicon and background images in `assets/`.
4. Update metadata, domain references, manifest, sitemap, robots, and license.
5. Test the site on desktop and mobile.
6. Go through `CLIENT-CHECKLIST.md`.
7. Deploy.

Do not skip the checklist.

It exists to catch the boring but embarrassing stuff:

* leftover placeholder text
* wrong domains
* bad metadata
* old map URLs
* default favicons
* broken social links
* copied template leftovers
* forgotten SEO/share-preview values

The annoying static-site behavior has already been tested and hardened in the
places where these small websites usually break:

* Chrome
* Firefox
* Safari
* desktop layouts
* mobile layouts
* responsive header behavior
* mobile menu behavior
* hash navigation
* back/forward browser navigation
* tab refresh behavior
* theme switching
* embedded map behavior
* custom 404 routing

That does not mean you should blindly ship the site after changing the text.
It means the template already handles the usual static-site bullshit, so your
job is mostly to replace the content carefully, verify the final result on real
devices, and run the checklist before deployment.

## Customizing the look

All colors live as CSS variables in `styles.css` under:

```css
[data-theme="dark"]
[data-theme="light"]
```

The variables are grouped by what they affect:

* backgrounds
* text
* menu
* borders
* accents
* cards
* shadows

Change those variables to re-skin the entire site.

Both themes, the main page, the 404 page, and the browser theme color are driven
from the same styling system. Nothing needs to be duplicated elsewhere.

Fonts are loaded from Google Fonts in `index.html`.

## Loading content from your own backend (optional)

By default, all content lives in the inline `SITE` object in `script.js`.

If you'd rather serve content from an API, set `SITE.dataUrl` to a JSON endpoint:

```js
dataUrl: "/api/site.json",
```

On load, the site fetches that URL and overlays the JSON on top of the inline
defaults:

* keys returned by the JSON override the inline values
* keys omitted from the JSON fall back to the inline values
* arrays, such as `services.items`, are replaced wholesale

The JSON mirrors the `SITE` shape. You can send the whole object or just the
parts that change:

```json
{
  "brand": "Acme Corp",
  "intro": {
    "eyebrow": "Live data",
    "title": "Served <em>from</em> the backend."
  }
}
```

If the fetch fails because the backend is down, the response is bad, or the
endpoint is missing, the page silently keeps the inline content instead of
breaking.

That means a deploy is never at the mercy of your API being online.

## Features

* Tab-style navigation
* URL hash deep-links to sections
* Browser back/forward support
* Separate desktop and mobile navigation
* Frosted sticky header
* Light/dark theme toggle
* Theme saved to `localStorage`
* Respects system theme preference on first visit
* Embedded map section
* Random background image with graceful fallback
* Custom 404 page matching the main site
* SEO basics: `sitemap.xml`, `robots.txt`, semantic metadata, PWA manifest
* Accessible controls: real buttons, ARIA tab roles, keyboard arrow navigation
* Skip link
* Visible focus states
* Reduced-motion support

## Deploying to GitHub Pages

1. Push the project to a repository.
2. Go to **Settings → Pages**.
3. Select **Deploy from branch**.
4. Select your branch, usually `main`.
5. Select the root folder.
6. Save.

The included `.nojekyll` file is already set up so GitHub Pages serves the files
as-is.

### Custom domain

If you use a custom domain, create a file named `CNAME` in the project root.

No extension. No extra text. Just the domain:

```text
mysite.com
```

Leave `CNAME` out entirely if you're using the default GitHub Pages URL:

```text
username.github.io/repository-name
```

This template ships without a `CNAME` on purpose, so it never claims a domain
you do not own.

Remember: the `CNAME` file is only the repository-side part. You still need to
configure the custom domain in GitHub Pages settings and set up DNS correctly.

## Other hosting

This works on any static host.

You can deploy it to:

* GitHub Pages
* Netlify
* Vercel
* Cloudflare Pages
* any regular static web server

There is no build command. Just point the host at the folder.

## File overview

| File                         | What it's for                                              |
|------------------------------|------------------------------------------------------------|
| `index.html`                 | Page shell; mostly empty because content is injected by JS |
| `script.js`                  | **Your content** via the `SITE` object + all UI logic      |
| `styles.css`                 | Styling, layout, responsive behavior, and theme variables  |
| `404.html` / `404.css`       | Custom not-found page matching the main site               |
| `CLIENT-CHECKLIST.md`        | Final client-site checklist before shipping                |
| `AGENTS.md`                  | Instructions for AI coding agents working on the project   |
| `site.webmanifest`           | PWA/app metadata                                           |
| `sitemap.xml` / `robots.txt` | SEO and crawler hints                                      |
| `.nojekyll`                  | Tells GitHub Pages to serve files directly                 |
| `assets/`                    | Favicon, background images, and static assets              |

## Before shipping

Run through `CLIENT-CHECKLIST.md`.

At minimum, verify:

* there is no leftover template text
* the domain is correct everywhere
* the favicon is replaced
* the metadata is correct
* social sharing previews are correct
* the map points to the right place
* all contact links work
* mobile navigation works
* desktop navigation works
* the 404 page works
* the site works in Chrome, Firefox, Safari, and mobile browsers

Small static websites usually fail because of forgotten details, not because the
HTML is complicated.

This checklist exists so you do not ship those forgotten details.

<details>
<summary>Why this even exists</summary>

Because simple client websites should not require a framework, a build step, or
3000 npm packages.

I am a seasoned backend engineer, and somehow 90% of the time I am asked to
create a website, fix a printer, or explain why someone's computer is "acting
weird."

This template gets a clean static site running in five minutes without centering
a div from scratch or managing a technology stack that should have never been
summoned for a small landing page in the first place.

This way I have more time for fixing the printers.

And yes, some of this was created with help from Claude because I hate frontend.
But the browser testing, cleanup, polish, and repeated "why the hell does this
break only on mobile" suffering were very real.

</details>

<!-- Built from m-remis/static-web-template -->