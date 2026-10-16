/**
 * context-mode-plus: routing is injected only into subagents that can call ctx tools.
 */
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
// @ts-expect-error plain .mjs
import { subagentHasCtxTools } from "../../hooks/core/subagent-tools.mjs";
// @ts-expect-error plain .mjs
import { routePreToolUse } from "../../hooks/core/routing.mjs";

let root: string;
let configDir: string;
let projectDir: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "subagent-tools-"));
  configDir = join(root, "config");
  projectDir = join(root, "project");
  mkdirSync(configDir, { recursive: true });
  mkdirSync(projectDir, { recursive: true });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function pluginAgent(frontmatter: string, version = "1.0.0") {
  const dir = join(configDir, "plugins", "cache", "mkt", "feature-dev", version, "agents");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "code-explorer.md"), `---\nname: code-explorer\n${frontmatter}\n---\nbody\n`);
}
const has = (type: string) => subagentHasCtxTools(type, { configDir, projectDir });

describe("subagentHasCtxTools", () => {
  test("built-in types", () => {
    for (const t of ["", "general-purpose", "Explore", "Plan", "Bash"]) expect(has(t)).toBe(true);
    for (const t of ["claude-code-guide", "statusline-setup"]) expect(has(t)).toBe(false);
  });

  test("plugin agent with comma tools and no ctx -> false", () => {
    pluginAgent("tools: Glob, Grep, Read");
    expect(has("feature-dev:code-explorer")).toBe(false);
  });

  test("plugin agent with YAML list including ctx tool -> true", () => {
    pluginAgent("tools:\n  - Read\n  - mcp__plugin_context-mode_context-mode__ctx_execute");
    expect(has("feature-dev:code-explorer")).toBe(true);
  });

  test("wildcard, missing tools key and unknown agent -> true", () => {
    pluginAgent("tools: *");
    expect(has("feature-dev:code-explorer")).toBe(true);
    pluginAgent("model: sonnet");
    expect(has("feature-dev:code-explorer")).toBe(true);
    expect(has("meu-agente")).toBe(true);
  });

  test("lenient tools: syntax", () => {
    const cases: [string, boolean][] = [
      ["tools:\n- Read\n- mcp__plugin_context-mode_context-mode__ctx_execute", true],
      ["tools:\n- Read\n- Grep", false],
      ["tools:", true],
      ["tools: [*]", true],
      ['tools: ["Read", "Grep"]', false],
      ["tools: Read, Grep # no ctx", false],
      ["tools: Read, ctx_search\r", true],
    ];
    for (const [fm, expected] of cases) {
      pluginAgent(fm);
      expect(has("feature-dev:code-explorer"), fm).toBe(expected);
    }
  });

  test("CRLF file with ctx tool in comma string", () => {
    const dir = join(configDir, "plugins", "cache", "mkt", "feature-dev", "1.0.0", "agents");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "code-explorer.md"), "---\r\nname: x\r\ntools: Read, ctx_search\r\n---\r\nbody\r\n");
    expect(has("feature-dev:code-explorer")).toBe(true);
  });

  test("most recently modified plugin version wins", () => {
    pluginAgent("tools: Read", "1.0.0");
    const old = new Date(Date.now() - 100000);
    utimesSync(join(configDir, "plugins", "cache", "mkt", "feature-dev", "1.0.0"), old, old);
    pluginAgent("tools: *", "2.0.0");
    expect(has("feature-dev:code-explorer")).toBe(true);
  });

  test("project then user agents", () => {
    mkdirSync(join(projectDir, ".claude", "agents"), { recursive: true });
    writeFileSync(join(projectDir, ".claude", "agents", "mine.md"), "---\ntools: Read\n---\n");
    mkdirSync(join(configDir, "agents"), { recursive: true });
    writeFileSync(join(configDir, "agents", "theirs.md"), "---\ntools: Read, ctx_search\n---\n");
    expect(has("mine")).toBe(false);
    expect(has("theirs")).toBe(true);
  });
});

describe("routePreToolUse Agent branch", () => {
  const input = () => ({ prompt: "x", subagent_type: "claude-code-guide" });
  test("subagentHasCtx:false -> null", () => {
    expect(routePreToolUse("Agent", input(), projectDir, "claude-code", "s", { subagentHasCtx: false })).toBeNull();
  });
  test("subagentRules replaces the built-in block", () => {
    const r = routePreToolUse("Agent", input(), projectDir, "claude-code", "s", { subagentRules: "<context_mode_rules>R</context_mode_rules>" });
    const prompt = (r.updatedInput as Record<string, string>).prompt;
    expect(prompt).toContain("<context_mode_rules>R</context_mode_rules>");
    expect(prompt).not.toContain("<context_window_protection>");
    expect(prompt).toBe("x\n\n<context_mode_rules>R</context_mode_rules>");
  });
});
