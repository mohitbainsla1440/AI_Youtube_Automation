const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Stub out native-only packages on web so they don't break the web bundle.
const NATIVE_ONLY_PACKAGES = [
  '@stripe/stripe-react-native',
  'lottie-react-native',
  'react-native-mmkv',
  'react-native-draggable-flatlist',
];

const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    NATIVE_ONLY_PACKAGES.some(
      (pkg) => moduleName === pkg || moduleName.startsWith(pkg + '/'),
    )
  ) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/utils/nativeStub.js'),
    };
  }
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
