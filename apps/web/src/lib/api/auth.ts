// API client for authentication service

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    schoolId: number;
  };
  school?: {
    id: number;
    name: string;
    slug: string;
    subscriptionTier: string;
    isActive: boolean;
    trialStartDate: string;
    trialEndDate: string;
    trialDaysRemaining: number;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface VerifyTokenResponse {
  success: boolean;
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    schoolId: number;
  };
  school?: {
    id: number;
    name: string;
    slug: string;
    subscriptionTier: string;
  };
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || 'Login failed');
  }

  return response.json();
}

export async function verifyToken(token: string): Promise<VerifyTokenResponse> {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/verify`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Token verification failed');
  }

  return response.json();
}

// Token management utilities
export const TokenManager = {
  setTokens(accessToken: string, refreshToken: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  },

  getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  },

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  },

  clearTokens() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('school');
    }
  },

  setUserData(user: any, school: any) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('school', JSON.stringify(school));
    }
  },

  getUserData() {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      const school = localStorage.getItem('school');
      return {
        user: user ? JSON.parse(user) : null,
        school: school ? JSON.parse(school) : null,
      };
    }
    return { user: null, school: null };
  },
};
