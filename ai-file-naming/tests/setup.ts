/**
 * Test setup file
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise
if (process.env.SILENT_TESTS === 'true') {
  global.console.log = jest.fn();
  global.console.info = jest.fn();
  global.console.warn = jest.fn();
  // Keep error for debugging
}