/**
 * context-mode-plus: the MCP `ctx_doctor` tool reports RTK too (the CLI doctor
 * already did). A fake `rtk` on PATH stands in for the real binary.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mcpEntry = resolve(__dirname, "..", "..", "start.mjs");

const PIPELINE = `Pipeline: custom
Rules (per position; first match wins, project before user before inherited):
  hook.before_tool.shell
    rtk-rewrite            [rtk:default] when always -> action=rewrite
  hook.after_tool.mcp
    mcp-x                  [user] when always -> use=[term]
`;

function rpc(proc: ChildProcess, id: number, method: string, params: unknown): Promise<any> {
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
    const t = setTimeout(() => { proc.stdout!.off("data", onData); res(undefined); }, 60_000);
    proc.stdout!.on("data", onData);
    proc.stdin!.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

describe("ctx_doctor reports RTK", () => {
  let dir: string;
  let proc: ChildProcess;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "doctor-rtk-"));
    const bin = join(dir, "bin");
    const home = join(dir, "home");
    mkdirSync(bin);
    mkdirSync(join(home, ".claude"), { recursive: true });
    writeFileSync(join(dir, "pipeline.txt"), PIPELINE);
    writeFileSync(
      join(bin, "rtk"),
      `#!/bin/sh\nif [ "$1" = "--version" ]; then echo "rtk 1.0.1"; exit 0; fi\nif [ "$1" = "pipeline" ]; then cat "${join(dir, "pipeline.txt")}"; exit 0; fi\nexit 1\n`,
    );
    chmodSync(join(bin, "rtk"), 0o755);
    proc = spawn("node", [mcpEntry], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        HOME: home,
        CLAUDE_CONFIG_DIR: join(home, ".claude"),
        CLAUDE_PROJECT_DIR: dir,
        CONTEXT_MODE_DISABLE_VERSION_CHECK: "1",
      },
    });
    await rpc(proc, 1, "initialize", {
      protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "doctor-rtk", version: "1" },
    });
    proc.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  }, 60_000);

  afterAll(() => {
    try { proc.kill("SIGTERM"); } catch { /* best effort */ }
    rmSync(dir, { recursive: true, force: true });
  });

  test("summary line plus one warning per finding", async () => {
    const r = await rpc(proc, 2, "tools/call", { name: "ctx_doctor", arguments: {} });
    const text: string = r?.result?.content?.[0]?.text ?? "";
    expect(text).toContain("[OK] RTK: rtk 1.0.1 — pipelines lidas");
    expect(text).toContain("[WARN] RTK: Pipeline after_tool.mcp/any do RTK pode comprimir as saídas ctx_*.");
  }, 90_000);
});
