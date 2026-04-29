import { TokenManager } from './auth';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';

export interface Translation {
  id: string;
  app: string;
  locale: string;
  key: string;
  value: string;
  defaultValue?: string | null;
  updatedAt: string;
}

export interface TranslationLocale {
  locale: string;
  label: string;
  nativeLabel: string;
  count: number;
}

export const translationApi = {
  /**
   * Fetch all translations (Admin only)
   */
  async getAll(): Promise<{ data: Translation[] }> {
    const token = TokenManager.getAccessToken();
    const res = await fetch(`${AUTH_SERVICE_URL}/auth/translations/admin/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch translations');
    return res.json();
  },

  /**
   * Fetch translations for a specific app and locale
   */
  async getAppTranslations(app: string, locale: string): Promise<{ data: Record<string, string> }> {
    const res = await fetch(`${AUTH_SERVICE_URL}/auth/translations/${app}/${locale}`);
    if (!res.ok) throw new Error('Failed to fetch app translations');
    return res.json();
  },

  /**
   * Fetch locales that have translations for a specific app
   */
  async getLocales(app: string): Promise<{ data: TranslationLocale[] }> {
    const res = await fetch(`${AUTH_SERVICE_URL}/auth/translations/locales/${app}`);
    if (!res.ok) throw new Error('Failed to fetch translation locales');
    return res.json();
  },

  /**
   * Update a translation entry
   */
  async update(data: { app: string; locale: string; key: string; value: string }): Promise<{ success: boolean }> {
    const token = TokenManager.getAccessToken();
    const res = await fetch(`${AUTH_SERVICE_URL}/auth/translations/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update translation');
    return res.json();
  },

  /**
   * Bulk update translations
   */
  async bulkUpdate(translations: Array<{ app: string; locale: string; key: string; value: string }>): Promise<{ success: boolean; count: number }> {
    const token = TokenManager.getAccessToken();
    const res = await fetch(`${AUTH_SERVICE_URL}/auth/translations/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ translations })
    });
    if (!res.ok) throw new Error('Failed to bulk update translations');
    return res.json();
  },

  /**
   * Sync default translations from local files to database
   */
  async sync(): Promise<{ success: boolean; count: number; created?: number; preserved?: number; scanned?: number }> {
    const token = TokenManager.getAccessToken();
    const res = await fetch(`${AUTH_SERVICE_URL}/auth/translations/sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error('Failed to sync translations');
    return res.json();
  }
};
