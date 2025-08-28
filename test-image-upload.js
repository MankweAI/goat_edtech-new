/**
 * Test Script for Homework Image Upload
 * User: DithetoMokgabudi
 * Updated: 2025-08-23 10:15:21 UTC
 * BUGFIX: Removed axios dependency
 */

const fs = require("fs");
const path = require("path");

// Helper function to read test image and encode as base64
function readTestImage(imagePath) {
  try {
    const fullPath = path.resolve(imagePath);
    console.log(`📂 Reading test image from: ${fullPath}`);

    const imageBuffer = fs.readFileSync(fullPath);
    const base64Image = imageBuffer.toString("base64");

    console.log(
      `📸 Image loaded successfully: ${(base64Image.length / 1024).toFixed(
        2
      )}KB`
    );
    return base64Image;
  } catch (error) {
    console.error(`❌ Error reading image: ${error.message}`);
    process.exit(1);
  }
}

// Test the image upload functionality
async function testImageUpload() {
  try {
    console.log("🧪 TESTING HOMEWORK IMAGE UPLOAD");
    console.log("=".repeat(50));

    // Check if test image path was provided
    const imagePath = process.argv[2];
    if (!imagePath) {
      console.error(
        "❌ Please provide a test image path: node test-image-upload.js ./test-images/math-question.jpg"
      );
      process.exit(1);
    }

    // Read and encode test image
    const base64Image = readTestImage(imagePath);

    // Local test with direct function call
    console.log("\n📋 LOCAL TEST: Direct module call");

    const homeworkHelp = require("./api/homework.js");

    // Mock request and response objects
    const mockReq = {
      body: {
        psid: "test-user-image",
        imageData: base64Image,
      },
    };

    const mockRes = {
      json: (data) => {
        console.log("\n🎯 RESPONSE:");
        console.log(JSON.stringify(data, null, 2));
        return data;
      },
    };

    // Call homework help with image data
    await homeworkHelp(mockReq, mockRes);

    console.log("\n✅ IMAGE UPLOAD TEST COMPLETE");
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testImageUpload();
}

module.exports = { testImageUpload };
