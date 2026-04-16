module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@services': './src/services',
            '@store': './src/store',
            '@hooks': './src/hooks',
            '@types': './src/types',
            '@utils': './src/utils',
          },
        },
      ],
    ],
  };
};
