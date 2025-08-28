/**
 * Homework Flow Integration Test
 * GOAT Bot 2.0
 * Created: 2025-08-23 15:52:09 UTC
 * Developer: DithetoMokgabudi
 */

const {
  ConsolidatedHomeworkHelp,
} = require("../../lib/features/homework/processor");
const { questionDetector } = require("../../lib/utils/question-detector");
const fs = require("fs");
const path = require("path");

// Mock response object
class MockResponse {
  constructor() {
    this.data = null;
    this.statusCode = 200;
  }

  json(data) {
    this.data = data;
    console.log(`Response: ${JSON.stringify(data).substring(0, 100)}...`);
    return this;
  }

  status(code) {
    this.statusCode = code;
    return this;
  }
}

// Test functions
async function testBasicFlow() {
  console.log("🧪 Testing Basic Homework Flow...");

  const helper = new ConsolidatedHomeworkHelp();

  // Test Step 1: Welcome message
  console.log("\n📋 Test Step 1: Welcome Message");
  const welcomeRes = new MockResponse();
  helper.sendWelcomeMessage(welcomeRes);

  if (
    !welcomeRes.data ||
    !welcomeRes.data.message.includes("Homework Help Ready")
  ) {
    console.error("❌ Welcome message test failed");
    return false;
  }
  console.log("✅ Welcome message test passed");

  // Test Step 2: Text question input
  console.log("\n📋 Test Step 2: Text Question Input");
  const questionReq = {
    body: {
      psid: "test-user-1",
      message: "Solve for x: 2x + 3 = 7",
    },
  };
  const questionRes = new MockResponse();

  await helper.processHomeworkRequest(questionReq, questionRes);

  if (
    !questionRes.data ||
    !questionRes.data.message.includes("Got your question")
  ) {
    console.error("❌ Question input test failed");
    return false;
  }
  console.log("✅ Question input test passed");

  // Test Step 3: Struggle input
  console.log("\n📋 Test Step 3: Struggle Input");
  const struggleReq = {
    body: {
      psid: "test-user-1",
      message: "I don't know how to solve for x",
    },
  };
  const struggleRes = new MockResponse();

  await helper.processHomeworkRequest(struggleReq, struggleRes);

  if (
    !struggleRes.data ||
    !struggleRes.data.message.includes("Educational Hint")
  ) {
    console.error("❌ Hint generation test failed");
    return false;
  }
  console.log("✅ Hint generation test passed");

  return true;
}

async function testQuestionDetection() {
  console.log("\n🧪 Testing Question Detection...");

  const testCases = [
    {
      text: "1. Solve for x: 2x + 3 = 9\n2. Find the area of a circle with radius 5",
      expectedCount: 2,
    },
    {
      text: "Calculate the value of x when 3x - 7 = 14",
      expectedCount: 1,
    },
  ];

  let allPassed = true;

  for (const [i, testCase] of testCases.entries()) {
    const questions = questionDetector.detectQuestions(testCase.text);
    const passed = questions.length === testCase.expectedCount;

    if (!passed) {
      console.error(
        `❌ Test case ${i + 1} failed: Expected ${
          testCase.expectedCount
        } questions, got ${questions.length}`
      );
      allPassed = false;
    } else {
      console.log(
        `✅ Test case ${i + 1} passed: Detected ${questions.length} questions`
      );
    }
  }

  return allPassed;
}

// Run all tests
async function runAllTests() {
  console.log("🔍 Starting Homework Integration Tests...");

  const testResults = {
    basicFlow: await testBasicFlow(),
    questionDetection: await testQuestionDetection(),
  };

  console.log("\n📊 Test Results Summary:");
  for (const [test, result] of Object.entries(testResults)) {
    console.log(
      `${result ? "✅" : "❌"} ${test}: ${result ? "PASSED" : "FAILED"}`
    );
  }

  const allPassed = Object.values(testResults).every(
    (result) => result === true
  );
  console.log(
    `\n${allPassed ? "🎉 All tests passed!" : "❌ Some tests failed!"}`
  );

  return allPassed;
}

// Execute tests
runAllTests().then((success) => {
  if (!success) {
    console.error("\n⚠️ Modularization tests failed - review required");
    process.exit(1);
  }

  console.log("\n✅ Modularization verification complete");
});

