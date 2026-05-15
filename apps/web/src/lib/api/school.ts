import { SCHOOL_SERVICE_URL } from './config';
import { TokenManager } from './auth';

export const schoolAPI = {
  getProfile: async (schoolId: string) => {
    const token = TokenManager.getAccessToken();
    const response = await fetch(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch school profile');
    }

    return response.json();
  },

  updateProfile: async (schoolId: string, data: any) => {
    const token = TokenManager.getAccessToken();
    const response = await fetch(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update school profile');
    }

    return response.json();
  },
};
