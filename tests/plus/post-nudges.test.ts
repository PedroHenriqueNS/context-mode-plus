/**
 * context-mode-plus: event-driven nudges. PostToolUse reacts to the size of what a
 * Read/Bash actually returned instead of a once-per-session generic advisory.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
// @ts-expect-error plain .mjs
import { decidePostNudge } from "../../hooks/core/post-nudges.mjs";

const POSTTOOL = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "hooks", "posttooluse.mjs");
let n = 0;
const sid = () => `post-nudge-${process.pid}-${Date.now()}-${n++}`;
const read = (extra: object = {}, len = 9000, sessionId = sid()) =>
  decidePostNudge({
    toolName: "Read",
    toolInput: { file_path: "/p/a.ts", ...extra },
    responseText: "x".repeat(len),
    sessionId,
  });
const bash = (len: number, sessionId = sid()) =>
  decidePostNudge({ toolName: "Bash", toolInput: { command: "ls" }, responseText: "x".repeat(len), sessionId });

describe("decidePostNudge", () => {
  test("Read without range and >= 8000 chars nudges toward ctx_execute_file", () => {
    const msg = read();
    expect(msg).toContain("ctx_execute_file");
    expect(msg).toContain("/p/a.ts");
  });
  test("Read below 8000 chars or with offset/limit stays silent", () => {
    expect(read({}, 7999)).toBeNull();
    expect(read({ limit: 50 })).toBeNull();
    expect(read({ offset: 10 })).toBeNull();
  });
  test("Read path is capped at 200 characters", () => {
    const long = "/" + "a".repeat(400);
    const msg = decidePostNudge({ toolName: "Read", toolInput: { file_path: long }, responseText: "x".repeat(9000), sessionId: sid() });
    expect(msg).toContain("a".repeat(150));
    expect(msg).not.toContain("a".repeat(250));
  });
  test("Bash threshold is 5000 chars", () => {
    expect(bash(4999)).toBeNull();
    const msg = bash(5000);
    expect(msg).toContain('ctx_execute(language: "shell", code)');
  });
  test("other tools stay silent", () => {
    expect(decidePostNudge({ toolName: "Grep", toolInput: {}, responseText: "x".repeat(99999), sessionId: sid() })).toBeNull();
  });
  test("cadence: 1st and 6th call of a session nudge, the rest do not", () => {
    const s = sid();
    const out = Array.from({ length: 6 }, () => bash(6000, s));
    expect(out.map((m) => m !== null)).toEqual([true, false, false, false, false, true]);
  });
  test("object responses are measured by their serialized JSON", () => {
    const msg = decidePostNudge({
      toolName: "Read",
      toolInput: { file_path: "/p/a.ts" },
      responseText: JSON.stringify({ file: { content: "x".repeat(9000) } }),
      sessionId: sid(),
    });
    expect(msg).toContain("ctx_execute_file");
  });
});

describe("posttooluse.mjs stdout", () => {
  let home: string;
  let project: string;
  beforeAll(() => {
    home = mkdtempSync(join(tmpdir(), "post-nudge-home-"));
    project = mkdtempSync(join(tmpdir(), "post-nudge-proj-"));
  });
  afterAll(() => {
    rmSync(home, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  });
  const run = (payload: object, sessionId: string) =>
    spawnSync("node", [POSTTOOL], {
      input: JSON.stringify({ session_id: sessionId, ...payload }),
      encoding: "utf-8",
      timeout: 30_000,
      env: {
        ...process.env,
        HOME: home,
        USERPROFILE: home,
        CLAUDE_CONFIG_DIR: join(home, ".claude"),
        CLAUDE_PROJECT_DIR: project,
        CLAUDE_SESSION_ID: sessionId,
        CONTEXT_MODE_SESSION_SUFFIX: "",
      },
    });
  const readPayload = (extra: object = {}) => ({
    tool_name: "Read",
    tool_input: { file_path: "/p/a.ts" },
    tool_response: { file: { content: "x".repeat(9000) } },
    ...extra,
  });

  test("writes a valid PostToolUse additionalContext for a big Read", () => {
    const r = run(readPayload(), sid());
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.hookSpecificOutput.hookEventName).toBe("PostToolUse");
    expect(out.hookSpecificOutput.additionalContext).toContain("ctx_execute_file");
  });
  test("no output for a small Read", () => {
    const r = run(readPayload({ tool_response: "tiny" }), sid());
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });
  test("no nudge for a subagent that cannot call ctx tools", () => {
    const r = run(readPayload({ agent_id: "a1", agent_type: "statusline-setup" }), sid());
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });
  test("a subagent that can call ctx tools still gets the nudge", () => {
    const r = run(readPayload({ agent_id: "a1", agent_type: "general-purpose" }), sid());
    expect(JSON.parse(r.stdout).hookSpecificOutput.hookEventName).toBe("PostToolUse");
  });
});
