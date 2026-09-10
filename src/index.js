// extension-bidi — right-to-left support for browser extensions.
//
// Zero dependencies. Five functions, one for each layer where bidirectional
// text actually breaks. Copy the file or install the package; both work.
//
// ── Why mirroring the layout is the easy half ────────────────────────────
//
// `dir="rtl"` plus CSS logical properties gets you a mirrored layout in an
// afternoon. What breaks after that is *direction mixing*: an LTR run — a
// keyboard shortcut, a URL, a version number, a code identifier — sitting
// inside an RTL sentence.
//
// The Unicode Bidirectional Algorithm assigns the neutral characters between
// them (`+ : . , / * -` and spaces) to whichever side wins, and the ends of
// your LTR run land somewhere you did not put them. Nothing throws. Nothing
// logs. It just looks wrong, and only to people who read right-to-left.
//
// ── The two layers, and why you need both ────────────────────────────────
//
//   1. DOM layer: `dir="ltr"` on the element. HTML's UA stylesheet gives you
//      both `direction: ltr` and `unicode-bidi: isolate`, so the element
//      becomes a directional island — unaffected by, and not affecting, its
//      surroundings. Use when the content has its own element.
//
//   2. String layer: wrap the value in FSI…PDI before substituting it into an
//      already-translated sentence. The DOM cannot help here: the value is
//      being spliced into the middle of a string by your i18n lookup, so it
//      has no element of its own.
//
// ── Why keyboard shortcuts are pinned LTR ────────────────────────────────
//
// **Physical keyboards are not mirrored in RTL locales.** An Arabic user's
// Ctrl key is still at the bottom left, and the number row still reads
// 1234567890 left to right. Rendering "Ctrl + Shift + K" right-to-left
// inverts a physical fact, and the user has to mentally flip it back before
// their fingers can follow. Microsoft and Apple keep key combinations LTR in
// their Arabic interfaces too. This is the correct answer, not a shortcut.

/** U+2068 FIRST STRONG ISOLATE — detects the direction of what it wraps. */
export const FSI = '\u2068';
/** U+2069 POP DIRECTIONAL ISOLATE — closes FSI and LRI alike. */
export const PDI = '\u2069';
/** U+2066 LEFT-TO-RIGHT ISOLATE — forces LTR regardless of content. */
export const LRI = '\u2066';

// These three are written as escapes on purpose. They are invisible
// characters: written literally they are invisible in your diff, invisible in
// review, and some tooling strips "invisible characters" as a cleanup step —
// after which the code still runs and only the isolation is silently gone.

/**
 * Isolate a value of *unknown* direction before splicing it into translated
 * text. FSI detects direction from the first strong character, so an ASCII URL
 * stays LTR and an Arabic domain name goes RTL — both correct.
 *
 * Returns '' for empty input rather than a bare FSI+PDI pair, so that
 * `isolate(x) || '—'` and similar fallbacks still behave.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function isolate(value) {
  const v = String(value ?? '');
  return v ? FSI + v + PDI : '';
}

/**
 * Isolate a value whose direction is *known* to be left-to-right — key
 * combinations, version strings, code identifiers.
 *
 * The distinction from `isolate` is not pedantry. Modifier key names are
 * usually localised (a German keyboard says "Strg", so showing "Ctrl" asks the
 * user to find a key that is not there). The moment a translator renders them
 * in Arabic, the first strong character of "Ctrl + Shift + K" becomes an
 * Arabic letter, FSI reads the whole run as RTL, and the key order flips.
 *
 * LRI makes correctness independent of that translation choice.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function isolateLtr(value) {
  const v = String(value ?? '');
  return v ? LRI + v + PDI : '';
}

/**
 * The interface direction, from `chrome.i18n`'s built-in `@@bidi_dir` message.
 *
 * This follows the locale the browser actually selected — the same source as
 * the strings you are showing — so you cannot end up with Arabic text laid out
 * left to right.
 *
 * Do not maintain your own list of RTL languages. It will miss ur, ps, sd,
 * ckb, yi, dv, and it will drift from whatever the browser actually picked.
 *
 * @returns {'ltr'|'rtl'}
 */
export function uiDir() {
  try {
    return chrome.i18n.getMessage('@@bidi_dir') === 'rtl' ? 'rtl' : 'ltr';
  } catch {
    return 'ltr';
  }
}

/**
 * Apply the interface direction to the document. Call it wherever you set
 * `documentElement.lang`.
 *
 * @param {Document} [doc]
 * @returns {'ltr'|'rtl'}
 */
export function applyDir(doc = document) {
  const d = uiDir();
  doc.documentElement.dir = d;
  return d;
}

/**
 * Put text of *unknown language* into an element and let the browser decide
 * its direction.
 *
 * You need this because **`chrome.i18n` falls back to your default locale per
 * key**: a missing message returns the English string, not an empty one. So at
 * runtime you cannot tell a translation from a fallback — both are non-empty.
 * Deciding direction from "did we translate it" is therefore impossible.
 *
 * `dir="auto"` sidesteps the question: the browser reads the element's own
 * content. An Arabic translation renders RTL, an English fallback renders LTR,
 * and it keeps working when translations are added later without a code
 * change.
 *
 * Known limit: `dir="auto"` only looks at the *first* strong character, so an
 * Arabic sentence opening with a Latin brand name is read as LTR. The fix is
 * not to abandon it — it is to make that a checked invariant: reject RTL
 * messages that begin with a strong LTR character, and either reword them or
 * prefix U+200F RLM.
 *
 * @param {HTMLElement} el
 * @param {string} text
 * @returns {HTMLElement} the same element, for chaining
 */
export function autoText(el, text) {
  el.dir = 'auto';
  el.textContent = text;
  return el;
}
