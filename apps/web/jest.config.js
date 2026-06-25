const { createDefaultPreset } = require('ts-jest');

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: 'node',
  transform: {
    ...tsJestTransformCfg,
  },
  // Only run our hand-written unit tests, not anything under .next/node_modules.
  testMatch: ['<rootDir>/src/**/*.test.ts'],
};
