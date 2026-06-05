// Jest config for the mobile app. Uses the jest-expo preset (RN/Expo SDK 52),
// which wires the React Native transform, jsdom-free RN environment, and mocks
// for most expo-* native modules. Module aliases mirror tsconfig.json paths so
// imports like "@/services/token" resolve in tests exactly as in the app.
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@styles/(.*)$': '<rootDir>/src/styles/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  // Only treat files under __tests__ or *.test.* as tests (so fixtures/helpers
  // placed next to them aren't picked up as suites).
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/*.test.[jt]s?(x)'],
  // NOTE: transformIgnorePatterns is intentionally NOT set — the jest-expo
  // preset ships a comprehensive list (incl. expo-modules-core + monorepo
  // paths). Overriding it broke expo-modules-core transformation. Extend the
  // preset's value here only if a specific untranspiled dep surfaces.
};
