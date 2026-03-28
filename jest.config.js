const path = require('path');

module.exports = {
  testEnvironment: 'node',
  rootDir: path.resolve(__dirname),
  roots: [path.resolve(__dirname, 'src')],
  setupFiles: [path.resolve(__dirname, 'src/tests/setup.js')],
  testMatch: ['**/*.test.js'],
  coverageDirectory: path.resolve(__dirname, 'coverage'),
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**'
  ]
};
