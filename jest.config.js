/**
 * Jest Configuration
 * GOAT Bot 2.0
 * Created: 2025-08-23 18:16:22 UTC
 * Developer: DithetoMokgabudi
 */

module.exports = {
  // The test environment that will be used
  testEnvironment: "node",

  // The glob patterns Jest uses to detect test files
  testMatch: ["**/tests/**/*.test.js"],

  // Directories to ignore during test runs
  testPathIgnorePatterns: ["/node_modules/"],

  // Display individual test results with colors
  verbose: true,

  // Collect test coverage information
  collectCoverage: false,

  // Setup files to run before each test file
  setupFilesAfterEnv: ["./tests/setup.js"],

  // Timeout for each test (in milliseconds)
  testTimeout: 10000,
};

