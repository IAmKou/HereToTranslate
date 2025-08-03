const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/server'),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      sourceMap: true,
      compiler: 'tsc',
      main: 'apps/server/src/main.ts',
      tsConfig: 'apps/server/tsconfig.app.json',
      assets: [
        'apps/server/src/assets',
        'apps/server/src/mailer'
      ],
      optimization: false,
      outputHashing: 'none',
      useTsconfigPaths: true,
      generatePackageJson: true,
    }),
  ],
  resolve: {
    alias: []
  }
};
