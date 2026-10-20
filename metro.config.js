const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.platforms = ["web", "ios", "android"];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  path: require.resolve("path-browserify"),
  "heic-convert": require.resolve("./heic-convert-shim.js"),
};

module.exports = config;
