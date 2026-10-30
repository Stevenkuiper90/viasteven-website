'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { makeSite, page } = require('./testkit');
const { checkSite } = require('./check');

const has = (list, text) => list.some((m) => m.includes(text));

test('een geldige pagina geeft geen fouten', () => {
  const dir = makeSite({ 'index.html': page('<p>Rustige tekst.</p>') });
  const { errors } = checkSite(dir);
  assert.deepStrictEqual(errors, []);
});

test('gedachtestreepje en " - " zijn fouten', () => {
  const a = checkSite(makeSite({ 'index.html': page('<p>Dit \u2014 dat</p>') }));
  assert.ok(has(a.errors, 'gedachtestreepje'));
  const b = checkSite(makeSite({ 'index.html': page('<p>Dit - dat</p>') }));
  assert.ok(has(b.errors, 'zinsverbinder'));
});

test('verboden woorden zijn fouten', () => {
  const r = checkSite(makeSite({ 'index.html': page('<p>Mijn hobby en wij bouwen.</p>') }));
  assert.ok(has(r.errors, 'hobby'));
  assert.ok(has(r.errors, 'wij-vorm'));
});

test('afbeelding zonder alt is een fout, ontbrekend bestand ook', () => {
  const dir = makeSite({ 'index.html': page('<img src="a.jpg"><img src="weg.jpg" alt="x">'), 'a.jpg': 'x' });
  const { errors } = checkSite(dir);
  assert.ok(has(errors, 'alt'));
  assert.ok(has(errors, 'weg.jpg'));
});

test('kapotte links en ankers zijn fouten', () => {
  const dir = makeSite({ 'index.html': page('<a href="bestaat-niet.html">x</a><a href="#niet">y</a>') });
  const { errors } = checkSite(dir);
  assert.ok(has(errors, 'bestaat-niet.html'));
  assert.ok(has(errors, '#niet'));
});

test('anker op een andere pagina wordt gecontroleerd', () => {
  const dir = makeSite({
    'index.html': page('<a href="over.html#bestaat">x</a><a href="over.html#mist">y</a>'),
    'over.html': page('<h2 id="bestaat">Ja</h2>'),
  });
  const { errors } = checkSite(dir);
  assert.ok(has(errors, '#mist'));
  assert.ok(!has(errors, '#bestaat'));
});

test('placeholders zijn waarschuwing in voorbeeld en fout live', () => {
  const dir = makeSite({ 'index.html': page('<p>[..]</p><a href="mailto:{{EMAIL}}" data-umami-event="klik-mailen">m</a>') });
  const preview = checkSite(dir);
  assert.deepStrictEqual(preview.errors, []);
  assert.ok(has(preview.warnings, 'placeholder'));
  const live = checkSite(dir, { live: true, ignoreNoindex: true });
  assert.ok(has(live.errors, 'placeholder'));
});

test('noindex: verplicht in voorbeeld, verboden live (behalve 404)', () => {
  const zonder = checkSite(makeSite({ 'index.html': page('<p>x</p>', { noindex: false }) }));
  assert.ok(has(zonder.errors, 'noindex ontbreekt'));
  const live = checkSite(makeSite({ 'index.html': page('<p>x</p>'), '404.html': page('<p>x</p>') }), { live: true });
  assert.ok(has(live.errors, 'index.html: noindex staat nog'));
  assert.ok(!has(live.errors, '404.html'));
});

test('externe stijlbladen en scripts zijn fouten, Umami mag', () => {
  const bad = checkSite(makeSite({ 'index.html': page('<p>x</p>', { head: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?x"><script src="https://elders.nl/a.js"></script>' }) }));
  assert.ok(has(bad.errors, 'extern'));
  const ok = checkSite(makeSite({ 'index.html': page('<p>x</p>', { head: '<script defer src="https://cloud.umami.is/script.js" data-website-id="abc"></script>' }) }));
  assert.deepStrictEqual(ok.errors, []);
});

test('mailto zonder data-umami-event is een fout', () => {
  const r = checkSite(makeSite({ 'index.html': page('<a href="mailto:a@b.nl">m</a>') }));
  assert.ok(has(r.errors, 'data-umami-event'));
});

test('404 mag paden met een slash vooraan gebruiken', () => {
  const dir = makeSite({
    'index.html': page('<p>x</p>'),
    '404.html': page('<a href="/index.html">terug</a>', { head: '<link rel="stylesheet" href="/s.css">' }),
    's.css': 'a{}',
  });
  assert.deepStrictEqual(checkSite(dir).errors, []);
});

test('twee h1 en kapotte JSON-LD zijn fouten', () => {
  const dir = makeSite({ 'index.html': page('<h1>Nog een</h1>', { head: '<script type="application/ld+json">{kapot</script>' }) });
  const { errors } = checkSite(dir);
  assert.ok(has(errors, 'h1'));
  assert.ok(has(errors, 'JSON-LD'));
});

test('placeholder in title, meta description, attributen en JSON-LD wordt gemeld', () => {
  const desc = 'Een voorbeeldpagina met een beschrijving [..] die lang genoeg is om door de controle te komen en kort genoeg om niet af te kappen.';
  const a = checkSite(makeSite({ 'index.html': page('<p>x</p>', { description: desc }) }));
  assert.ok(has(a.warnings, 'placeholder'));
  const b = checkSite(makeSite({ 'index.html': page('<p>x</p>', { title: 'ViaSteven | Pagina {{TITEL}} voor test' }) }));
  assert.ok(has(b.warnings, 'placeholder'));
  const c = checkSite(makeSite({ 'index.html': page('<img src="a.jpg" alt="foto [tekst]">'), 'a.jpg': 'x' }));
  assert.ok(has(c.warnings, 'placeholder'));
  const d = checkSite(makeSite({ 'index.html': page('<p>x</p>', { head: '<script type="application/ld+json">{"name":"[naam]"}</script>' }) }));
  assert.ok(has(d.warnings, 'placeholder'));
  const e = checkSite(makeSite({ 'index.html': page('<p>x</p>', { head: '<script type="application/ld+json">{"sameAs":["https://a.nl"]}</script>' }) }));
  assert.ok(!has(e.warnings, 'placeholder'));
  const live = checkSite(makeSite({ 'index.html': page('<p>x</p>', { description: desc }) }), { live: true, ignoreNoindex: true });
  assert.ok(has(live.errors, 'placeholder'));
});

test('verboden woorden en " - " gelden ook voor attributen, title en JSON-LD', () => {
  const a = checkSite(makeSite({ 'index.html': page('<img src="a.jpg" alt="onze hobby">'), 'a.jpg': 'x' }));
  assert.ok(has(a.errors, 'hobby'));
  const b = checkSite(makeSite({ 'index.html': page('<p>x</p>', { title: 'ViaSteven - Voorbeeldpagina voor controle' }) }));
  assert.ok(has(b.errors, 'zinsverbinder'));
  const c = checkSite(makeSite({ 'index.html': page('<p>x</p>', { head: '<script type="application/ld+json">{"description":"voor Kuperus"}</script>' }) }));
  assert.ok(has(c.errors, 'bedrijfsnaam'));
});

test('href met {{ geeft geen "bestand bestaat niet"', () => {
  const r = checkSite(makeSite({ 'index.html': page('<a href="{{LINKEDIN}}">in</a>') }));
  assert.ok(!has(r.errors, 'bestaat niet'));
  assert.ok(has(r.warnings, 'placeholder'));
});

test('live: Umami-script is verplicht, behalve op 404', () => {
  const umami = '<script defer src="https://cloud.umami.is/script.js" data-website-id="abc"></script>';
  const zonder = checkSite(makeSite({ 'index.html': page('<p>x</p>', { noindex: false }), '404.html': page('<p>x</p>') }), { live: true });
  assert.ok(has(zonder.errors, 'index.html: Umami'));
  assert.ok(!has(zonder.errors, '404.html: Umami'));
  const met = checkSite(makeSite({ 'index.html': page('<p>x</p>', { noindex: false, head: umami }) }), { live: true });
  assert.deepStrictEqual(met.errors, []);
  const voorbeeld = checkSite(makeSite({ 'index.html': page('<p>x</p>') }));
  assert.ok(!has(voorbeeld.errors, 'Umami'));
});

test('noindex-eis vervalt als er een CNAME staat', () => {
  const dir = makeSite({ 'index.html': page('<p>x</p>', { noindex: false }), CNAME: 'viasteven.nl\n' });
  assert.ok(!has(checkSite(dir).errors, 'noindex ontbreekt'));
});
