/**
 * context-mode-plus: the user's own context-mode-usage.md replaces the built-in
 * routing block at SessionStart.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const rulesFile = "context-mode-usage.md";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "cm-plus-rules-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

async function load(configDir: string) {
  const m = await import(resolve(root, "hooks", "core", "user-rules.mjs"));
  return m.loadUserRules(configDir) as string | null;
}

describe("loadUserRules", () => {
  test("wraps trimmed file content", async () => {
    writeFileSync(join(dir, rulesFile), "# r\nUse ctx\n");
    const out = await load(dir);
    expect(out).toBe("<context_mode_rules>\n# r\nUse ctx\n</context_mode_rules>");
  });
  test("missing file -> null", async () => {
    expect(await load(dir)).toBeNull();
  });
  test("whitespace-only file -> null", async () => {
    writeFileSync(join(dir, rulesFile), "  \n");
    expect(await load(dir)).toBeNull();
  });
  test("file over 64 KB -> null", async () => {
    writeFileSync(join(dir, rulesFile), "x".repeat(64 * 1024 + 1));
    expect(await load(dir)).toBeNull();
  });
  test("file of exactly 64 KB is accepted", async () => {
    writeFileSync(join(dir, rulesFile), "x".repeat(64 * 1024));
    expect(await load(dir)).not.toBeNull();
  });
  test("unreadable path (directory in place of file) -> null, no throw", async () => {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(dir, rulesFile));
    expect(await load(dir)).toBeNull();
  });
});

describe("sessionstart hook", () => {
  function run(): string {
    const r = spawnSync("node", [join(root, "hooks", "sessionstart.mjs")], {
      input: JSON.stringify({ session_id: "plus-rules", source: "startup", cwd: dir }),
      env: { ...process.env, CLAUDE_CONFIG_DIR: dir, CLAUDE_PROJECT_DIR: dir },
      encoding: "utf8",
      timeout: 30_000,
    });
    return JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  }
  test("user rules replace the built-in routing block", () => {
    writeFileSync(join(dir, rulesFile), "# r\nUse ctx");
    const ctx = run();
    expect(ctx).toContain("<context_mode_rules>");
    expect(ctx).toContain("Use ctx");
    expect(ctx).not.toContain("<context_window_protection>");
  });
  test("without the file the built-in block is kept", () => {
    expect(run()).toContain("<context_window_protection>");
  });
});
