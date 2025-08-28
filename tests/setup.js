/**
 * Jest Test Setup
 * GOAT Bot 2.0
 * Created: 2025-08-23 18:16:22 UTC
 * Developer: DithetoMokgabudi
 */

// Mock environment variables
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.GOOGLE_APPLICATION_CREDENTIALS = "./test-credentials.json";
process.env.SUPABASE_URL = "https://test-project.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-supabase-key";

// Create mock for external dependencies
jest.mock("@google-cloud/vision", () => {
  return {
    ImageAnnotatorClient: jest.fn().mockImplementation(() => {
      return {
        textDetection: jest.fn().mockResolvedValue([
          {
            fullTextAnnotation: {
              text: "Mock OCR text\n1. Solve for x: 2x + 3 = 9\n2. Find the area of a triangle",
            },
            textAnnotations: [
              { description: "Full text" },
              { description: "Solve", confidence: 0.9 },
              { description: "for", confidence: 0.95 },
              { description: "x", confidence: 0.92 },
            ],
          },
        ]),
      };
    }),
  };
});

jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: "Mock AI response" } }],
            usage: { total_tokens: 100 },
          }),
        },
      },
    };
  });
});

// Add global console mocks to suppress noise during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
  if (process.env.DEBUG) {
    originalConsoleLog(...args);
  }
};

console.error = (...args) => {
  if (process.env.DEBUG) {
    originalConsoleError(...args);
  }
};

// Handle mocked timers and cleanup more aggressively
beforeAll(() => {
  // Track all intervals created during tests
  global.testIntervals = [];
  
  // Override setInterval to track intervals
  const originalSetInterval = global.setInterval;
  global.setInterval = function(...args) {
    const interval = originalSetInterval(...args);
    global.testIntervals.push(interval);
    return interval;
  };
});

// Reset console functions after tests
afterAll(() => {
  // Clear any timers/intervals created
  if (global.testIntervals) {
    global.testIntervals.forEach((interval) => {
      clearInterval(interval);
    });
  }

  // Use fake timers to prevent hanging
  jest.useFakeTimers();
  jest.runAllTimers();
  jest.useRealTimers();
});

// Handle mocked timers
beforeEach(() => {
  // Use fake timers to avoid hanging tests
  jest.useFakeTimers();
});

afterEach(() => {
  // Clear any timers created in tests
  jest.clearAllTimers();
});
