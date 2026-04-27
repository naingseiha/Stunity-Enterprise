module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./apps/mobile'],
          alias: {
            '@': './apps/mobile/src',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
