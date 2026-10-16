import { describe, expect, test } from "vitest";
import { analyzeRtk } from "../../src/rtk-doctor.js";

describe("analyzeRtk", () => {
  test("not installed", () => {
    expect(analyzeRtk(null, null)).toEqual({ summary: "RTK não instalado", warnings: [] });
  });

  test("1.0+ without pipeline show -> oss edition", () => {
    const r = analyzeRtk("rtk 1.0.1", null);
    expect(r.summary).toContain("oss");
    expect(r.warnings).toEqual([]);
  });

  test("accepts version suffixes", () => {
    expect(analyzeRtk("rtk 1.0.1 (abc123)\n", null).summary).toContain("oss");
  });

  test("before 1.0: states version and unavailable pipelines, no warnings, no edition", () => {
    const r = analyzeRtk("rtk 0.52.0", null);
    expect(r.summary).toContain("0.52.0");
    expect(r.summary).toContain("antes da 1.0");
    expect(r.summary).not.toContain("oss");
    expect(r.warnings).toEqual([]);
    expect(analyzeRtk("rtk 0.52.0", "[[hook.after_tool.mcp]]").warnings).toEqual([]);
  });

  test("after_tool mcp/any compresses ctx_* output", () => {
    expect(analyzeRtk("rtk 1.0.1", '[[hook.after_tool.mcp]]\nname="x"').warnings).toHaveLength(1);
    expect(analyzeRtk("rtk 1.0.1", '[[hook.after_tool.any]]\nname="x"').warnings).toHaveLength(1);
  });

  test("before_tool read contends for Read", () => {
    expect(analyzeRtk("rtk 1.0.1", '[[hook.before_tool.read]]\nname="x"').warnings).toHaveLength(1);
  });

  test("after_tool read: only an enabled lockfiles rule is fine", () => {
    const ok = '[[hook.after_tool.read]]\nname = "lockfiles"\nenabled = true\n';
    expect(analyzeRtk("rtk 1.0.1", ok).warnings).toEqual([]);
    expect(analyzeRtk("rtk 1.0.1", '[[hook.after_tool.read]]\nname = "big-files"\n').warnings).toHaveLength(1);
    expect(analyzeRtk("rtk 1.0.1", '[[hook.after_tool.read]]\nname = "lockfiles"\nenabled = false\n').warnings).toHaveLength(1);
  });

  test("clean pipeline output has no warnings", () => {
    const r = analyzeRtk("rtk 1.0.1", '[[hook.after_tool.shell]]\nname="git"\n');
    expect(r.warnings).toEqual([]);
    expect(r.summary).not.toContain("oss");
  });
});
