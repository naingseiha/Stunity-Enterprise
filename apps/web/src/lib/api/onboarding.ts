import { TokenManager } from './auth';
import { SCHOOL_SERVICE_URL } from './config';

export interface OnboardingChecklist {
  registrationDone?: boolean;
  calendarDone?: boolean;
  subjectsDone?: boolean;
  teachersAdded?: boolean;
  classesCreated?: boolean;
  studentsAdded?: boolean;
  currentStep?: number;
}

export interface OnboardingStatus {
  checklist: OnboardingChecklist;
  school?: {
    id?: string;
    registrationStatus?: string;
  };
  [key: string]: unknown;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

function requiredAuthHeaders(includeJson = false): HeadersInit {
  const accessToken = TokenManager.getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication is required to continue onboarding');
  }

  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${accessToken}`,
  };
}

async function readApiResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const result = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || result?.message || fallbackMessage);
  }
  return result.data;
}

export async function getOnboardingStatus(schoolId: string): Promise<OnboardingStatus> {
  const response = await fetch(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/onboarding/status`, {
    headers: requiredAuthHeaders(),
  });
  return readApiResponse(response, 'Failed to load onboarding status');
}

export async function saveOnboardingStep(
  schoolId: string,
  input: { step: string; completed: boolean; skipped: boolean }
): Promise<unknown> {
  const response = await fetch(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/onboarding/step`, {
    method: 'PUT',
    headers: requiredAuthHeaders(true),
    body: JSON.stringify(input),
  });
  return readApiResponse(response, 'Failed to update onboarding progress');
}

export async function completeOnboarding(schoolId: string): Promise<unknown> {
  const response = await fetch(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/onboarding/complete`, {
    method: 'POST',
    headers: requiredAuthHeaders(),
  });
  return readApiResponse(response, 'Failed to complete onboarding');
}
