const vision = require("@google-cloud/vision");

async function testVision() {
  try {
    const client = new vision.ImageAnnotatorClient();
    console.log("✅ Google Vision API connected!");
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

testVision();

