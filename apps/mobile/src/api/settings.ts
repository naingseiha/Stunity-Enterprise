import { authApi } from './client';
import type { AppPreferences } from '@/services/appPreferences';

type AppSettingsResponse = {
  success: boolean;
  data: AppPreferences;
};

export const fetchAppSettings = async (): Promise<AppPreferences> => {
  const { data } = await authApi.get<AppSettingsResponse>('/users/me/app-settings');
  return data.data;
};

export const updateAppSettings = async (
  updates: Partial<AppPreferences>
): Promise<AppPreferences> => {
  const { data } = await authApi.patch<AppSettingsResponse>('/users/me/app-settings', updates);
  return data.data;
};
