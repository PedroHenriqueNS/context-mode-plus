/**
 * context-mode-plus: a section that matches several batch queries is shown once;
 * later queries get a one-line pointer instead of the repeated snippet.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { ContentStore } from "../../src/store.js";
import { formatBatchQueryResults } from "../../src/server.js";

const store = () => new ContentStore(join(tmpdir(), `plus-batch-dedup-${process.pid}-${Math.random().toString(36).slice(2)}.db`));
const doc = "# A\n\nfoo and bar share this unique-marker-zq paragraph.";

describe("formatBatchQueryResults dedup", () => {
  for (const scope of ["batch", "global"] as const) {
    test(`repeated section collapses to a pointer (scope ${scope})`, () => {
      const s = store();
      s.index({ content: doc, source: "s1" });
      const out = formatBatchQueryResults(s, ["foo", "bar"], "s1", undefined, scope).join("\n");
      expect(out.split("unique-marker-zq").length - 1).toBe(1);
      expect(out).toContain('### A\n(mesma seção de "## foo")');
      s.close();
    });
  }

  test("same title from another source is not collapsed", () => {
    const s = store();
    s.index({ content: doc, source: "s1" });
    s.index({ content: doc, source: "s2" });
    const out = formatBatchQueryResults(s, ["foo", "bar"], "s1", undefined, "global").join("\n");
    expect(out.split("unique-marker-zq").length - 1).toBe(2);
    s.close();
  });

  test("different sections sharing title and source are not collapsed", () => {
    const s = store();
    s.index({ content: "# A\n\nalpha-marker-qq lives here.\n\n# A\n\nbeta-marker-qq lives here.", source: "s1" });
    const out = formatBatchQueryResults(s, ["alpha-marker-qq", "beta-marker-qq", "alpha-marker-qq here"], "s1", undefined, "batch").join("\n");
    expect(out.split("alpha-marker-qq lives").length - 1).toBe(1);
    expect(out.split("beta-marker-qq lives").length - 1).toBe(1);
    // only the true repeat (query 3 -> alpha) collapses
    expect(out.split("(mesma seção").length - 1).toBe(1);
    expect(out).toContain('(mesma seção de "## alpha-marker-qq")');
    s.close();
  });

  test("same chunk within one query is not collapsed", () => {
    const s = store();
    s.index({ content: doc, source: "s1" });
    const out = formatBatchQueryResults(s, ["foo"], "s1", undefined, "batch").join("\n");
    expect(out).not.toContain("mesma seção");
    expect(out.split("unique-marker-zq").length - 1).toBe(1);
    s.close();
  });

  test("collapsed sections count only their short line toward the output cap", () => {
    const s = store();
    const big = "# A\n\nfoo bar " + "filler text ".repeat(150) + "tail-qq";
    s.index({ content: big, source: "s1" });
    // cap just above one full snippet: with dedup the 2nd/3rd queries still run (pointer only)
    const out = formatBatchQueryResults(s, ["foo", "bar", "filler"], "s1", 3000, "batch").join("\n");
    expect(out).not.toContain("output cap reached");
    expect(out.split("(mesma seção").length - 1).toBe(2);
    s.close();
  });
});
