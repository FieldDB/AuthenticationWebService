module.exports = {
  exclude: [
    'coverage',
    'public',
    'test',
    'db',
  ],
  'check-coverage': true,
  branches: 64,
  functions: 65,
  lines: 76,
  statements: 76,
  reporter: ['html', 'text', 'lcov'],
};
