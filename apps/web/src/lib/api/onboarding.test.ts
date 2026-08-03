import { TokenManager } from './auth';
import { completeOnboarding, getOnboardingStatus, saveOnboardingStep } from './onboarding';

describe('onboarding API authentication', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('refuses to call an onboarding endpoint without an access token', async () => {
    jest.spyOn(TokenManager, 'getAccessToken').mockReturnValue(null);
    const fetchSpy = jest.spyOn(global, 'fetch');

    await expect(getOnboardingStatus('school-1')).rejects.toThrow('Authentication is required');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('loads status with the bearer token', async () => {
    jest.spyOn(TokenManager, 'getAccessToken').mockReturnValue('access-token');
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { checklist: { currentStep: 2 } } }),
    } as Response);

    await expect(getOnboardingStatus('school-1')).resolves.toEqual({ checklist: { currentStep: 2 } });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/schools/school-1/onboarding/status'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer access-token' }) })
    );
  });

  it('authenticates progress updates and completion', async () => {
    jest.spyOn(TokenManager, 'getAccessToken').mockReturnValue('access-token');
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    } as Response);

    await saveOnboardingStep('school-1', { step: 'calendar', completed: true, skipped: false });
    await completeOnboarding('school-1');

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/schools/school-1/onboarding/step'),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      })
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/schools/school-1/onboarding/complete'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      })
    );
  });
});
