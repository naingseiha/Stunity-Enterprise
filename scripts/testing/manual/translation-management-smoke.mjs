#!/usr/bin/env node

const AUTH_SERVICE_URL = (process.env.AUTH_SERVICE_URL || process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001').replace(/\/$/, '');
const AUTH_TOKEN = process.env.AUTH_TOKEN || process.env.STUNITY_ADMIN_TOKEN || '';
const LOCALE = process.env.TRANSLATION_SMOKE_LOCALE || 'km';
const KEY = process.env.TRANSLATION_SMOKE_KEY || 'common.post';
const TEST_VALUE = process.env.TRANSLATION_SMOKE_VALUE || `SMOKE_TRANSLATION_${Date.now()}`;
const APPS = (process.env.TRANSLATION_SMOKE_APPS || 'web,mobile')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${AUTH_SERVICE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed with ${res.status}: ${text}`);
  }
  return body;
}

async function getPublicValue(app, locale, key) {
  const payload = await request(`/auth/translations/${app}/${locale}`);
  return payload?.data?.[key];
}

async function main() {
  assert(AUTH_TOKEN, 'Set AUTH_TOKEN or STUNITY_ADMIN_TOKEN to a Super Admin access token.');
  assert(APPS.length > 0, 'TRANSLATION_SMOKE_APPS must include at least one app.');

  console.log(`Translation smoke test against ${AUTH_SERVICE_URL}`);
  console.log(`Locale: ${LOCALE}`);
  console.log(`Key: ${KEY}`);
  console.log(`Apps: ${APPS.join(', ')}`);

  await request('/auth/translations/sync', { method: 'POST' });

  const originals = new Map();
  for (const app of APPS) {
    originals.set(app, await getPublicValue(app, LOCALE, KEY));
  }

  try {
    await request('/auth/translations/bulk', {
      method: 'POST',
      body: JSON.stringify({
        translations: APPS.map((app) => ({
          app,
          locale: LOCALE,
          key: KEY,
          value: `${TEST_VALUE}_${app}`,
        })),
      }),
    });

    for (const app of APPS) {
      const expected = `${TEST_VALUE}_${app}`;
      const actual = await getPublicValue(app, LOCALE, KEY);
      assert(actual === expected, `${app}/${LOCALE}/${KEY} expected "${expected}" but received "${actual}"`);
      console.log(`✓ ${app}/${LOCALE}/${KEY} updated`);
    }
  } finally {
    await request('/auth/translations/bulk', {
      method: 'POST',
      body: JSON.stringify({
        translations: APPS.map((app) => ({
          app,
          locale: LOCALE,
          key: KEY,
          value: originals.get(app) ?? '',
        })),
      }),
    });
    console.log('✓ Original values restored');
  }

  console.log('Translation management smoke test passed.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
