/**
 * Unit Tests for Command Processing Module
 * GOAT Bot 2.0
 * Created: 2025-08-23 16:07:47 UTC
 * Developer: DithetoMokgabudi
 */

const {
  parseGoatCommand,
  extractImageData,
} = require("../../../lib/core/commands");
const { MANYCHAT_STATES } = require("../../../lib/core/state");

describe("Command Processing Module Tests", () => {
  beforeEach(() => {
    // Clear states before each test
    MANYCHAT_STATES.lastMenu.clear();
  });

  test("parseGoatCommand handles menu choice commands", () => {
    const userContext = { current_menu: "welcome" };
    const command = parseGoatCommand("2", userContext);

    expect(command.type).toBe("menu_choice");
    expect(command.choice).toBe(2);
    expect(command.action).toBe("homework_help");
  });

  test("parseGoatCommand handles welcome command", () => {
    const userContext = { current_menu: "welcome" };
    const command = parseGoatCommand("hello", userContext);

    expect(command.type).toBe("welcome");
  });

  test("parseGoatCommand maintains homework state", () => {
    const userId = "test-user-123";
    const userContext = { id: userId, current_menu: "other_menu" };

    // Set previous menu state to homework_help
    MANYCHAT_STATES.lastMenu.set(userId, {
      menu: "homework_help",
      timestamp: Date.now(),
    });

    const command = parseGoatCommand("help me with this", userContext);

    expect(command.type).toBe("homework_help");
    expect(userContext.current_menu).toBe("homework_help");
  });

  test("extractImageData handles direct image data", () => {
    const mockReq = {
      body: {
        imageData: "base64-image-data",
      },
    };

    const imageInfo = extractImageData(mockReq);

    expect(imageInfo).toBeDefined();
    expect(imageInfo.type).toBe("direct");
    expect(imageInfo.data).toBe("base64-image-data");
  });

  test("extractImageData handles media URL", () => {
    const mockReq = {
      body: {
        media: {
          url: "https://example.com/image.jpg",
        },
      },
    };

    const imageInfo = extractImageData(mockReq);

    expect(imageInfo).toBeDefined();
    expect(imageInfo.type).toBe("url");
    expect(imageInfo.data).toBe("https://example.com/image.jpg");
  });

  test("extractImageData handles ManyChat message attachment format", () => {
    const mockReq = {
      body: {
        message: {
          attachments: [
            {
              type: "image",
              payload: {
                url: "https://example.com/image.jpg",
              },
            },
          ],
        },
      },
    };

    const imageInfo = extractImageData(mockReq);

    expect(imageInfo).toBeDefined();
    expect(imageInfo.type).toBe("direct");
    expect(imageInfo.data).toBe("https://example.com/image.jpg");
  });

  test("extractImageData handles ManyChat event flags", () => {
    const mockReq = {
      body: {
        has_attachment: true,
        event_type: "image_received",
      },
    };

    const imageInfo = extractImageData(mockReq);

    expect(imageInfo).toBeDefined();
    expect(imageInfo.type).toBe("pending");
  });
});
