import { describe, expect, test } from "vitest";
import { analyzeRtk } from "../../src/rtk-doctor.js";

// Shape of `rtk pipeline show` (resolved pipeline) as printed by rtk 1.0.1.
const DEFAULT = `Pipeline: rtk:default
Inherits: rtk:default
(no pipeline file present — this is the compiled rtk:default)

Rules (per position; first match wins, project before user before inherited):
  hook.before_tool.shell
    rtk-rewrite            [rtk:default] when always -> action=rewrite
  proxy.request.tool_result
    normalize              [rtk:default] when always -> use=[ansi, progress, dedup]

Directives (merged in order):
  rtk-awareness          [rtk:default] level=default

Guards: never_worse=true min_size=512
`;

const POSTHOOK = `Pipeline: rtk:posthook
Inherits: rtk:posthook -> rtk:default

Rules (per position; first match wins, project before user before inherited):
  hook.before_tool.shell
    rtk-rewrite            [rtk:default] when always -> action=rewrite
  hook.after_tool.read
    lockfiles              [rtk:posthook] when basename_in=["package-lock.json", "Cargo.lock"] -> use=[lockfile]
    json-reads             [rtk:posthook] when format="json" -> use=[json] (disabled)
    strip-line-numbers     [rtk:posthook] when always -> use=[strip-line-numbers] (disabled)
  hook.after_tool.shell
    term-default           [rtk:posthook] when is_rtk_command=false -> use=[term]
  hook.after_tool.search
    grep-group             [rtk:posthook] when format="matches" -> use=[matches]
  hook.after_tool.web
    web-default            [rtk:posthook] when always -> use=[web]
  proxy.request.tool_result
    normalize              [rtk:default] when always -> use=[ansi, progress, dedup]

Directives (merged in order):
  rtk-awareness          [rtk:default] level=default

Guards: never_worse=true min_size=512
`;

const withRules = (section: string, rule: string) =>
  POSTHOOK.replace("  proxy.request.tool_result", `  ${section}\n    ${rule}\n  proxy.request.tool_result`);

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
    expect(analyzeRtk("rtk 0.52.0", withRules("hook.after_tool.mcp", "x [u] when always -> use=[term]")).warnings).toEqual([]);
  });

  test("rtk:default and rtk:posthook as shipped have no warnings", () => {
    for (const out of [DEFAULT, POSTHOOK]) {
      const r = analyzeRtk("rtk 1.0.1", out);
      expect(r.warnings).toEqual([]);
      expect(r.summary).not.toContain("oss");
    }
  });

  test("after_tool mcp/any compresses ctx_* output", () => {
    expect(analyzeRtk("rtk 1.0.1", withRules("hook.after_tool.mcp", "mcp-x [u] when always -> use=[term]")).warnings).toHaveLength(1);
    expect(analyzeRtk("rtk 1.0.1", withRules("hook.after_tool.any", "any-x [u] when always -> use=[term]")).warnings).toHaveLength(1);
  });

  test("before_tool read contends for Read", () => {
    const out = withRules("hook.before_tool.read", "shunt-large-read [rtk:delegate-reads] when file_lines_gt=350 -> action=route");
    expect(analyzeRtk("rtk 1.0.1", out).warnings).toHaveLength(1);
  });

  test("after_tool read: an enabled rule other than lockfiles warns; disabled rules do not", () => {
    const enabledJson = POSTHOOK.replace('use=[json] (disabled)', "use=[json]");
    expect(analyzeRtk("rtk 1.0.1", enabledJson).warnings).toHaveLength(1);
  });

  test("disabled rules never warn", () => {
    expect(analyzeRtk("rtk 1.0.1", withRules("hook.after_tool.mcp", "mcp-x [u] when always -> use=[term] (disabled)")).warnings).toEqual([]);
  });
});
