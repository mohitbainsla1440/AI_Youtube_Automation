// Web stub for native-only packages (Stripe, Lottie, MMKV, etc.)
// These packages use native modules that don't exist in a browser environment.
// The actual implementations run on iOS/Android.

module.exports = new Proxy(
  {},
  {
    get: (_, prop) => {
      // Return no-op functions / null for any property access
      if (prop === '__esModule') return true;
      if (prop === 'default') return {};
      return () => null;
    },
  },
);
