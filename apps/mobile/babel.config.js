module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@api': './src/api',
            '@assets': './src/assets',
            '@components': './src/components',
            '@config': './src/config',
            '@constants': './src/constants',
            '@contexts': './src/contexts',
            '@hooks': './src/hooks',
            '@navigation': './src/navigation',
            '@screens': './src/screens',
            '@services': './src/services',
            '@stores': './src/stores',
            '@styles': './src/styles',
            '@types': './src/types',
            '@utils': './src/utils',
          },
        },
      ],
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          blacklist: null,
          whitelist: null,
          safe: false,
          allowUndefined: true,
        },
      ],
      'react-native-reanimated/plugin',
    ],
    // Production-only transforms. Babel sets BABEL_ENV/NODE_ENV to "production"
    // for release bundles (EAS / `expo export`), so this block is skipped by
    // the Metro dev server, which keeps every console call. The `env` key is
    // resolved by Babel itself, so it works correctly alongside api.cache(true).
    env: {
      production: {
        plugins: [
          // Strip console.log/info/debug from production bundles to cut noise
          // and avoid leaking diagnostics. error + warn are kept on purpose so
          // crash reporting (Sentry) and breadcrumbs still see them.
          ['transform-remove-console', { exclude: ['error', 'warn'] }],
        ],
      },
      test: {
        plugins: [
          // Jest can't execute real dynamic import() without
          // --experimental-vm-modules; this rewrites import() to a
          // require()-based promise so modules that lazy-import to break circular
          // deps (e.g. services/token → api/client) load under jest.
          'dynamic-import-node',
        ],
      },
    },
  };
};
