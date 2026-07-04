import { hasMalformedKhmerText } from './khmerText';

describe('hasMalformedKhmerText', () => {
    it('returns false for well-formed Khmer prose', () => {
        expect(hasMalformedKhmerText('សួស្តី តើអ្នកសុខសប្បាយទេ? សមីការគឺ x = 3។')).toBe(false);
    });

    it('returns false for plain English text', () => {
        expect(hasMalformedKhmerText('The quick brown fox jumps over the lazy dog.')).toBe(false);
    });

    it('returns false for mixed English + correct Khmer', () => {
        expect(hasMalformedKhmerText('The answer is ចម្លើយគឺ 3.')).toBe(false);
    });

    it('detects an isolated dependent vowel sign with no preceding base consonant', () => {
        expect(hasMalformedKhmerText('hello ាworld')).toBe(true);
    });

    it('detects a dependent vowel sign at the very start of the string', () => {
        expect(hasMalformedKhmerText('ាសួស្តី')).toBe(true);
    });

    it('detects Cyrillic letters fused into a Khmer word', () => {
        expect(hasMalformedKhmerText('ស្វាППាដាក់')).toBe(true);
    });

    it('does not flag standalone Cyrillic text with no adjacent Khmer', () => {
        expect(hasMalformedKhmerText('Привет мир')).toBe(false);
    });
});
