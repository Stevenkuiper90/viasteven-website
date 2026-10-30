'use strict';
const fs = require('fs');
const path = require('path');

const KEEP_NOINDEX = new Set(['404.html']);
const ALLOWED_SCRIPTS = new Set(['https://cloud.umami.is/script.js']);
const TRACKED = [/^mailto:/i, /^tel:/i, /^https:\/\/wa\.me\//i];

const FORBIDDEN = [
  { re: /\bhobby\b/i, why: 'woord hobby' },
  { re: /ook beschikbaar als interim/i, why: 'interim-verkoopzin' },
  { re: /gebouwd door een directeur/i, why: 'oude kop' },
  { re: /\bwij\b/i, why: 'wij-vorm' },
  { re: /zonder dure consultants/i, why: 'verwijt aan de sector' },
  { re: /\babonnement\b/i, why: 'woord abonnement (nog niet besloten)' },
  { re: /Kuperus|Oenema/, why: 'bedrijfsnaam van een klant' },
  { re: /\binfra\b|groenbedrijf|carrosserie/i, why: 'sectordetail' },
];

function visibleText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

function attrsOf(tag) {
  const out = {};
  tag.replace(/([a-zA-Z:-]+)\s*=\s*"([^"]*)"/g, (_, k, v) => {
    out[k.toLowerCase()] = v;
    return '';
  });
  return out;
}

function jsonStrings(value, out) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => jsonStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => jsonStrings(v, out));
  return out;
}

// Tekst die niet zichtbaar is maar wel gelezen wordt: title, meta description,
// content/alt/title-attributen en de strings in JSON-LD.
function hiddenText(html) {
  const parts = [];
  const title = html.match(/<title>([^<]*)<\/title>/);
  if (title) parts.push(title[1]);
  for (const tag of html.match(/<[a-zA-Z][^>]*>/g) || []) {
    const a = attrsOf(tag);
    for (const k of ['content', 'alt', 'title']) if (a[k]) parts.push(a[k]);
  }
  for (const m of html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      parts.push(...jsonStrings(JSON.parse(m[1]), []));
    } catch (e) {
      // ongeldige JSON wordt apart gemeld
    }
  }
  return parts.join(' | ');
}

function isExternal(url) {
  return /^(https?:)?\/\//i.test(url || '');
}

function checkSite(root, { live = false, ignoreNoindex = false } = {}) {
  const errors = [];
  const warnings = [];
  const files = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
  const local = (p) => path.join(root, p.split('?')[0].replace(/^\//, ''));
  const hasCname = fs.existsSync(path.join(root, 'CNAME'));
  const htmls = {};
  const ids = {};
  for (const f of files) {
    htmls[f] = fs.readFileSync(path.join(root, f), 'utf8');
    ids[f] = new Set([...htmls[f].matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  }

  for (const f of files) {
    const html = htmls[f];
    const err = (m) => errors.push(`${f}: ${m}`);
    const warn = (m) => warnings.push(`${f}: ${m}`);
    const text = visibleText(html);
    const hidden = hiddenText(html);
    const allText = text + ' ' + hidden;

    if (!/<html[^>]*\slang="nl"/.test(html)) err('lang="nl" ontbreekt');

    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
    if (!title || title.length < 15 || title.length > 65) err(`title moet 15 tot 65 tekens zijn (nu ${title ? title.length : 0})`);

    const desc = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/) || [])[1];
    if (!desc || desc.length < 70 || desc.length > 160) err(`description moet 70 tot 160 tekens zijn (nu ${desc ? desc.length : 0})`);

    const h1s = (html.match(/<h1[\s>]/g) || []).length;
    if (h1s !== 1) err(`precies een h1 verwacht, gevonden ${h1s}`);

    if (/\u2014|\u2013|&mdash;|&ndash;/.test(html)) err('gedachtestreepje gevonden');
    if (/\s-\s/.test(allText)) err('" - " als zinsverbinder gevonden');
    for (const { re, why } of FORBIDDEN) if (re.test(allText)) err(`verboden: ${why}`);

    for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
      const a = attrsOf(tag);
      if (a.alt === undefined) err(`afbeelding zonder alt: ${a.src}`);
      if (isExternal(a.src)) err(`externe afbeelding: ${a.src}`);
      else if (a.src && !a.src.includes('{{') && !a.src.startsWith('data:') && !fs.existsSync(local(a.src))) err(`afbeelding bestaat niet: ${a.src}`);
    }

    for (const tag of html.match(/<(link|script|iframe|source)\b[^>]*>/gi) || []) {
      const name = tag.match(/^<(\w+)/)[1].toLowerCase();
      const a = attrsOf(tag);
      const url = a.src || a.href;
      if (!url || url.includes('{{')) continue;
      const rel = (a.rel || '').toLowerCase();
      if (isExternal(url)) {
        const relevant = name !== 'link' || /(stylesheet|preload|preconnect|prefetch|modulepreload)/.test(rel);
        if (relevant && !(name === 'script' && ALLOWED_SCRIPTS.has(url))) err(`extern bestand niet toegestaan: ${url}`);
      } else if (!url.startsWith('data:') && !fs.existsSync(local(url))) {
        err(`bestand bestaat niet: ${url}`);
      }
    }

    for (const tag of html.match(/<a\b[^>]*>/gi) || []) {
      const a = attrsOf(tag);
      const href = a.href;
      if (!href) continue;
      if (TRACKED.some((re) => re.test(href))) {
        if (!a['data-umami-event']) err(`data-umami-event ontbreekt op ${href}`);
        continue;
      }
      if (href.includes('{{')) continue;
      if (isExternal(href) || /^javascript:/i.test(href)) continue;
      const [filePart, hash] = href.split('#');
      const target = filePart ? decodeURIComponent(filePart).replace(/^\//, '') : f;
      if (!fs.existsSync(path.join(root, target))) {
        err(`link naar bestand dat niet bestaat: ${href}`);
        continue;
      }
      if (hash && htmls[target] && !ids[target].has(hash)) err(`anker bestaat niet: ${href}`);
    }

    for (const m of html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        JSON.parse(m[1]);
      } catch (e) {
        err('JSON-LD is geen geldige JSON');
      }
    }

    const hasPlaceholder = /\[[^\]]{1,60}\]/.test(allText) || /\{\{[A-Z_]+\}\}/.test(html);
    if (hasPlaceholder) (live ? err : warn)('placeholder (bijvoorbeeld [..] of {{EMAIL}}) staat nog in de pagina');

    if (live && !KEEP_NOINDEX.has(f) && !/<script\b[^>]*\ssrc="https:\/\/cloud\.umami\.is\/script\.js"/.test(html)) {
      err('Umami-script ontbreekt op een live pagina');
    }

    if (!ignoreNoindex) {
      const noindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
      if (live && noindex && !KEEP_NOINDEX.has(f)) err('noindex staat nog op een live pagina');
      if (!live && !noindex && !hasCname) err('noindex ontbreekt in voorbeeld');
    }
  }

  const cssDir = path.join(root, 'assets', 'css');
  if (fs.existsSync(cssDir)) {
    for (const c of fs.readdirSync(cssDir).filter((x) => x.endsWith('.css'))) {
      const css = fs.readFileSync(path.join(cssDir, c), 'utf8');
      if (/@import|url\(\s*['"]?https?:/i.test(css)) errors.push(`${c}: externe @import of url() niet toegestaan`);
    }
  }

  return { errors, warnings };
}

if (require.main === module) {
  const live = process.argv.includes('--live');
  const { errors, warnings } = checkSite(process.cwd(), { live });
  warnings.forEach((w) => console.warn('WAARSCHUWING ' + w));
  errors.forEach((e) => console.error('FOUT ' + e));
  console.log(`${errors.length} fouten, ${warnings.length} waarschuwingen`);
  process.exit(errors.length ? 1 : 0);
}

module.exports = { checkSite };
