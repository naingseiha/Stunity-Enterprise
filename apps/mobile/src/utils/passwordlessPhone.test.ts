import { normalizePhonePreview } from './passwordlessPhone';

describe('normalizePhonePreview', () => {
  it('normalizes Cambodia local numbers', () => {
    expect(normalizePhonePreview('012 345 678')).toBe('+85512345678');
    expect(normalizePhonePreview('855-12-345-678')).toBe('+85512345678');
  });

  it('preserves explicit international numbers', () => {
    expect(normalizePhonePreview('(+1) 415-555-2671')).toBe('+14155552671');
    expect(normalizePhonePreview('00 44 20 7946 0958')).toBe('+442079460958');
  });

  it('rejects incomplete or invalid input', () => {
    expect(normalizePhonePreview('not-a-phone')).toBeNull();
    expect(normalizePhonePreview('123')).toBeNull();
  });
});
