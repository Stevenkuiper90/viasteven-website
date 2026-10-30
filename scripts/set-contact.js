'use strict';
const fs = require('fs');
const path = require('path');

function fill(html, values) {
  return html.replace(/\{\{([A-Z_]+)\}\}/g, (m, key) => (values[key] !== undefined && values[key] !== '' ? values[key] : m));
}

if (require.main === module) {
  const root = process.cwd();
  const file = path.join(root, 'contact.local.json');
  if (!fs.existsSync(file)) {
    console.log('geen contact.local.json, niets ingevuld');
    process.exit(0);
  }
  const values = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const f of fs.readdirSync(root).filter((x) => x.endsWith('.html'))) {
    const p = path.join(root, f);
    const before = fs.readFileSync(p, 'utf8');
    const after = fill(before, values);
    if (after !== before) {
      fs.writeFileSync(p, after);
      console.log('ingevuld: ' + f);
    }
  }
}

module.exports = { fill };
