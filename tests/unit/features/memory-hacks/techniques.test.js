/**
 * Unit Tests for Memory Techniques Module
 * GOAT Bot 2.0
 * Created: 2025-08-23 16:07:47 UTC
 * Developer: DithetoMokgabudi
 */

const {
  getMemoryTechniques,
  generateMemoryHackResponse,
} = require("../../../../lib/features/memory-hacks/techniques");

describe("Memory Techniques Module Tests", () => {
  test("getMemoryTechniques returns techniques for specific subject and topic", () => {
    const result = getMemoryTechniques("Mathematics", "algebra");

    expect(result).toBeDefined();
    expect(result.subject).toBe("Mathematics");
    expect(result.topic).toBe("algebra");
    expect(result.techniques).toBeDefined();
    expect(result.principles).toBeDefined();
  });

  test("getMemoryTechniques prioritizes SA context techniques", () => {
    const result = getMemoryTechniques("Mathematics", "geometry");

    expect(result.techniques.sa_context).toBeDefined();
    expect(result.techniques.sa_context.length).toBeGreaterThan(0);
    expect(result.techniques.sa_context[0].saContext).toBe(true);
  });

  test("getMemoryTechniques falls back to Mathematics for unknown subjects", () => {
    const result = getMemoryTechniques("Unknown", "general");

    expect(result.subject).toBe("Unknown");
    expect(result.techniques).toBeDefined();
  });

  test("generateMemoryHackResponse creates formatted response with techniques", () => {
    const response = generateMemoryHackResponse("Mathematics", "trigonometry");

    expect(response).toContain("Memory Hacks for Mathematics: trigonometry");
    expect(response).toContain("South African Memory Techniques");
    expect(response).toContain("Key Learning Principle");
  });

  test("generateMemoryHackResponse works with subject only", () => {
    const response = generateMemoryHackResponse("English");

    expect(response).toContain("Memory Hacks for English");
  });
});

