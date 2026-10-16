import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
// @ts-expect-error — JS module, no TS declarations
import { normalizeHooksJson, needsHookNormalization } from "../../hooks/normalize-hooks.mjs";

const root = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const json = (p: string) => JSON.parse(read(p));
const CLONE_URL = "https://github.com/PedroHenriqueNS/context-mode-plus.git";

describe("context-mode-plus fork identity", () => {
  it("old plugin key is gone from shipped sources", () => {
    const files = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
      .split("\n")
      .filter((f) => /\.(ts|mjs|json)$/.test(f))
      .filter((f) => !/^(tests|docs|node_modules)\//.test(f) && !/\.bundle\.mjs$/.test(f));
    const hits = files.filter((f) => existsSync(resolve(root, f)) && /context-mode@context-mode(?![-\w])/.test(read(f)));
    expect(hits).toEqual([]);
  });

  it("marketplace and plugin names", () => {
    expect(json(".claude-plugin/marketplace.json").name).toBe("context-mode-plus");
    expect(json(".claude-plugin/plugin.json").name).toBe("context-mode");
  });

  it("clone URLs in cli and server point at the fork", () => {
    expect(read("src/cli.ts")).toContain(CLONE_URL);
    expect(read("src/server.ts")).toContain(CLONE_URL);
    expect(read("src/cli.ts")).not.toContain("mksglu/context-mode.git");
    expect(read("src/server.ts")).not.toContain("mksglu/context-mode.git");
  });

  it("marketplace/cache paths use the fork marketplace name", () => {
    const cli = read("src/cli.ts");
    expect(cli).toContain('"marketplaces", "context-mode-plus"');
    expect(cli).not.toContain('"marketplaces", "context-mode"');
    expect(cli).not.toContain("cache/context-mode/context-mode");
  });

  it("heal script is renamed and still recognised", () => {
    const start = read("start.mjs");
    expect(start).toContain("context-mode-plus-cache-heal.mjs");
    expect(start).not.toMatch(/context-mode-cache-heal/);
    expect(read("hooks/cache-heal-utils.mjs")).toContain("context-mode-plus-cache-heal");
    expect(read("hooks/cache-heal-utils.mjs")).not.toMatch(/context-mode-cache-heal/);
  });

  it("version is 1.0.169-plus.1 and synced", () => {
    const v = "1.0.169-plus.1";
    expect(json("package.json").version).toBe(v);
    expect(json(".claude-plugin/plugin.json").version).toBe(v);
    expect(json(".claude-plugin/marketplace.json").metadata.version).toBe(v);
    expect(json(".claude-plugin/marketplace.json").plugins[0].version).toBe(v);
  });

  it("owner, repository and homepage point at the fork", () => {
    expect(json(".claude-plugin/marketplace.json").owner.name).toBe("PedroHenriqueNS");
    for (const f of [".claude-plugin/plugin.json", "package.json"]) {
      const j = json(f);
      const repo = typeof j.repository === "string" ? j.repository : j.repository.url;
      expect(repo).toContain("PedroHenriqueNS/context-mode-plus");
      expect(j.homepage).toContain("PedroHenriqueNS/context-mode-plus");
    }
    expect(json(".claude-plugin/plugin.json").description).toMatch(/context-mode-plus — fork of mksglu\/context-mode/);
  });

  it("README states the fork and links docs/fork; stats workflow removed", () => {
    const readme = read("README.md");
    expect(readme.slice(0, 2500)).toMatch(/fork of \[?mksglu\/context-mode/);
    expect(readme).toContain("docs/fork/");
    expect(existsSync(resolve(root, ".github/workflows/update-stats.yml"))).toBe(false);
  });

  it("hook normalization recognises the -plus.N cache version dir", () => {
    const src = JSON.stringify({ hooks: { A: [{ hooks: [{ command: "node ${CLAUDE_PLUGIN_ROOT}/hooks/x.mjs" }] }] } });
    const old = normalizeHooksJson(src, "node", "/c/context-mode-plus/context-mode/1.0.169-plus.1");
    expect(needsHookNormalization(old, "/c/context-mode-plus/context-mode/1.0.169-plus.2")).toBe(true);
    expect(needsHookNormalization(old, "/c/context-mode-plus/context-mode/1.0.169-plus.1")).toBe(false);
  });
});

describe("latest-version lookups use the fork, not upstream npm", () => {
  const FORK_PKG = "https://raw.githubusercontent.com/PedroHenriqueNS/context-mode-plus/main/package.json";
  it("cli.ts and server.ts fetchLatestVersion read the fork package.json", () => {
    for (const f of ["src/cli.ts", "src/server.ts"]) {
      const src = read(f);
      expect(src).toContain(FORK_PKG);
      expect(src).not.toContain("registry.npmjs.org/context-mode");
    }
  });
  it("ctx-debug.sh no longer compares against the upstream npm package", () => {
    expect(read("scripts/ctx-debug.sh")).not.toContain("npm view context-mode");
  });
});
