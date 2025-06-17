module.exports = {
  // Test environment configuration
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/'
  ],
  
  // Setup files
  setupFiles: [
    '<rootDir>/tests/setup/env.js'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/database.js',
    '<rootDir>/tests/setup/auth.js'
  ],
  
  // Module paths
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/backend/src/$1',
    '^@frontend/(.*)$': '<rootDir>/frontend/src/$1',
    '^@mobile/(.*)$': '<rootDir>/mobile/src/$1',
    '^@contracts/(.*)$': '<rootDir>/smart-contracts/contracts/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  
  // Test suites organization
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/unit.js']
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/integration.js']
    },
    {
      displayName: 'E2E Tests',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/e2e.js']
    },
    {
      displayName: 'Performance Tests',
      testMatch: ['<rootDir>/tests/performance/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/performance.js']
    },
    {
      displayName: 'Smart Contract Tests',
      testMatch: ['<rootDir>/tests/contracts/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/contracts.js']
    }
  ],
  
  // Global variables
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.DATABASE_URL': 'mongodb://localhost:27017/nexvestxr_test',
    'process.env.REDIS_URL': 'redis://localhost:6379/1'
  },
  
  // Timeout settings
  testTimeout: 30000,
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './tests/reports',
      filename: 'test-report.html',
      expand: true
    }],
    ['jest-junit', {
      outputDirectory: './tests/reports',
      outputName: 'junit.xml'
    }]
  ],
  
  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Custom matchers
  snapshotSerializers: [
    'jest-serializer-path'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};