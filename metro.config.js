const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force tslib to resolve to CommonJS build to fix interop issues
// Some bundled code expects tslib as CommonJS default (n.default.__extends)
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules || {}),
    tslib: path.resolve(__dirname, 'node_modules/tslib'),
  },
};

module.exports = config;
