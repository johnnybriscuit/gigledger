const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// tslib is now a direct dependency - no alias needed

module.exports = config;
