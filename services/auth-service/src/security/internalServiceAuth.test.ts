import assert from 'node:assert/strict';
import test from 'node:test';

import { requireInternalServiceToken } from './internalServiceAuth';

function responseRecorder() {
  const state: { status?: number; body?: unknown } = {};
  return {
    state,
    response: {
      status(code: number) {
        state.status = code;
        return this;
      },
      json(body: unknown) {
        state.body = body;
        return this;
      },
    },
  };
}

test('internal notification bridge fails closed when no token is configured', (t) => {
  const previous = process.env.NOTIFICATION_SERVICE_AUTH_TOKEN;
  delete process.env.NOTIFICATION_SERVICE_AUTH_TOKEN;
  t.after(() => {
    if (previous === undefined) delete process.env.NOTIFICATION_SERVICE_AUTH_TOKEN;
    else process.env.NOTIFICATION_SERVICE_AUTH_TOKEN = previous;
  });

  const recorder = responseRecorder();
  let nextCalls = 0;
  requireInternalServiceToken({ headers: {} } as any, recorder.response as any, () => { nextCalls += 1; });
  assert.equal(recorder.state.status, 503);
  assert.equal(nextCalls, 0);
});

test('internal notification bridge uses timing-safe exact token matching', (t) => {
  const previous = process.env.NOTIFICATION_SERVICE_AUTH_TOKEN;
  process.env.NOTIFICATION_SERVICE_AUTH_TOKEN = 'service-secret';
  t.after(() => {
    if (previous === undefined) delete process.env.NOTIFICATION_SERVICE_AUTH_TOKEN;
    else process.env.NOTIFICATION_SERVICE_AUTH_TOKEN = previous;
  });

  const denied = responseRecorder();
  requireInternalServiceToken(
    { headers: { 'x-service-token': 'wrong' } } as any,
    denied.response as any,
    () => assert.fail('wrong token must not call next'),
  );
  assert.equal(denied.state.status, 401);

  const allowed = responseRecorder();
  let nextCalls = 0;
  requireInternalServiceToken(
    { headers: { 'x-service-token': 'service-secret' } } as any,
    allowed.response as any,
    () => { nextCalls += 1; },
  );
  assert.equal(nextCalls, 1);
  assert.equal(allowed.state.status, undefined);
});
