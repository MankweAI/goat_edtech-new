/**
 * Unit Tests for State Management Module
 * GOAT Bot 2.0
 * Created: 2025-08-23 16:07:47 UTC
 * Developer: DithetoMokgabudi
 */

const {
  userStates,
  MANYCHAT_STATES,
  trackManyState,
} = require("../../../lib/core/state");

describe("State Management Module Tests", () => {
  beforeEach(() => {
    // Clear states before each test
    userStates.clear();
    MANYCHAT_STATES.lastCommand.clear();
    MANYCHAT_STATES.lastMenu.clear();
  });

  test("User state can be set and retrieved", () => {
    const testUserId = "test-user-123";
    const testState = {
      id: testUserId,
      current_menu: "welcome",
      context: { test: true },
    };

    userStates.set(testUserId, testState);
    const retrievedState = userStates.get(testUserId);

    expect(retrievedState).toBeDefined();
    expect(retrievedState.id).toBe(testUserId);
    expect(retrievedState.context.test).toBe(true);
  });

  test("ManyChat state tracking updates both command and menu", () => {
    const testUserId = "test-user-456";
    const testState = {
      type: "homework_help",
      current_menu: "homework_active",
    };

    trackManyState(testUserId, testState);

    const commandState = MANYCHAT_STATES.lastCommand.get(testUserId);
    const menuState = MANYCHAT_STATES.lastMenu.get(testUserId);

    expect(commandState).toBeDefined();
    expect(commandState.command).toBe("homework_help");
    expect(menuState).toBeDefined();
    expect(menuState.menu).toBe("homework_active");
  });

  test("ManyChat state includes timestamps", () => {
    const testUserId = "test-user-789";
    const testState = {
      type: "welcome",
      current_menu: "welcome",
    };

    const beforeTime = Date.now();
    trackManyState(testUserId, testState);
    const afterTime = Date.now();

    const commandState = MANYCHAT_STATES.lastCommand.get(testUserId);
    const menuState = MANYCHAT_STATES.lastMenu.get(testUserId);

    expect(commandState.timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(commandState.timestamp).toBeLessThanOrEqual(afterTime);
    expect(menuState.timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(menuState.timestamp).toBeLessThanOrEqual(afterTime);
  });
});

