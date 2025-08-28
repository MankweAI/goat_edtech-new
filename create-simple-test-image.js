/**
 * Create a simple test image using text file with instructions
 * User: DithetoMokgabudiTest
 * Created: 2025-08-23 10:23:15 UTC
 */

const fs = require("fs");
const path = require("path");

const testImagesDir = path.join(__dirname, "test-images");
if (!fs.existsSync(testImagesDir)) {
  fs.mkdirSync(testImagesDir);
  console.log(`✅ Created test-images directory`);
}

// Create a sample text image placeholder with instructions
const imagePlaceholderPath = path.join(testImagesDir, "SAMPLE_IMAGE.txt");
fs.writeFileSync(
  imagePlaceholderPath,
  `To create a test math image:

1. Take a picture of a math question like "2x + 5 = 15"
2. Save it as "math-question.jpg" in this directory
3. Or use any image editing software to create a simple image with text

Then run:
node test-image-upload.js ./test-images/math-question.jpg
`
);

console.log(`✅ Created instructions for test image`);
console.log(
  `Please create a math-question.jpg file in the test-images directory`
);
