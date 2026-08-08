import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_DEVICE_ID_KEY = '@stunity/auth-device-id';

/**
 * Stable per-install device identifier used for auth session binding and OTP
 * abuse limits. Intentionally retained across logout.
 */
export async function getAuthDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(AUTH_DEVICE_ID_KEY);
  if (existing) return existing;
  const created = `mobile_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
  await AsyncStorage.setItem(AUTH_DEVICE_ID_KEY, created);
  return created;
}
