const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

const defaultAssetExts = config.resolver.assetExts || [];
const defaultSourceExts = config.resolver.sourceExts || [];

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: defaultAssetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...defaultSourceExts, 'svg'],
};

module.exports = config;
