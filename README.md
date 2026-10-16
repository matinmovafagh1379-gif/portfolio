# Matin Movafagh — portfolio

Personal site built with React, Vite and Three.js. Scrolling moves a camera across a 3D desk (coffee cup, monitor, phone). Persian at `/`, English at `/en/`.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve the build locally
```

Node 18 or newer.

## Where things live

```
src/config.js            social links and which photo goes where in the 3D scene
src/icons.js             inline brand icons for the tools list
src/translations.js      every visible string, Persian and English
src/seo.js               titles, descriptions, project URLs, photo list with alt text, JSON-LD, sitemap
src/components/          one file per section, plus Gallery (the photo carousel)
src/three/scene.js       the 3D scene and the canvas-drawn monitor and phone screens
scripts/prerender.mjs    writes dist/index.html, dist/en/index.html and dist/sitemap.xml
public/images/           photos
public/404.html          standalone not-found page (Vercel serves it with a 404 status)
public/og-image.jpg      1200x630 share image used by Open Graph and Twitter cards
public/favicon.*         MM monogram drawn from Bricolage Grotesque Bold outlines: favicon.svg, favicon.ico (16/32/48),
                         favicon-48/96.png, apple-touch-icon.png, icon-192/512.png, icon-maskable-512.png
```

`scene.js` looks up `.row[data-p]`, `#screenClose`, `.work .pin` and a few other hooks by selector, so keep those class names and ids when editing components.

## Changing content

- **Text:** `src/translations.js`. A value can be a string or an array of paragraphs.
- **Photos in the About carousel:** `IMAGES` in `src/seo.js`. Each entry needs a file in `public/images/`, its real width and height, alt text in both languages, and `focus` (the crop point inside the circle).
- **Project links:** `PROJECT_URLS` in `src/seo.js`. The page, the 3D scene and the structured data all read it. A project without a URL shows no preview link.
- **Tools list:** `TOOLS` in `src/components/Skills.jsx`; add the brand mark to `src/icons.js`.

## SEO

Both language pages are prerendered at build time, each with its own title, description, canonical, `hreflang`, Open Graph tags and JSON-LD (Person, WebSite, ProfilePage, ImageObject, projects). The About carousel renders every photo as a real `<img>`, so Google Images can index them. The 3D scene's photos are canvas pixels and cannot be indexed.

Photos should be exported at 1200 px wide or more, with descriptive file names (`matin-movafagh-...`; JPG or WebP), and listed in `IMAGES`. That list feeds the alt text, the JSON-LD and `sitemap.xml`.

## Deploying on Vercel with matinmovafagh.ir

1. Import the repo in Vercel (framework: Vite, build command `npm run build`, output `dist`).
2. Project Settings → Domains: add `matinmovafagh.ir` and `www.matinmovafagh.ir`.
3. At your DNS provider: an `A` record for `@` pointing to `76.76.21.21`, and a `CNAME` for `www` pointing to `cname.vercel-dns.com`. Use the values Vercel shows for the project if they differ.
4. `vercel.json` already redirects `www` to the bare domain.
5. Search Console: add the domain property, verify with the DNS TXT record, submit `https://matinmovafagh.ir/sitemap.xml`, then request indexing for `/` and `/en/`. Repeat in Bing Webmaster Tools.
6. If the domain changes, update `SITE` in `src/seo.js` and the sitemap line in `public/robots.txt`.

## Analytics

`scripts/prerender.mjs` adds Vercel Web Analytics to the built pages (not to the dev server). It starts collecting after you turn it on: Vercel dashboard, your project, Analytics tab, Enable. It uses no cookies. On another host the script simply 404s and nothing breaks.

## Performance notes

- The 3D scene renders only when something changed (scroll, camera, typing, steam). Idle frames are skipped, and the shadow map is refreshed only when the cup or phone moves.
- Resolution adapts only under heavy load: if animation runs below about 25 fps, the pixel ratio steps down slightly, never below 1.5 on desktop or 1.25 on phones. Base ratio is 2 on desktop and 1.5 on phones.
- The canvas is sized with `100lvh`, so the phone address bar sliding in and out does not resize the drawing buffer.
- On phones the project list is a compact one-screen list; opening a project shows its description in a card under the monitor.

## Notes

- `main.jsx` does not use `React.StrictMode`. The scene starts once, holds a render loop and global listeners, and has no teardown, so StrictMode's double effect would start it twice.
- `three` is pinned to `0.128.0`, the version the scene was written against. Newer releases rename parts of the API.

## Projects on the monitor

On landscape screens the Work chapter fills the view with the 3D monitor, which shows the
projects as files in a small file explorer; clicking one opens it full-screen on the
monitor (back button, "Live preview" button, and a browser window with its address).
This is drawn in `drawFilesScreen` in `src/three/scene.js`; the project texts still come
from `src/translations.js` (keys `w1`..`w5`), and the order comes from `PROJECTS` in
`src/components/Work.jsx`. The same list stays in the page HTML, visually hidden, so search
engines and screen readers see it and keyboard users can still open projects (Tab, Enter,
Esc to go back). Portrait screens (phones) keep the normal on-page list, because the
monitor is too small to read there. To add a project: add `wN.*` keys in both languages,
a row in `Work.jsx`, a colour in `PROJECT_COLOR` and a file name in `FILE_NAME` (scene.js).
