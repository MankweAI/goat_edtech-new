/**
 * Create a simple test image for testing OCR
 * User: DithetoMokgabudi
 * Created: 2025-08-23 10:15:21 UTC
 */

const fs = require("fs");
const path = require("path");

// Create test-images directory if it doesn't exist
const testImagesDir = path.join(__dirname, "test-images");
if (!fs.existsSync(testImagesDir)) {
  fs.mkdirSync(testImagesDir);
  console.log(`✅ Created test-images directory`);
}

// Create a simple readme file explaining how to use test images
const readmePath = path.join(testImagesDir, "README.md");
fs.writeFileSync(
  readmePath,
  `# Test Images for GOAT EdTech

This directory contains test images for the GOAT EdTech homework help feature.

## Usage

1. Add your own math homework images here with clear questions
2. Run the test script: \`node test-image-upload.js ./test-images/your-image.jpg\`
3. For best results, use clear images with good lighting

Example math questions that work well:
- Linear equations (2x + 5 = 15)
- Area problems (triangle with base 8cm and height 6cm)
- Quadratic equations (x² + 5x + 6 = 0)
`
);

console.log(`✅ Created README in test-images directory`);
console.log(`\n📝 NEXT STEPS:`);
console.log(`1. Add math homework images to the test-images directory`);
console.log(`2. Run test-image-upload.js with path to your image`);
console.log(
  `   Example: node test-image-upload.js ./test-images/math-question.jpg`
);
