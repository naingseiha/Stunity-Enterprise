import assert from 'node:assert/strict';
import test from 'node:test';
import { isQuizWarEnabled } from './featureFlags';

test('Quiz War is disabled unless explicitly enabled', () => {
  assert.equal(isQuizWarEnabled({}), false);
  assert.equal(isQuizWarEnabled({ QUIZ_WAR_ENABLED: 'false' }), false);
  assert.equal(isQuizWarEnabled({ QUIZ_WAR_ENABLED: 'true' }), true);
});
