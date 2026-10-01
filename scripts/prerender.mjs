import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PAGES, buildHead, buildSitemap } from '../src/seo.js';

const root = process.cwd();
const dist = path.join(root, 'dist');
const serverEntry = path.join(root, 'dist-server', 'entry-server.js');

// Vercel Web Analytics, added at build time only so dev never requests it. The script is
// served by Vercel itself once Analytics is enabled for the project, and 404s harmlessly elsewhere.
const ANALYTICS = [
  '<script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>',
  '<script defer src="/_vercel/insights/script.js"></script>',
].join('\n');

const { render } = await import(pathToFileURL(serverEntry).href);
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf-8');
if (!template.includes('<div id="root"></div>')) {
  throw new Error('Prerender failed: root container not found in dist/index.html');
}

// Bake one complete HTML file per language: real text + the right <head> tags.
for (const lang of Object.keys(PAGES)) {
  const html = template
    .replace('<div id="root"></div>', () => `<div id="root">${render(lang)}</div>`)
    .replace(/<html[^>]*>/, `<html lang="${lang}" dir="${lang === 'fa' ? 'rtl' : 'ltr'}">`)
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace('</head>', () => `${buildHead(lang)}\n${ANALYTICS}\n</head>`);
  const out = path.join(dist, PAGES[lang].path, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log('Prerendered', path.relative(root, out));
}

fs.writeFileSync(path.join(dist, 'sitemap.xml'), buildSitemap(new Date().toISOString().slice(0, 10)));
fs.rmSync(path.join(root, 'dist-server'), { recursive: true, force: true });
console.log('Wrote dist/sitemap.xml');
