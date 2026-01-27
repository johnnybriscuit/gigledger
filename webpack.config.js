const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Add tslib alias to fix module interop issue
  config.resolve.alias = {
    ...config.resolve.alias,
    tslib: path.resolve(__dirname, 'src/shims/tslib.ts'),
  };

  return config;
};
