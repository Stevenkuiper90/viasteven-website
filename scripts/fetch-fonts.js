'use strict';
const fs = require('fs');
const path = require('path');

const CSS = 'https://fonts.googleapis.com/css2?family=Sora:wght@100..800&family=Public+Sans:wght@100..900&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

(async () => {
  const css = await (await fetch(CSS, { headers: { 'user-agent': UA } })).text();
  const blocks = css.split('/* ').slice(1).map((b) => ({ subset: b.slice(0, b.indexOf(' */')), body: b }));
  for (const b of blocks) {
    if (b.subset !== 'latin') continue;
    const family = /font-family: '([^']+)'/.exec(b.body)[1];
    const url = /url\((https:[^)]+\.woff2)\)/.exec(b.body)[1];
    const out = path.join('assets', 'fonts', family.toLowerCase().replace(/ /g, '-') + '-latin.woff2');
    fs.writeFileSync(out, Buffer.from(await (await fetch(url)).arrayBuffer()));
    console.log(out);
  }
})();
