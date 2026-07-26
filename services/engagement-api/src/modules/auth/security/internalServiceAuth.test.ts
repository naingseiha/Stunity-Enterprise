import assert from 'node:assert/strict';
import test from 'node:test';
import { requireInternalServiceToken } from './internalServiceAuth';

function responseDouble() {
  const response: any = {};
  response.status = (statusCode: number) => {
    response.statusCode = statusCode;
    return response;
  };
  response.json = (body: unknown) => {
    response.body = body;
    return response;
  };
  return response;
}

test('rejects notification requests when the service secret is missing', () => {
  const previous = process.env.NOTIFICATION_SERVICE_AUTH_TOKEN;
  delete process.env.NOTIFICATION_SERVICE_AUTH_TOKEN;
  try {
    const res = responseDouble();
    let called = false;
    requireInternalServiceToken({ headers: {} } as any, res, () => { called = true; });
    assert.equal(res.statusCode, 503);
    assert.equal(called, false);
  } finally {
    if (previous === undefined) delete process.env.NOTIFICATION_SERVICE_AUTH_TOKEN;
    else process.env.NOTIFICATION_SERVICE_AUTH_TOKEN = previous;
  }
});

test('accepts only the configured service token', () => {
  const previous = process.env.NOTIFICATION_SERVICE_AUTH_TOKEN;
  process.env.NOTIFICATION_SERVICE_AUTH_TOKEN = 'service-secret';
  try {
    const wrong = responseDouble();
    requireInternalServiceToken({ headers: { 'x-service-token': 'wrong' } } as any, wrong, () => {});
    assert.equal(wrong.statusCode, 401);

    const valid = responseDouble();
    let called = false;
    requireInternalServiceToken(
      { headers: { 'x-service-token': 'service-secret' } } as any,
      valid,
      () => { called = true; },
    );
    assert.equal(called, true);
    assert.equal(valid.statusCode, undefined);
  } finally {
    if (previous === undefined) delete process.env.NOTIFICATION_SERVICE_AUTH_TOKEN;
    else process.env.NOTIFICATION_SERVICE_AUTH_TOKEN = previous;
  }
});
