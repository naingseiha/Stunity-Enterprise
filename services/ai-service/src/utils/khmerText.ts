/**
 * Khmer Text Validator
 *
 * Detects script corruption patterns seen from LLM-generated Khmer:
 * isolated combining diacritics with no base consonant, and foreign
 * (e.g. Cyrillic) letters fused directly into a Khmer word. Used to
 * catch a bad tutor answer before it reaches the student so it can be
 * retried once with a stricter prompt.
 */

// Khmer base characters a dependent vowel/diacritic can legally attach to:
// consonants + independent vowels (U+1780-U+17B5), plus any other dependent
// vowel/diacritic (Khmer allows vowel + toneless-mark stacking).
const KHMER_BASE = /[ក-៓]/;
// Dependent vowel signs and diacritical/toneless marks (U+17B6-U+17D3) —
// these always attach to a preceding base character and never stand alone.
const KHMER_DEPENDENT = /[ា-៓]/;
const CYRILLIC = /[Ѐ-ӿ]/;

export function hasMalformedKhmerText(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (KHMER_DEPENDENT.test(ch)) {
            const prev = text[i - 1];
            if (!prev || !KHMER_BASE.test(prev)) {
                return true;
            }
        }
    }

    if (CYRILLIC.test(text)) {
        for (let i = 0; i < text.length; i++) {
            if (!CYRILLIC.test(text[i])) continue;
            const prev = text[i - 1];
            const next = text[i + 1];
            if ((prev && KHMER_BASE.test(prev)) || (next && KHMER_BASE.test(next))) {
                return true;
            }
        }
    }

    return false;
}
