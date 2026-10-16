import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compareVersions } from "../../src/util/version-compare";

const root = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const INPUT = ["1.0.169", "1.0.169-plus.2", "1.0.169-plus.10", "1.0.168"];
const SORTED = ["1.0.168", "1.0.169", "1.0.169-plus.2", "1.0.169-plus.10"];

describe("-plus.N version ordering", () => {
  it("shared compareVersions: newest is 1.0.169-plus.10; plain X.Y.Z < any -plus.N", () => {
    expect([...INPUT].sort(compareVersions)).toEqual(SORTED);
    expect([...INPUT].reverse().sort(compareVersions)).toEqual(SORTED);
    expect(compareVersions("1.0.169", "1.0.169-plus.1")).toBeLessThan(0);
    expect(compareVersions("1.0.170", "1.0.169-plus.10")).toBeGreaterThan(0);
    expect(compareVersions("1.0.169-plus.1", "1.0.169-plus.1")).toBe(0);
  });

  it("start.mjs inline compareVersions (forward heal) agrees", () => {
    const src = read("start.mjs");
    const fn = /function compareVersions\([\s\S]*?\n}\n/.exec(src)![0];
    const cmp = new Function(`${fn}; return compareVersions;`)() as (a: string, b: string) => number;
    expect([...INPUT].sort(cmp)).toEqual(SORTED);
    expect(src).toContain("dirs.sort(compareVersions)");
  });

  it("start.mjs deployed heal-script template sort agrees", () => {
    const line = read("start.mjs").split("\n").find((l) => l.trimStart().startsWith("dirs.sort((a,b)=>"))!;
    // The template lives inside a JS template literal: `\\d` in the file is `\d` at runtime.
    const code = line.replace(/\\\\/g, "\\");
    const sort = new Function("dirs", `${code}; return dirs;`) as (d: string[]) => string[];
    expect(sort([...INPUT])).toEqual(SORTED);
    expect(sort([...INPUT].reverse())).toEqual(SORTED);
  });

  it("claude-code adapter, server and analytics use the shared comparator", () => {
    expect(read("src/adapters/claude-code/index.ts")).toContain(".sort(compareVersions)");
    expect(read("src/server.ts")).toContain("compareVersions(a, b) > 0");
    expect(read("src/session/analytics.ts")).toContain("compareVersions(a, b) > 0");
  });
});
