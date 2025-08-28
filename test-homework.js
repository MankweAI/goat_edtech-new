/**
 * Local Test Script for Homework Help (Option 2)
 * User: sophoniagoat
 * Updated: 2025-08-23 09:45:41 UTC
 * BUGFIX: Added image upload testing
 * Developer: DithetoMokgabudi
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
app.use(express.json({ limit: "10mb" }));

// Mock response object for testing
class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.response = null;
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  json(data) {
    this.response = data;
    console.log("\n🎯 RESPONSE:", JSON.stringify(data, null, 2));
    return this;
  }
}

// Import your API functions
const mainHandler = require("./api/index.js");

async function testHomeworkFlow() {
  console.log("🧪 TESTING HOMEWORK HELP FLOW (Option 2)");
  console.log("=".repeat(50));

  // Test 1: Welcome Menu
  console.log("\n📋 TEST 1: Initial Welcome");
  const welcomeReq = {
    method: "POST",
    body: {
      psid: "test-user-123",
      message: "hi",
    },
    headers: { "user-agent": "test-browser" },
  };

  const welcomeRes = new MockResponse();
  await mainHandler(welcomeReq, welcomeRes);

  // Test 2: Select Option 2 (Homework Help)
  console.log("\n📋 TEST 2: Select Option 2 (Homework Help)");
  const homeworkReq = {
    method: "POST",
    body: {
      psid: "test-user-123",
      message: "2",
    },
    headers: { "user-agent": "test-browser" },
  };

  const homeworkRes = new MockResponse();
  await mainHandler(homeworkReq, homeworkRes);

  // Test 3: Send homework question
  console.log("\n📋 TEST 3: Send homework question");
  const questionReq = {
    method: "POST",
    body: {
      psid: "test-user-123",
      message: "solve for x: 2x + 5 = 15",
    },
    headers: { "user-agent": "test-browser" },
  };

  const questionRes = new MockResponse();
  await mainHandler(questionReq, questionRes);

  // Test 4: Send image (if available)
  console.log("\n📋 TEST 4: Send homework image");

  // Try to load a test image if it exists
  try {
    const testImagePath = path.join(
      __dirname,
      "test-images",
      "math-question.jpg"
    );

    if (fs.existsSync(testImagePath)) {
      const imageBuffer = fs.readFileSync(testImagePath);
      const base64Image = imageBuffer.toString("base64");

      console.log(
        `📸 Test image loaded: ${(base64Image.length / 1024).toFixed(2)}KB`
      );

      const imageReq = {
        method: "POST",
        body: {
          psid: "test-user-123",
          message: "",
          imageData: base64Image,
        },
        headers: { "user-agent": "test-browser" },
      };

      const imageRes = new MockResponse();
      await mainHandler(imageReq, imageRes);
    } else {
      console.log("⚠️ No test image found at: " + testImagePath);
      console.log(
        "Skipping image test. Create a test-images directory with math-question.jpg to test image uploads."
      );
    }
  } catch (error) {
    console.log(`❌ Image test error: ${error.message}`);
  }

  // Test 5: Direct homework API test
  console.log("\n📋 TEST 5: Direct homework API test");
  try {
    const homeworkAPI = require("./api/homework.js");
    const directReq = {
      method: "POST",
      body: {
        psid: "test-user-direct",
        message: "I need help with algebra",
      },
    };

    const directRes = new MockResponse();
    await homeworkAPI(directReq, directRes);
  } catch (error) {
    console.log("❌ Direct homework API error:", error.message);
  }

  console.log("\n✅ LOCAL TESTING COMPLETE");
}

// Run the test
if (require.main === module) {
  testHomeworkFlow().catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
}

module.exports = { testHomeworkFlow };
