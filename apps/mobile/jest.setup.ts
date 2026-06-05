/**
 * Global test setup (runs after the jest-expo preset, before each test file).
 *
 * Mocks native modules that have no JS implementation under Node so unit tests
 * can import app code freely. Add a mock here only when a test actually pulls a
 * native dependency in transitively — keep it lean.
 */

// react-native-reanimated ships an official jest mock.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// expo-secure-store: in-memory backing so token-storage logic is testable.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn(async (k: string) => (store.has(k) ? store.get(k)! : null)),
    setItemAsync: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
    deleteItemAsync: jest.fn(async (k: string) => { store.delete(k); }),
  };
});

// expo-haptics: no-op (tests don't assert on haptics).
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
