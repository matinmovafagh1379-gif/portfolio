// Everything search engines read lives here: page titles, descriptions, the
// photo list (alt text, dimensions), JSON-LD and the sitemap. The app imports it
// for the gallery and language switch; scripts/prerender.mjs imports it to bake
// the same data into the static HTML. Plain ESM so Node can load it directly.

export const SITE = 'https://matinmovafagh.ir';
export const AUTHOR = 'Matin Movafagh';
export const AUTHOR_FA = 'متین موفق';

export const SOCIAL = [
  'https://www.linkedin.com/in/matin-movafagh-11594b3b0/',
  'https://github.com/matinmovafagh1379-gif',
  'https://www.instagram.com/matin_movafagh/',
  'https://t.me/Matin_movafagh',
];

// One URL per language, both prerendered.
export const PAGES = {
  fa: {
    path: '/',
    locale: 'fa_IR',
    title: 'متین موفق | Matin Movafagh — توسعه‌دهنده فرانت‌اند (همدان)',
    description:
      'متین موفق (Matin Movafagh)، توسعه‌دهنده فرانت‌اند اهل همدان با پیشینه مهندسی برق. نمونه‌کار و عکس‌ها: اتاق‌بازی، Trading CRM، React، HTML، CSS و JavaScript.',
    jobDescription: 'متین موفق، توسعه‌دهنده فرانت‌اند اهل همدان با پیشینه مهندسی برق (گرایش الکترونیک).',
  },
  en: {
    path: '/en/',
    locale: 'en_US',
    title: 'Matin Movafagh | متین موفق — Frontend Developer from Hamedan',
    description:
      'Matin Movafagh (متین موفق) — frontend developer from Hamedan, Iran. Portfolio, projects and photos: OtaghBazi, Trading CRM, React, HTML, CSS, JavaScript.',
    jobDescription: 'Matin Movafagh is a frontend developer from Hamedan, Iran with a background in electrical/electronics engineering.',
  },
};

// Photos rendered as real <img> elements (the About gallery). Photos drawn inside
// the 3D scene are canvas pixels, which search engines cannot index.
// `focus` is the object-position used when a photo is cropped to the circle.
export const IMAGES = [
  {
    file: 'matin-movafagh-working-on-laptop.webp', w: 1280, h: 855, main: true, focus: '71% 40%',
    fa: 'تصویر متین موفق، توسعه‌دهنده‌ی فرانت‌اند',
    en: 'Portrait of Matin Movafagh, frontend developer',
  },
  {
    file: 'matin-movafagh-city-skyline-night.jpg', w: 420, h: 236, focus: '51% 38%',
    fa: 'متین موفق مقابل خط آسمان شهر در شب',
    en: 'Matin Movafagh in front of a city skyline at night',
  },
  {
    file: 'matin-movafagh-coffee-shop-laptop.jpg', w: 420, h: 315, focus: '60% 28%',
    fa: 'متین موفق با لپ‌تاپ و یک فنجان قهوه در کافه',
    en: 'Matin Movafagh with a laptop and a mug of coffee in a café',
  },
  {
    file: 'matin-movafagh-frontend-developer.jpg', w: 768, h: 508, focus: '100% 38%',
    fa: 'متین موفق با ژاکت مشکی در یک قاب تیره، توسعه‌دهنده فرانت‌اند',
    en: 'Matin Movafagh in a dark jacket against a dark background, frontend developer',
  },
  {
    file: 'matin-movafagh-developer-at-coding-desk.webp', w: 1280, h: 721, focus: '66% 40%',
    fa: 'متین موفق کنار مانیتور با کد روی میز کار',
    en: 'Matin Movafagh next to a monitor showing code on his desk',
  },
  {
    file: 'matin-movafagh-smiling-portrait.webp', w: 1192, h: 1200, focus: '50% 35%',
    fa: 'پرتره‌ی خندان متین موفق',
    en: 'Smiling portrait of Matin Movafagh',
  },
  {
    file: 'matin-movafagh-portrait-city-at-night.webp', w: 1280, h: 720, focus: '65% 42%',
    fa: 'متین موفق شب‌هنگام با چراغ‌های شهر پشت سرش',
    en: 'Matin Movafagh at night with city lights behind him',
  },
];
export const OG_ALT = {
  fa: 'متین موفق (Matin Movafagh)، توسعه‌دهنده فرانت‌اند',
  en: 'Matin Movafagh (متین موفق), frontend developer',
};

export const imageUrl = (file) => `${SITE}/images/${file}`;
const imageId = (file) => `${SITE}/#img-${file.replace(/\.\w+$/, '')}`;
export const imagePath = (file) => `/images/${file}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function jsonLd(lang) {
  const page = PAGES[lang];
  const url = SITE + page.path;
  const main = IMAGES.find((i) => i.main);
  const imageObjects = IMAGES.map((i) => ({
    '@type': 'ImageObject',
    '@id': imageId(i.file),
    contentUrl: imageUrl(i.file),
    url: imageUrl(i.file),
    name: i[lang],
    caption: i[lang],
    description: i[lang],
    width: i.w,
    height: i.h,
    encodingFormat: i.file.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
    creator: { '@id': `${SITE}/#person` },
    creditText: AUTHOR,
    copyrightNotice: `© 2026 ${AUTHOR}`,
    acquireLicensePage: SITE + '/',
  }));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${SITE}/#person`,
        name: AUTHOR,
        givenName: 'Matin',
        familyName: 'Movafagh',
        alternateName: [AUTHOR_FA, 'MatinMovafagh'],
        jobTitle: 'Frontend Developer',
        description: page.jobDescription,
        url: SITE + '/',
        image: { '@id': imageId(main.file) },
        mainEntityOfPage: { '@id': `${url}#profile` },
        address: { '@type': 'PostalAddress', addressLocality: 'Hamedan', addressCountry: 'IR' },
        homeLocation: { '@type': 'City', name: 'Hamedan', address: { '@type': 'PostalAddress', addressCountry: 'IR' } },
        hasOccupation: {
          '@type': 'Occupation',
          name: 'Frontend Developer',
          occupationLocation: { '@type': 'City', name: 'Hamedan' },
          skills: 'HTML, CSS, JavaScript, React, Git, GitHub, Vite, Tailwind',
        },
        knowsAbout: ['Frontend development', 'HTML', 'CSS', 'JavaScript', 'React', 'Git', 'GitHub', 'Vite', 'Tailwind CSS'],
        sameAs: SOCIAL,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        url: SITE + '/',
        name: AUTHOR,
        alternateName: [AUTHOR_FA, 'matinmovafagh.ir'],
        inLanguage: ['fa-IR', 'en'],
        publisher: { '@id': `${SITE}/#person` },
      },
      {
        '@type': 'ProfilePage',
        '@id': `${url}#profile`,
        url,
        name: page.title,
        description: page.description,
        inLanguage: lang === 'fa' ? 'fa-IR' : 'en',
        isPartOf: { '@id': `${SITE}/#website` },
        mainEntity: { '@id': `${SITE}/#person` },
        primaryImageOfPage: { '@id': imageId(main.file) },
        image: IMAGES.map((i) => ({ '@id': imageId(i.file) })),
      },
      ...imageObjects,
      {
        '@type': 'CreativeWork',
        '@id': `${SITE}/#otaghbazi`,
        name: 'OtaghBazi',
        description: "Website for a kids' play and psychology center, focused on a friendly experience that fits a children's space.",
        url: 'https://otaghbazi.vercel.app/',
        creator: { '@id': `${SITE}/#person` },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE}/#trading-crm`,
        name: 'Trading CRM',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: 'React-based CRM for a trading company: user roles, dashboard, charts, customer management and Excel export.',
        url: 'https://trading-crm-fam-git-main-matin22.vercel.app/',
        author: { '@id': `${SITE}/#person` },
      },
    ],
  };
}

// <head> tags for one language, injected by scripts/prerender.mjs.
export function buildHead(lang) {
  const page = PAGES[lang];
  const other = lang === 'fa' ? 'en' : 'fa';
  const url = SITE + page.path;
  const ogImg = `${SITE}/og-image.jpg`;
  const ogAlt = OG_ALT[lang];
  const ld = JSON.stringify(jsonLd(lang)).replace(/</g, '\\u003c');
  return [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<link rel="alternate" hreflang="fa" href="${SITE}${PAGES.fa.path}">`,
    `<link rel="alternate" hreflang="en" href="${SITE}${PAGES.en.path}">`,
    `<link rel="alternate" hreflang="x-default" href="${SITE}${PAGES.fa.path}">`,
    `<meta property="og:type" content="profile">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:site_name" content="${AUTHOR}">`,
    `<meta property="og:title" content="${esc(page.title)}">`,
    `<meta property="og:description" content="${esc(page.description)}">`,
    `<meta property="og:image" content="${ogImg}">`,
    `<meta property="og:image:type" content="image/jpeg">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(ogAlt)}">`,
    `<meta property="og:locale" content="${page.locale}">`,
    `<meta property="og:locale:alternate" content="${PAGES[other].locale}">`,
    `<meta property="profile:first_name" content="Matin">`,
    `<meta property="profile:last_name" content="Movafagh">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(page.title)}">`,
    `<meta name="twitter:description" content="${esc(page.description)}">`,
    `<meta name="twitter:image" content="${ogImg}">`,
    `<meta name="twitter:image:alt" content="${esc(ogAlt)}">`,
    ...SOCIAL.map((s) => `<link rel="me" href="${s}">`),
    `<script type="application/ld+json">${ld}</script>`,
  ].join('\n');
}

export function buildSitemap(lastmod) {
  const imgs = IMAGES.map((i) => `      <image:image><image:loc>${imageUrl(i.file)}</image:loc></image:image>`).join('\n');
  const alt = [
    `      <xhtml:link rel="alternate" hreflang="fa" href="${SITE}${PAGES.fa.path}"/>`,
    `      <xhtml:link rel="alternate" hreflang="en" href="${SITE}${PAGES.en.path}"/>`,
    `      <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${PAGES.fa.path}"/>`,
  ].join('\n');
  const entry = (lang, priority) =>
    `  <url>\n    <loc>${SITE}${PAGES[lang].path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n${alt}\n${imgs}\n  </url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entry('fa', '1.0')}\n${entry('en', '0.9')}\n</urlset>\n`;
}

// Client side: keeps the head tags in step with the language toggle. Crawlers
// read the prerendered tags; this only matters for people who switch language.
export function applyHead(lang) {
  if (typeof document === 'undefined') return;
  const p = PAGES[lang], url = SITE + p.path;
  const set = (sel, attr, val) => { const el = document.head.querySelector(sel); if (el) el.setAttribute(attr, val); };
  document.title = p.title;
  set('meta[name="description"]', 'content', p.description);
  set('link[rel="canonical"]', 'href', url);
  set('meta[property="og:url"]', 'content', url);
  set('meta[property="og:title"]', 'content', p.title);
  set('meta[property="og:description"]', 'content', p.description);
  set('meta[property="og:locale"]', 'content', p.locale);
  set('meta[name="twitter:title"]', 'content', p.title);
  set('meta[name="twitter:description"]', 'content', p.description);
}
