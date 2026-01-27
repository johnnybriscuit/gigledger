const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const tslibShimPath = path.join(__dirname, "src/shims/tslib-default.cjs");

config.resolver = config.resolver || {};
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Intercept only these (do NOT intercept tslib/tslib.js)
  if (moduleName === "tslib" || moduleName === "tslib/tslib.es6.js") {
    return { filePath: tslibShimPath, type: "sourceFile" };
  }

  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
