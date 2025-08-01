const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/server'),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      sourceMap: false,
      compiler: 'tsc',
      main: 'apps/server/src/main.ts',
      tsConfig: 'apps/server/tsconfig.app.json',
      assets: [
        'apps/server/src/assets',
        'apps/server/src/mailer'
      ],
      optimization: true,
      outputHashing: 'none',
      useTsconfigPaths: true,
      generatePackageJson: false,
      externalDependencies: 'none', // Bundle all dependencies
    }),
  ],
  resolve: {
    alias: []
  }
}; 