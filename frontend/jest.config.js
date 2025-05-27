
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/cypress/',
  ],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      stringifyContentPathRegex: '\.(html|svg)$'
    }
  },
  coverageDirectory: '<rootDir>/coverage/frontend',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!**/*.module.ts',
    '!**/*.routes.ts',
    '!**/main.ts',
    '!**/polyfills.ts',
    '!**/environment*.ts',
  ]
};
