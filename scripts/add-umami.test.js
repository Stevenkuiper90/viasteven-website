'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { addUmami } = require('./add-umami');

const html = '<html><head><title>x</title></head><body></body></html>';

test('voegt het script een keer toe voor </head>', () => {
  const once = addUmami(html, 'abc-123');
  assert.ok(once.includes('<script defer src="https://cloud.umami.is/script.js" data-website-id="abc-123"></script>\n</head>'));
  assert.strictEqual(addUmami(once, 'abc-123'), once);
});

test('weigert een ongeldig website-id', () => {
  assert.throws(() => addUmami(html, 'a b"c'), /website-id/);
});
