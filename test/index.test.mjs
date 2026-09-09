// Run with:  node --test
//
// Zero dependencies, zero build step — the same claim the README makes about
// the library is true of its tests. Node's built-in runner only (>=18).
//
// The isolate characters are written as escapes here for the same reason they
// are escapes in src/index.js: they are invisible, so a test that embedded them
// literally would be a test whose expectations nobody can read in a diff, and
// which a whitespace/"strip invisible characters" cleanup could silently
// weaken without failing.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  FSI, PDI, LRI,
  isolate, isolateLtr, uiDir, applyDir, autoText,
} from '../src/index.js';

// ── The constants ────────────────────────────────────────────────────────
// Pinned by code point, not by copying the value out of the source. The whole
// library is three invisible characters plus argument handling; if one of them
// drifts by a single code point everything still runs and nothing is isolated.

test('constants are the exact Unicode isolate code points', () => {
  assert.equal(FSI.codePointAt(0), 0x2068, 'FSI must be U+2068 FIRST STRONG ISOLATE');
  assert.equal(PDI.codePointAt(0), 0x2069, 'PDI must be U+2069 POP DIRECTIONAL ISOLATE');
  assert.equal(LRI.codePointAt(0), 0x2066, 'LRI must be U+2066 LEFT-TO-RIGHT ISOLATE');
  for (const c of [FSI, PDI, LRI]) assert.equal(c.length, 1);
});

test('FSI and LRI are different characters', () => {
  // isolateLtr's whole reason to exist is that it does not use FSI. If these
  // two ever collapse to the same value, every isolateLtr test below still
  // passes while key combinations silently start following their translation.
  assert.notEqual(FSI, LRI);
});

// ── isolate: unknown direction ───────────────────────────────────────────

test('isolate wraps in FSI…PDI', () => {
  assert.equal(isolate('example.com'), FSI + 'example.com' + PDI);
});

test('isolate returns empty string for empty input, not a bare FSI+PDI pair', () => {
  // Documented contract: `isolate(x) || fallback` has to keep working.
  assert.equal(isolate(''), '');
  assert.equal(isolate(null), '');
  assert.equal(isolate(undefined), '');
  assert.ok(!isolate(''), 'empty result must be falsy');
});

test('isolate stringifies non-strings instead of throwing', () => {
  assert.equal(isolate(0), FSI + '0' + PDI, '0 is not empty and must be wrapped');
  assert.equal(isolate(false), FSI + 'false' + PDI);
  assert.equal(isolate(12), FSI + '12' + PDI);
});

test('isolate does not care about the content direction', () => {
  // FSI resolves direction at render time; the wrap is identical either way.
  const arabic = 'مثال.مصر'; // مثال.مصر
  assert.equal(isolate(arabic), FSI + arabic + PDI);
});

// ── isolateLtr: known LTR ────────────────────────────────────────────────

test('isolateLtr wraps in LRI…PDI, not FSI', () => {
  const out = isolateLtr('Ctrl + Shift + K');
  assert.equal(out, LRI + 'Ctrl + Shift + K' + PDI);
  assert.ok(!out.includes(FSI), 'must not fall back to first-strong detection');
});

test('isolateLtr pins direction even when the modifier names are translated', () => {
  // This is the failure it exists to prevent: once a translator renders the
  // modifiers in Arabic, the first strong character is Arabic, FSI would read
  // the whole run RTL, and the key order flips on screen.
  const translated = 'مفتاح + K'; // مفتاح + K
  assert.equal(isolateLtr(translated), LRI + translated + PDI);
});

test('isolateLtr shares isolate’s empty-input contract', () => {
  assert.equal(isolateLtr(''), '');
  assert.equal(isolateLtr(null), '');
  assert.equal(isolateLtr(undefined), '');
});

// ── uiDir / applyDir: the chrome.i18n layer ──────────────────────────────

const withChrome = (bidiDir, fn) => {
  const had = 'chrome' in globalThis;
  const prev = globalThis.chrome;
  globalThis.chrome = { i18n: { getMessage: (k) => (k === '@@bidi_dir' ? bidiDir : '') } };
  try { return fn(); } finally {
    if (had) globalThis.chrome = prev; else delete globalThis.chrome;
  }
};

test('uiDir returns ltr outside an extension instead of throwing', () => {
  // Node has no `chrome` binding at all, so this covers the ReferenceError
  // path — the one a try/catch around a bare identifier is actually for.
  assert.equal(uiDir(), 'ltr');
});

test('uiDir reads @@bidi_dir', () => {
  assert.equal(withChrome('rtl', uiDir), 'rtl');
  assert.equal(withChrome('ltr', uiDir), 'ltr');
});

test('uiDir returns ltr for anything that is not exactly "rtl"', () => {
  // Never return a third value: callers assign it straight to `dir`.
  for (const v of ['RTL', 'rtl ', '', undefined, null, 'auto']) {
    assert.equal(withChrome(v, uiDir), 'ltr', `@@bidi_dir=${JSON.stringify(v)}`);
  }
});

test('applyDir sets documentElement.dir and returns it', () => {
  const doc = { documentElement: {} };
  assert.equal(withChrome('rtl', () => applyDir(doc)), 'rtl');
  assert.equal(doc.documentElement.dir, 'rtl');

  const doc2 = { documentElement: {} };
  assert.equal(withChrome('ltr', () => applyDir(doc2)), 'ltr');
  assert.equal(doc2.documentElement.dir, 'ltr');
});

// ── autoText ─────────────────────────────────────────────────────────────

test('autoText sets dir="auto" and the text, and returns the element', () => {
  const el = {};
  assert.equal(autoText(el, 'hello'), el, 'must return the element for chaining');
  assert.equal(el.dir, 'auto');
  assert.equal(el.textContent, 'hello');
});

test('autoText uses textContent, never innerHTML', () => {
  // The text is a translation: treat it as data. Anything that assigned to
  // innerHTML here would make every locale file an injection surface.
  const el = {};
  autoText(el, '<img src=x onerror=alert(1)>');
  assert.equal(el.textContent, '<img src=x onerror=alert(1)>');
  assert.ok(!('innerHTML' in el), 'innerHTML must not be touched');
});

// ── The composition the README shows ─────────────────────────────────────

test('isolated values survive being spliced into a translated sentence', () => {
  // What a caller actually does: join isolated values and substitute them.
  const list = ['example.com', 'مثال.مصر'].map(isolate).join(', ');
  const sentence = `يعمل فقط على ${list}`;
  // Each value keeps its own balanced isolate pair; the separator sits outside.
  assert.equal((sentence.match(new RegExp(FSI, 'g')) || []).length, 2);
  assert.equal((sentence.match(new RegExp(PDI, 'g')) || []).length, 2);
  assert.ok(sentence.includes(PDI + ', ' + FSI), 'separator must be outside both isolates');
});
