import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { routePreToolUse, resetGuidanceThrottle, guidancePeriodic } from "../hooks/core/routing.mjs";

const PROJECT_DIR = "/tmp/test-project";

// MCP readiness sentinel — routing.mjs checks process.ppid in-process
const _sentinelDir = process.platform === "win32" ? tmpdir() : "/tmp";
const mcpSentinel = resolve(_sentinelDir, `context-mode-mcp-ready-${process.pid}`);

describe("guidance throttle", () => {
  beforeEach(() => {
    // Reset throttle state between tests so each test starts fresh
    if (typeof resetGuidanceThrottle === "function") resetGuidanceThrottle();
    writeFileSync(mcpSentinel, String(process.pid));
  });

  afterEach(() => {
    try { unlinkSync(mcpSentinel); } catch {}
  });

  // context-mode-plus: the generic once-per-session Read/Grep/Bash advisories are gone
  // (nudges are event-driven, see tests/plus/post-nudges.test.ts).
  it("Read/Grep/Bash no longer emit a generic advisory", () => {
    expect(routePreToolUse("Read", { file_path: "/tmp/a.ts" }, PROJECT_DIR)).toBeNull();
    expect(routePreToolUse("Grep", { pattern: "foo" }, PROJECT_DIR)).toBeNull();
    expect(routePreToolUse("Bash", { command: "npm install" }, PROJECT_DIR)).toBeNull();
  });

  it("deny/modify actions are NEVER throttled", () => {
    // WebFetch deny should always fire
    const d1 = routePreToolUse("WebFetch", { url: "https://example.com" }, PROJECT_DIR);
    const d2 = routePreToolUse("WebFetch", { url: "https://other.com" }, PROJECT_DIR);

    expect(d1?.action).toBe("deny");
    expect(d2?.action).toBe("deny");
  });

  it("periodic guidance fires on calls 1 and period+1 only", () => {
    const fired = Array.from({ length: 6 }, () => guidancePeriodic("t", "msg", "s-periodic", 5) !== null);
    expect(fired).toEqual([true, false, false, false, false, true]);
    resetGuidanceThrottle("s-periodic");
  });

  it("resetGuidanceThrottle clears state (simulates new session)", () => {
    expect(guidancePeriodic("t", "msg", undefined, 5)).not.toBeNull();
    expect(guidancePeriodic("t", "msg", undefined, 5)).toBeNull();

    resetGuidanceThrottle();

    expect(guidancePeriodic("t", "msg", undefined, 5)).not.toBeNull();
  });

  // Regression coverage for #298 — Windows/Git Bash spawns a new bash.exe per
  // hook invocation, so process.ppid differs every call. The sessionId scopes the
  // counter directory to a stable per-session identifier passed in from the hook payload.
  describe("sessionId scoping (#298 — stable across shifting ppids)", () => {
    const SESSION_A = "a1b2c3d4-session-alpha";
    const SESSION_B = "e5f6a7b8-session-beta";

    beforeEach(() => {
      resetGuidanceThrottle(SESSION_A);
      resetGuidanceThrottle(SESSION_B);
    });

    afterEach(() => {
      resetGuidanceThrottle(SESSION_A);
      resetGuidanceThrottle(SESSION_B);
    });

    it("counter survives a fresh process (in-memory state cleared)", () => {
      expect(guidancePeriodic("t", "msg", SESSION_A, 5)).not.toBeNull();

      // Simulate a fresh Node.js process: in-memory state is gone, the on-disk counter stays.
      resetGuidanceThrottle();

      expect(guidancePeriodic("t", "msg", SESSION_A, 5)).toBeNull();
    });

    it("different sessionIds get independent counters", () => {
      expect(guidancePeriodic("t", "msg", SESSION_A, 5)).not.toBeNull();
      resetGuidanceThrottle();
      expect(guidancePeriodic("t", "msg", SESSION_B, 5)).not.toBeNull();
    });

    it("resetGuidanceThrottle(sessionId) clears the session-scoped counters", () => {
      expect(guidancePeriodic("t", "msg", SESSION_A, 5)).not.toBeNull();
      expect(guidancePeriodic("t", "msg", SESSION_A, 5)).toBeNull();

      resetGuidanceThrottle(SESSION_A);

      expect(guidancePeriodic("t", "msg", SESSION_A, 5)).not.toBeNull();
    });
  });
});
