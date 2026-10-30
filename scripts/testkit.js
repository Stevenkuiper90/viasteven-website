'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

function makeSite(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-'));
  for (const [name, content] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

function page(body, opts = {}) {
  const {
    head = '',
    noindex = true,
    title = 'ViaSteven | Voorbeeldpagina voor de controle',
    description = 'Een voorbeeldpagina met een beschrijving die lang genoeg is om door de controle te komen en kort genoeg om niet af te kappen.',
  } = opts;
  const robots = noindex ? '<meta name="robots" content="noindex">' : '';
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${title}</title><meta name="description" content="${description}">${robots}${head}</head><body data-page="home"><main id="main"><h1>Kop</h1>${body}</main></body></html>`;
}

module.exports = { makeSite, page };
