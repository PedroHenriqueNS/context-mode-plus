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
});
