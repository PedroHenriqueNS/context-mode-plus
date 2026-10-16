/**
 * context-mode-plus: with RTK's Bash hook active, context-mode never returns
 * `modify` for Bash (two updatedInput rewrites would be ambiguous) — it denies.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
// @ts-expect-error plain .mjs
import { isRtkBashHookActive } from "../../hooks/core/rtk.mjs";
// @ts-expect-error plain .mjs
import { routePreToolUse } from "../../hooks/core/routing.mjs";
// @ts-expect-error plain .mjs
import { formatDecision } from "../../hooks/core/formatters.mjs";

let root: string;
let sentinelDir: string;
const prevSentinel = process.env.CONTEXT_MODE_MCP_SENTINEL_DIR;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "rtk-"));
  sentinelDir = join(root, "sentinels");
  // isMCPReady() scans this dir for a live sentinel (our own pid).
  process.env.CONTEXT_MODE_MCP_SENTINEL_DIR = sentinelDir;
  mkdirSync(sentinelDir, { recursive: true });
  writeFileSync(join(sentinelDir, `context-mode-mcp-ready-${process.pid}`), String(process.pid));
});
afterAll(() => {
  if (prevSentinel === undefined) delete process.env.CONTEXT_MODE_MCP_SENTINEL_DIR;
  else process.env.CONTEXT_MODE_MCP_SENTINEL_DIR = prevSentinel;
  rmSync(root, { recursive: true, force: true });
});

function settings(name: string, body: string) {
  const f = join(root, name);
  writeFileSync(f, body);
  return f;
}

describe("isRtkBashHookActive", () => {
  const rtk = (matcher: string, command: string) =>
    JSON.stringify({ hooks: { PreToolUse: [{ matcher, hooks: [{ command }] }] } });

  test("detects `rtk hook claude` on Bash", () => {
    expect(isRtkBashHookActive([settings("a.json", rtk("Bash", "rtk hook claude"))])).toBe(true);
  });
  test("detects the legacy rtk-rewrite script and a multi-tool matcher", () => {
    expect(isRtkBashHookActive([settings("b.json", rtk("Edit|Bash", "~/.claude/hooks/rtk-rewrite.sh"))])).toBe(true);
  });
  test("any of several files is enough; missing and broken files are skipped", () => {
    const paths = [join(root, "nope.json"), settings("broken.json", "{not json"), settings("c.json", rtk("Bash", "rtk hook claude"))];
    expect(isRtkBashHookActive(paths)).toBe(true);
  });
  test("false without RTK, for non-Bash matchers, and for broken JSON", () => {
    expect(isRtkBashHookActive([settings("d.json", rtk("Bash", "node pretooluse.mjs"))])).toBe(false);
    expect(isRtkBashHookActive([settings("e.json", rtk("Read", "rtk hook claude"))])).toBe(false);
    expect(isRtkBashHookActive([settings("f.json", "{broken")])).toBe(false);
    expect(isRtkBashHookActive([])).toBe(false);
  });
});

describe("routePreToolUse Bash redirects with rtkActive", () => {
  const route = (command: string, options = {}) =>
    routePreToolUse("Bash", { command }, undefined, "claude-code", "s1", options);

  test.each([
    ["curl", "curl -s https://x", "ctx_fetch_and_index"],
    ["inline http", `node -e "fetch('https://x')"`, "Inline HTTP redirected"],
    ["build tool", "gradle build", "Build tool redirected"],
  ])("%s: deny when rtkActive, modify otherwise", (_n, command, text) => {
    const denied = route(command, { rtkActive: true });
    expect(denied.action).toBe("deny");
    expect(denied.reason).toContain("ctx_execute");
    expect(denied.reason).toContain(text);
    const modified = route(command, { rtkActive: false });
    expect(modified.action).toBe("modify");
    expect(modified.updatedInput.command).toContain(denied.reason);
    expect(route(command).action).toBe("modify");
  });

  test("deny keeps redirectMeta and renders as a claude-code deny", () => {
    const d = route("curl -s https://x", { rtkActive: true });
    expect(d.redirectMeta).toMatchObject({ tool: "Bash", type: "bash-redirected", bytesAvoided: 8192 });
    expect(formatDecision("claude-code", d).hookSpecificOutput.permissionDecision).toBe("deny");
  });

  test("subagent context (mcpToolsAvailable false) still passes through", () => {
    expect(route("curl -s https://x", { rtkActive: true, mcpToolsAvailable: false })).toBeNull();
    expect(route("curl -s https://x", { rtkActive: false, mcpToolsAvailable: false })).toBeNull();
  });
});
