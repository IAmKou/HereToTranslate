const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  target: 'node',
  entry: join(__dirname, '../../apps/server/src/main.ts'),
  output: {
    path: join(__dirname, '../../dist/apps/server'),
    filename: 'main.js',
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: [],
  },
  module: {
    rules: [
      {
        test: /\.hbs$/,
        use: 'raw-loader',
      },
    ],
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: 'apps/server/src/main.ts',
      tsConfig: 'apps/server/tsconfig.app.json',
      outputHashing: 'none',
      generatePackageJson: false,
      externalDependencies: 'all',
      assets: [
        'apps/server/src/assets',
        'apps/server/src/mailer'
      ],
      optimization: true,
      useTsconfigPaths: true,
    }),
  ],
};
