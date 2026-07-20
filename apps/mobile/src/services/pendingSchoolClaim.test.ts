import * as SecureStore from 'expo-secure-store';
import {
  clearPendingSchoolClaim,
  extractClaimCode,
  getPendingSchoolClaim,
  PENDING_SCHOOL_CLAIM_TTL_MS,
  savePendingSchoolClaim,
} from './pendingSchoolClaim';

const secureStore = SecureStore as jest.Mocked<typeof SecureStore> & { __store: Map<string, string> };

describe('pending school claim', () => {
  beforeEach(async () => {
    secureStore.__store.clear();
    jest.clearAllMocks();
  });

  it('extracts canonical codes from manual, query, and path values', () => {
    expect(extractClaimCode('stnt-abcd-2345')).toBe('STNT-ABCD-2345');
    expect(extractClaimCode('stunity://claim?code=TCHR-WXYZ-6789')).toBe('TCHR-WXYZ-6789');
    expect(extractClaimCode('https://stunity.app/claim/STAF-AB23-CD45')).toBe('STAF-AB23-CD45');
    expect(extractClaimCode('not-a-claim')).toBeNull();
  });

  it('stores the claim in secure storage with a short expiry', async () => {
    const pending = await savePendingSchoolClaim('PRNT-ABCD-2345', 1_000);
    expect(pending).toEqual({
      code: 'PRNT-ABCD-2345',
      capturedAt: 1_000,
      expiresAt: 1_000 + PENDING_SCHOOL_CLAIM_TTL_MS,
    });
    await expect(getPendingSchoolClaim(2_000)).resolves.toEqual(pending);
  });

  it('removes expired and malformed values', async () => {
    await savePendingSchoolClaim('STNT-ABCD-2345', 1_000);
    await expect(getPendingSchoolClaim(1_000 + PENDING_SCHOOL_CLAIM_TTL_MS)).resolves.toBeNull();

    await SecureStore.setItemAsync('stunity.pending-school-claim.v1', '{bad json');
    await expect(getPendingSchoolClaim()).resolves.toBeNull();
  });

  it('can be explicitly cancelled', async () => {
    await savePendingSchoolClaim('STNT-ABCD-2345', 1_000);
    await clearPendingSchoolClaim();
    await expect(getPendingSchoolClaim(2_000)).resolves.toBeNull();
  });
});
