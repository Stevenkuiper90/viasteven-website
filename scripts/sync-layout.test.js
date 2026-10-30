'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { applyLayout } = require('./sync-layout');

const header = '<nav><a href="index.html" data-nav="home">Home</a><a href="contact.html" data-nav="contact">Contact</a></nav>';
const footer = '<footer>Voet</footer>';
const pageHtml = (inner) => `<body data-page="contact"><!--layout:header-->${inner}<!--/layout:header--><main></main><!--layout:footer-->x<!--/layout:footer--></body>`;

test('vervangt header en footer en markeert de actieve link', () => {
  const out = applyLayout(pageHtml('oud'), header, footer);
  assert.ok(out.includes('data-nav="contact" aria-current="page"'));
  assert.ok(!out.includes('data-nav="home" aria-current'));
  assert.ok(out.includes('<footer>Voet</footer>'));
  assert.ok(!out.includes('oud'));
});

test('is idempotent', () => {
  const once = applyLayout(pageHtml('oud'), header, footer);
  assert.strictEqual(applyLayout(once, header, footer), once);
});

test('laat tekens met een dollarteken ongemoeid', () => {
  const out = applyLayout(pageHtml('oud'), '<a data-nav="contact" href="c.html">$1 en $&</a>', footer);
  assert.ok(out.includes('$1 en $&'));
});
