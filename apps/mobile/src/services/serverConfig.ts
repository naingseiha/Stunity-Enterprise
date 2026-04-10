import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ENV,
  Config,
  applyRuntimeApiHostOverride,
  getBuildTimeApiHost,
  getEffectiveApiHost,
  getRuntimeApiHostOverride,
  normalizeApiHostInput,
} from '@/config/env';
import { reconfigureApiClients } from '@/api/client';

const API_HOST_OVERRIDE_KEY = 'stunity:runtime-api-host-override';

export interface ServerConfigSnapshot {
  environment: string;
  buildTimeHost: string | null;
  overrideHost: string | null;
  effectiveHost: string | null;
  urls: {
    auth: string;
    feed: string;
    clubs: string;
    notification: string;
    analytics: string;
  };
}

const buildSnapshot = (): ServerConfigSnapshot => ({
  environment: ENV,
  buildTimeHost: ENV === 'development' ? getBuildTimeApiHost() : null,
  overrideHost: getRuntimeApiHostOverride(),
  effectiveHost: getEffectiveApiHost(),
  urls: {
    auth: Config.authUrl,
    feed: Config.feedUrl,
    clubs: Config.clubUrl,
    notification: Config.notificationUrl,
    analytics: Config.analyticsUrl,
  },
});

export const getServerConfigSnapshot = (): ServerConfigSnapshot => buildSnapshot();

export const hydrateServerHostOverride = async (): Promise<ServerConfigSnapshot> => {
  if (ENV !== 'development') return buildSnapshot();

  const savedHost = (await AsyncStorage.getItem(API_HOST_OVERRIDE_KEY))?.trim() || null;
  if (!savedHost) return buildSnapshot();

  const applied = applyRuntimeApiHostOverride(savedHost);
  if (applied) {
    reconfigureApiClients();
    return buildSnapshot();
  }

  await AsyncStorage.removeItem(API_HOST_OVERRIDE_KEY);
  return buildSnapshot();
};

export const setRuntimeServerHost = async (input: string): Promise<ServerConfigSnapshot> => {
  if (ENV !== 'development') {
    throw new Error('Runtime host override is only available in development environment.');
  }

  const normalizedHost = normalizeApiHostInput(input);
  if (!normalizedHost) {
    throw new Error('Please enter a valid host or IP address.');
  }

  const applied = applyRuntimeApiHostOverride(normalizedHost);
  if (!applied) {
    throw new Error('Unable to apply runtime host override.');
  }

  await AsyncStorage.setItem(API_HOST_OVERRIDE_KEY, normalizedHost);
  reconfigureApiClients();
  return buildSnapshot();
};

export const clearRuntimeServerHost = async (): Promise<ServerConfigSnapshot> => {
  if (ENV !== 'development') return buildSnapshot();

  await AsyncStorage.removeItem(API_HOST_OVERRIDE_KEY);
  applyRuntimeApiHostOverride(null);
  reconfigureApiClients();
  return buildSnapshot();
};

const fetchWithTimeout = async (url: string, timeoutMs = 5000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { method: 'GET', signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const testServerConnection = async (): Promise<{
  ok: boolean;
  checks: Array<{ name: string; url: string; status: number | null }>;
}> => {
  const targets = [
    { name: 'auth', url: `${Config.authUrl}/health` },
    { name: 'feed', url: `${Config.feedUrl}/health` },
    { name: 'notification', url: `${Config.notificationUrl}/health` },
  ];

  const checks = await Promise.all(
    targets.map(async (target) => {
      try {
        const response = await fetchWithTimeout(target.url, 5000);
        return { name: target.name, url: target.url, status: response.status };
      } catch {
        return { name: target.name, url: target.url, status: null };
      }
    })
  );

  const ok = checks.every((check) => check.status !== null && check.status >= 200 && check.status < 500);
  return { ok, checks };
};
