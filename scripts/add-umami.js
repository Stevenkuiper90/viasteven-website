'use strict';
const fs = require('fs');
const path = require('path');

function addUmami(html, id) {
  if (!/^[A-Za-z0-9-]+$/.test(id || '')) throw new Error('ongeldig website-id');
  if (html.includes('cloud.umami.is/script.js')) return html;
  const tag = `<script defer src="https://cloud.umami.is/script.js" data-website-id="${id}"></script>`;
  return html.replace('</head>', () => `${tag}\n</head>`);
}

if (require.main === module) {
  const id = process.argv[2];
  const root = process.cwd();
  for (const f of fs.readdirSync(root).filter((x) => x.endsWith('.html'))) {
    const p = path.join(root, f);
    const before = fs.readFileSync(p, 'utf8');
    const after = addUmami(before, id);
    if (after !== before) {
      fs.writeFileSync(p, after);
      console.log('umami toegevoegd: ' + f);
    }
  }
}

module.exports = { addUmami };
