/**
 * Test Runner Script
 * GOAT Bot 2.0
 * Created: 2025-08-23 16:07:47 UTC
 * Developer: DithetoMokgabudi
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Configuration
const TEST_DIRS = ["tests/unit", "tests/e2e"];

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

console.log(
  `${colors.bright}${colors.blue}====================================${colors.reset}`
);
console.log(
  `${colors.bright}${colors.blue}   GOAT EdTech Test Suite Runner    ${colors.reset}`
);
console.log(
  `${colors.bright}${colors.blue}====================================${colors.reset}`
);
console.log(`Started: ${new Date().toISOString()}`);

let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

// Get all test files
function findTestFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (item.name.endsWith(".test.js")) {
      files.push(fullPath);
    }
  }

  return files;
}

// Run all tests
function runTests() {
  const allTestFiles = [];

  // Find all test files
  for (const dir of TEST_DIRS) {
    if (fs.existsSync(dir)) {
      allTestFiles.push(...findTestFiles(dir));
    } else {
      console.log(
        `${colors.yellow}Warning: Test directory ${dir} not found${colors.reset}`
      );
    }
  }

  console.log(`\nFound ${allTestFiles.length} test files\n`);

  // Run each test file
  for (const testFile of allTestFiles) {
    console.log(`${colors.bright}Running: ${testFile}${colors.reset}`);

    try {
      // Dynamically require the test file
      const test = require(`./${testFile}`);

      if (typeof test === "function") {
        test();
        passedTests++;
        console.log(`${colors.green}✓ Passed${colors.reset}\n`);
      } else {
        console.log(
          `${colors.yellow}⚠ Skipped (not a test function)${colors.reset}\n`
        );
        skippedTests++;
      }
    } catch (error) {
      console.error(`${colors.red}✗ Failed${colors.reset}`);
      console.error(`${colors.red}${error.message}${colors.reset}\n`);
      failedTests++;
    }
  }

  // Summary
  console.log(
    `${colors.bright}${colors.blue}====================================${colors.reset}`
  );
  console.log(`${colors.bright}Test Summary:${colors.reset}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${skippedTests}${colors.reset}`);
  console.log(
    `${colors.bright}${colors.blue}====================================${colors.reset}`
  );

  if (failedTests > 0) {
    process.exit(1);
  }
}

// Run tests
runTests();

