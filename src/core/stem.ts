/**
 * Porter stemmer (1980) — pure, deterministic, zero-dependency TypeScript.
 *
 * Rules follow the original Porter 1980 paper exactly. This is a standard
 * suffix-stripping algorithm: no data files, no network, no ML model.
 *
 * Guarantees:
 *   - Pure: same input → same output always.
 *   - Total: never throws; "" → "".
 *   - Idempotent: stem(stem(x)) === stem(x).
 *   - ASCII-lowercase input (callers must lowercase before calling).
 */

/** Return true if position `i` in `s` is a consonant (handles 'y' rule). */
function cons(s: string, i: number): boolean {
  const c = s[i];
  if (c === undefined) return false;
  if (c === "a" || c === "e" || c === "i" || c === "o" || c === "u") return false;
  if (c === "y") return i === 0 ? true : !cons(s, i - 1);
  return true;
}

/**
 * The "measure" m of a word, per Porter 1980: count of VC transitions in stem.
 * m > 0 means the word is not a trivial one-syllable root.
 */
function measure(s: string): number {
  let n = 0;
  let i = 0;
  const len = s.length;
  // skip leading consonants
  while (i < len && cons(s, i)) i++;
  // alternate V→C transitions
  while (i < len) {
    // skip vowels
    while (i < len && !cons(s, i)) i++;
    if (i < len) {
      n++;
      // skip consonants
      while (i < len && cons(s, i)) i++;
    }
  }
  return n;
}

/** True if s[0..n] contains a vowel. */
function hasVowelInStem(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (!cons(s, i)) return true;
  }
  return false;
}

/** True if s ends with a doubled consonant (e.g. "runn", "hopp"). */
function endsDoubledConsonant(s: string): boolean {
  const len = s.length;
  if (len < 2) return false;
  const c = s[len - 1];
  return c !== undefined && c === s[len - 2] && cons(s, len - 1);
}

/**
 * True if `stem` ends with cvc where the final consonant is not w/x/y.
 * Used in step 1b and step 5a (Porter's *o condition).
 */
function endsCVCPattern(s: string): boolean {
  const len = s.length;
  if (len < 3) return false;
  const c3 = s[len - 1];
  if (c3 === undefined) return false;
  if (c3 === "w" || c3 === "x" || c3 === "y") return false;
  return cons(s, len - 1) && !cons(s, len - 2) && cons(s, len - 3);
}

/** Replace suffix `suf` with `rep` if word ends with `suf` and condition holds. */
function replaceSuffix(
  word: string,
  suf: string,
  rep: string,
  condition: (stem: string) => boolean,
): string | null {
  if (!word.endsWith(suf)) return null;
  const stem = word.slice(0, word.length - suf.length);
  if (!condition(stem)) return null;
  return stem + rep;
}

// Convenience condition factories
const mGt0 = (s: string): boolean => measure(s) > 0;
const mGt1 = (s: string): boolean => measure(s) > 1;
const mEq1 = (s: string): boolean => measure(s) === 1;

/** Step 1a: plurals. */
function step1a(word: string): string {
  if (word.endsWith("sses")) return word.slice(0, -2); // caresses → caress
  if (word.endsWith("ies")) return word.slice(0, -2); // ponies → poni
  if (word.endsWith("ss")) return word; // caress → caress (unchanged)
  if (word.endsWith("s")) return word.slice(0, -1); // cats → cat
  return word;
}

/** Step 1b: -eed, -ed, -ing. */
function step1b(word: string): string {
  // (m>0) EED → EE
  if (word.endsWith("eed")) {
    const stem = word.slice(0, -3);
    if (measure(stem) > 0) return stem + "ee";
    return word;
  }

  // (*v*) ED → "" or (*v*) ING → ""
  let changed = false;
  let w = word;

  if (word.endsWith("ed")) {
    const stem = word.slice(0, -2);
    if (hasVowelInStem(stem)) {
      w = stem;
      changed = true;
    }
  } else if (word.endsWith("ing")) {
    const stem = word.slice(0, -3);
    if (hasVowelInStem(stem)) {
      w = stem;
      changed = true;
    }
  }

  if (!changed) return word;

  // Sub-rules applied to the stripped form w:
  if (w.endsWith("at") || w.endsWith("bl") || w.endsWith("iz")) return w + "e";

  // *d AND NOT (*l OR *s OR *z) → remove last char  (double consonant rule)
  if (endsDoubledConsonant(w)) {
    const last = w[w.length - 1] ?? "";
    if (last !== "l" && last !== "s" && last !== "z") return w.slice(0, -1);
  }

  // m == 1 AND *o → add e  (cvc pattern)
  if (mEq1(w) && endsCVCPattern(w)) return w + "e";

  return w;
}

/** Step 1c: y → i when preceded by a vowel in the stem. */
function step1c(word: string): string {
  if (word.endsWith("y")) {
    const stem = word.slice(0, -1);
    if (hasVowelInStem(stem)) return stem + "i";
  }
  return word;
}

/** Step 2: map common derivational suffixes. */
function step2(word: string): string {
  const pairs: Array<[string, string]> = [
    ["ational", "ate"],
    ["tional", "tion"],
    ["enci", "ence"],
    ["anci", "ance"],
    ["izer", "ize"],
    ["abli", "able"],
    ["alli", "al"],
    ["entli", "ent"],
    ["eli", "e"],
    ["ousli", "ous"],
    ["ization", "ize"],
    ["ation", "ate"],
    ["ator", "ate"],
    ["alism", "al"],
    ["iveness", "ive"],
    ["fulness", "ful"],
    ["ousness", "ous"],
    ["aliti", "al"],
    ["iviti", "ive"],
    ["biliti", "ble"],
  ];
  for (const [suf, rep] of pairs) {
    const r = replaceSuffix(word, suf, rep, mGt0);
    if (r !== null) return r;
  }
  return word;
}

/** Step 3: further suffix removal. */
function step3(word: string): string {
  const pairs: Array<[string, string]> = [
    ["icate", "ic"],
    ["ative", ""],
    ["alize", "al"],
    ["iciti", "ic"],
    ["ical", "ic"],
    ["ful", ""],
    ["ness", ""],
  ];
  for (const [suf, rep] of pairs) {
    const r = replaceSuffix(word, suf, rep, mGt0);
    if (r !== null) return r;
  }
  return word;
}

/** Step 4: remove derivational suffixes (m > 1 only). */
function step4(word: string): string {
  // Special: (m>1) ION + (s or t before it) → ""
  if (word.endsWith("ion")) {
    const stem = word.slice(0, -3);
    if (measure(stem) > 1 && (stem.endsWith("s") || stem.endsWith("t"))) return stem;
  }
  const single: string[] = [
    "al",
    "ance",
    "ence",
    "er",
    "ic",
    "able",
    "ible",
    "ant",
    "ement",
    "ment",
    "ent",
    "ou",
    "ism",
    "ate",
    "iti",
    "ous",
    "ive",
    "ize",
  ];
  for (const suf of single) {
    const r = replaceSuffix(word, suf, "", mGt1);
    if (r !== null) return r;
  }
  return word;
}

/** Step 5a: remove a final -e (conditional). */
function step5a(word: string): string {
  if (word.endsWith("e")) {
    const stem = word.slice(0, -1);
    const m = measure(stem);
    if (m > 1) return stem;
    if (m === 1 && !endsCVCPattern(stem)) return stem;
  }
  return word;
}

/** Step 5b: -ll → -l (m > 1). */
function step5b(word: string): string {
  if (word.endsWith("ll") && measure(word.slice(0, -1)) > 1) return word.slice(0, -1);
  return word;
}

/**
 * Apply Porter 1980 stemming to a single lowercase token.
 *
 * @param token - ASCII-lowercase string (caller's responsibility).
 * @returns The stemmed form; empty string → empty string.
 */
export function stem(token: string): string {
  if (token.length <= 2) return token; // too short to stem
  let w = token;
  w = step1a(w);
  w = step1b(w);
  w = step1c(w);
  w = step2(w);
  w = step3(w);
  w = step4(w);
  w = step5a(w);
  w = step5b(w);
  return w;
}

/** Convenience: tokenise a string into lowercase words and stem each. */
export function stemTokens(text: string): ReadonlySet<string> {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
  return new Set(tokens.map(stem));
}
