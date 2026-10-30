'use strict';
const fs = require('fs');
const path = require('path');
const { checkSite } = require('./check');

const KEEP_NOINDEX = new Set(['404.html']);
const NOINDEX_TAG = /\s*<meta name="robots" content="noindex">/g;

function urlFor(domain, file) {
  return file === 'index.html' ? `https://${domain}/` : `https://${domain}/${file}`;
}

function goLive(root, domain) {
  const { errors } = checkSite(root, { live: true, ignoreNoindex: true });
  if (errors.length) throw new Error('Live-controle faalt:\n' + errors.join('\n'));

  const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
  for (const f of pages) {
    if (KEEP_NOINDEX.has(f)) continue;
    const p = path.join(root, f);
    let html = fs.readFileSync(p, 'utf8').replace(NOINDEX_TAG, '');
    if (!/rel="canonical"/.test(html)) {
      html = html.replace('</head>', () => `<link rel="canonical" href="${urlFor(domain, f)}">\n</head>`);
    }
    fs.writeFileSync(p, html);
  }

  fs.writeFileSync(path.join(root, 'CNAME'), domain + '\n');
  const urls = pages.filter((f) => !KEEP_NOINDEX.has(f)).map((f) => urlFor(domain, f));
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);
  fs.writeFileSync(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: https://${domain}/sitemap.xml\n`);
}

if (require.main === module) {
  const domain = process.argv[2];
  if (!domain) {
    console.error('gebruik: node scripts/go-live.js viasteven.nl');
    process.exit(1);
  }
  try {
    goLive(process.cwd(), domain);
    console.log('live gezet voor ' + domain);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

module.exports = { goLive };
