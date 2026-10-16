/**
 * context-mode-plus: ctx_execute / ctx_execute_file no longer echo the executed
 * code back to the model. The echo is still prepended to INDEXED content so
 * ctx_search hits keep their provenance.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mcpEntry = resolve(__dirname, "..", "..", "start.mjs");

type Resp = { result?: { content?: Array<{ text: string }>; isError?: boolean }; error?: unknown };

function rpc(proc: ChildProcess, id: number, method: string, params: unknown): Promise<Resp | undefined> {
  return new Promise((res) => {
    let buf = "";
    const onData = (d: Buffer) => {
      buf += d.toString();
      let i: number;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        try {
          const p = JSON.parse(line);
          if (p.id === id) { proc.stdout!.off("data", onData); clearTimeout(t); res(p); return; }
        } catch { /* non-JSON */ }
      }
    };
    const t = setTimeout(() => { proc.stdout!.off("data", onData); res(undefined); }, 25_000);
    proc.stdout!.on("data", onData);
    proc.stdin!.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

describe("ctx_execute / ctx_execute_file do not echo code to the model", () => {
  let dir: string;
  let proc: ChildProcess;
  let n = 10;
  const call = async (name: string, args: Record<string, unknown>) => {
    const r = await rpc(proc, ++n, "tools/call", { name, arguments: args });
    expect(r?.error).toBeUndefined();
    return { text: r?.result?.content?.[0]?.text ?? "", isError: r?.result?.isError ?? false };
  };

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "no-echo-"));
    writeFileSync(join(dir, "data.txt"), "hello file\n");
    proc = spawn("node", [mcpEntry], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, CLAUDE_PROJECT_DIR: dir, CONTEXT_MODE_DISABLE_VERSION_CHECK: "1" },
    });
    await rpc(proc, 1, "initialize", {
      protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "no-echo", version: "1" },
    });
    proc.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  }, 30_000);

  afterAll(() => {
    try { proc.kill("SIGTERM"); } catch { /* best effort */ }
    rmSync(dir, { recursive: true, force: true });
  });

  test("ctx_execute: output only, no fenced code", async () => {
    const { text } = await call("ctx_execute", { language: "javascript", code: "console.log('ok-123')" });
    expect(text).toContain("ok-123");
    expect(text).not.toContain("```javascript");
  }, 30_000);

  test("ctx_execute error path: no fenced code", async () => {
    const { text, isError } = await call("ctx_execute", {
      language: "javascript", code: "console.error('boom-456'); process.exit(2)",
    });
    expect(isError).toBe(true);
    expect(text).toContain("boom-456");
    expect(text).not.toContain("```javascript");
  }, 30_000);

  test("ctx_execute with intent over threshold: response has no echo, index keeps it", async () => {
    const code = "const ECHOPROBEalpha = 1; for (let i = 0; i < 400; i++) console.log('filler line ' + i + ' lorem ipsum dolor sit amet');";
    const { text } = await call("ctx_execute", { language: "javascript", code, intent: "filler" });
    expect(text).not.toContain("```javascript");
    const s = await call("ctx_search", { queries: ["ECHOPROBEalpha"] });
    expect(s.text).toContain("ECHOPROBEalpha");
  }, 30_000);

  test("ctx_execute_file: leading path= line, no fenced code", async () => {
    const path = join(dir, "data.txt");
    const { text } = await call("ctx_execute_file", { path, language: "javascript", code: "console.log(FILE_CONTENT.trim())" });
    expect(text.startsWith(`path=${path}\n\n`)).toBe(true);
    expect(text).toContain("hello file");
    expect(text).not.toContain("```javascript");
  }, 30_000);

  test("ctx_execute_file with intent over threshold: path= kept, index keeps echo", async () => {
    const path = join(dir, "data.txt");
    const code = "const ECHOPROBEbeta = 1; for (let i = 0; i < 400; i++) console.log('filler row ' + i + ' lorem ipsum dolor sit amet');";
    const { text } = await call("ctx_execute_file", { path, language: "javascript", code, intent: "filler" });
    expect(text.startsWith(`path=${path}\n\n`)).toBe(true);
    expect(text).not.toContain("```javascript");
    const s = await call("ctx_search", { queries: ["ECHOPROBEbeta"] });
    expect(s.text).toContain("ECHOPROBEbeta");
  }, 30_000);
});
