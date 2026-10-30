'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { fill } = require('./set-contact');

test('vult alleen gevulde waarden in', () => {
  const out = fill('<a href="mailto:{{EMAIL}}">{{EMAIL}}</a> {{TEL}}', { EMAIL: 'info@viasteven.nl', TEL: '' });
  assert.strictEqual(out, '<a href="mailto:info@viasteven.nl">info@viasteven.nl</a> {{TEL}}');
});

test('laat onbekende tokens staan', () => {
  assert.strictEqual(fill('{{ONBEKEND}}', { EMAIL: 'a' }), '{{ONBEKEND}}');
});
