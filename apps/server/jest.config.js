/* eslint-disable */
const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8')
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'server',
  preset: '../../jest.preset.js',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@octokit|@octokit/rest|@octokit/core|@octokit/request|@octokit/types|@octokit/auth-token|@octokit/graphql|@octokit/plugin-rest-endpoint-methods|@octokit/plugin-paginate-rest|@octokit/plugin-request-log|@octokit/plugin-retry|universal-user-agent|before-after-hook)/)',
  ],
  moduleFileExtensions: ['ts', 'js', 'html'],
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[tj]s?(x)',
    '<rootDir>/test/**/*.spec.ts',
  ],
};
