'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { makeSite, page } = require('./testkit');
const { goLive } = require('./go-live');

const UMAMI = { head: '<script defer src="https://cloud.umami.is/script.js" data-website-id="abc"></script>' };

test('weigert met placeholders en laat bestanden ongemoeid', () => {
  const dir = makeSite({ 'index.html': page('<p>[..]</p>') });
  assert.throws(() => goLive(dir, 'viasteven.nl'), /placeholder/);
  assert.ok(fs.readFileSync(path.join(dir, 'index.html'), 'utf8').includes('noindex'));
  assert.ok(!fs.existsSync(path.join(dir, 'CNAME')));
});

test('zet live: noindex weg, canonical, CNAME, sitemap, robots', () => {
  const dir = makeSite({ 'index.html': page('<p>x</p>', UMAMI), 'contact.html': page('<p>y</p>', UMAMI), '404.html': page('<p>z</p>') });
  goLive(dir, 'viasteven.nl');
  const index = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.ok(!index.includes('noindex'));
  assert.ok(index.includes('<link rel="canonical" href="https://viasteven.nl/">'));
  assert.ok(fs.readFileSync(path.join(dir, 'contact.html'), 'utf8').includes('href="https://viasteven.nl/contact.html"'));
  assert.ok(fs.readFileSync(path.join(dir, '404.html'), 'utf8').includes('noindex'));
  assert.strictEqual(fs.readFileSync(path.join(dir, 'CNAME'), 'utf8'), 'viasteven.nl\n');
  const sitemap = fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8');
  assert.ok(sitemap.includes('<loc>https://viasteven.nl/</loc>'));
  assert.ok(sitemap.includes('<loc>https://viasteven.nl/contact.html</loc>'));
  assert.ok(!sitemap.includes('404'));
  assert.ok(fs.readFileSync(path.join(dir, 'robots.txt'), 'utf8').includes('Sitemap: https://viasteven.nl/sitemap.xml'));
});

test('is herhaalbaar', () => {
  const dir = makeSite({ 'index.html': page('<p>x</p>', UMAMI), '404.html': page('<p>z</p>') });
  goLive(dir, 'viasteven.nl');
  const first = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  goLive(dir, 'viasteven.nl');
  assert.strictEqual(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), first);
  assert.strictEqual(fs.readFileSync(path.join(dir, '404.html'), 'utf8').split('<base ').length, 2);
});

test('schrijft og:url of werkt een bestaande bij', () => {
  const dir = makeSite({
    'index.html': page('<p>x</p>', UMAMI),
    'contact.html': page('<p>y</p>', { head: UMAMI.head + '<meta property="og:url" content="https://oud.nl/">' }),
  });
  goLive(dir, 'viasteven.nl');
  const index = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.ok(index.includes('<meta property="og:url" content="https://viasteven.nl/">'));
  const contact = fs.readFileSync(path.join(dir, 'contact.html'), 'utf8');
  assert.ok(contact.includes('<meta property="og:url" content="https://viasteven.nl/contact.html">'));
  assert.ok(!contact.includes('oud.nl'));
  assert.strictEqual(contact.split('og:url').length, 2);
});

test('zet base href op de 404 en niet op de andere paginas', () => {
  const dir = makeSite({ 'index.html': page('<p>x</p>', UMAMI), '404.html': page('<p>z</p>') });
  goLive(dir, 'viasteven.nl');
  const nf = fs.readFileSync(path.join(dir, '404.html'), 'utf8');
  assert.ok(nf.includes('<base href="/">'));
  assert.ok(nf.indexOf('<base href="/">') < nf.indexOf('</head>'));
  assert.ok(!fs.readFileSync(path.join(dir, 'index.html'), 'utf8').includes('<base'));
});
