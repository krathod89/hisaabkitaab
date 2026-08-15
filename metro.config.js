// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build ships a WASM module that Metro must treat as an asset.
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// expo-sqlite on web uses the synchronous API via SharedArrayBuffer, which the
// browser only exposes in a cross-origin-isolated context. Send COOP/COEP on
// every dev-server response so SharedArrayBuffer is defined and openDatabaseSync
// works. (A production host must send the same two headers.)
config.server = config.server || {};
const prevEnhance = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const base = prevEnhance ? prevEnhance(middleware, server) : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    return base(req, res, next);
  };
};

module.exports = config;
