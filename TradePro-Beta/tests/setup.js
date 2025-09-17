// Jest setup file
const path = require('path');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '3001'; // Use different port for tests
process.env.JWT_SECRET = 'test_secret_key';
process.env.CACHE_DURATION_MINUTES = '1'; // Short cache for tests
process.env.RATE_LIMIT_MAX_REQUESTS = '1000'; // Higher limit for tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(10000);

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global teardown
afterAll(async () => {
  // Cleanup any global resources
  // Close any open handles
  if (global.gc) {
    global.gc();
  }
  
  // Wait a bit for cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
});
