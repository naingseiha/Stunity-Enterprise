// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all Expo defaults plus the monorepo root.
config.watchFolders = Array.from(new Set([...(config.watchFolders || []), workspaceRoot]));

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. SVG transformer — allows importing .svg files as React components
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
