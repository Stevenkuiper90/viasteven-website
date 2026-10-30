'use strict';
const fs = require('fs');
const path = require('path');

function applyLayout(html, header, footer) {
  const page = (html.match(/<body[^>]*\sdata-page="([^"]+)"/) || [])[1];
  let head = header;
  if (page) {
    const re = new RegExp(`<a [^>]*data-nav="${page}"[^>]*`);
    head = head.replace(re, (m) => (m.includes('aria-current') ? m : m + ' aria-current="page"'));
  }
  return html
    .replace(/<!--layout:header-->[\s\S]*?<!--\/layout:header-->/, () => `<!--layout:header-->\n${head}\n<!--/layout:header-->`)
    .replace(/<!--layout:footer-->[\s\S]*?<!--\/layout:footer-->/, () => `<!--layout:footer-->\n${footer}\n<!--/layout:footer-->`);
}

if (require.main === module) {
  const root = process.cwd();
  const header = fs.readFileSync(path.join(root, 'partials', 'header.html'), 'utf8').trim();
  const footer = fs.readFileSync(path.join(root, 'partials', 'footer.html'), 'utf8').trim();
  for (const f of fs.readdirSync(root).filter((x) => x.endsWith('.html'))) {
    const p = path.join(root, f);
    const before = fs.readFileSync(p, 'utf8');
    const after = applyLayout(before, header, footer);
    if (after !== before) {
      fs.writeFileSync(p, after);
      console.log('bijgewerkt: ' + f);
    }
  }
}

module.exports = { applyLayout };
