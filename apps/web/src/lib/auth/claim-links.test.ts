import { buildClaimDeepLink } from './claim-links';

describe('buildClaimDeepLink', () => {
  it('emits the canonical claim route and URL-encodes the code', () => {
    expect(buildClaimDeepLink(' stnt-abcd-2345 ')).toBe('stunity://claim?code=STNT-ABCD-2345');
    expect(buildClaimDeepLink('STNT-ABCD-23 45')).toBe('stunity://claim?code=STNT-ABCD-23%2045');
  });
});
