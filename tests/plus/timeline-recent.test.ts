/**
 * context-mode-plus: ctx_search sort:"timeline" returns the MOST RECENT matches
 * (shown oldest→newest), not the oldest ones.
 */
import "../setup-home";
import { afterEach, describe, expect, test } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { ContentStore } from "../../src/store.js";
import { SessionDB } from "../../src/session/db.js";
import { searchAllSources } from "../../src/search/unified.js";

const cleanups: Array<() => void> = [];
afterEach(() => { while (cleanups.length) { try { cleanups.pop()!(); } catch { /* best effort */ } } });

function setup(events: number) {
  const store = new ContentStore(join(tmpdir(), `timeline-recent-${randomUUID()}.db`));
  cleanups.push(() => store.close());
  const sessionDB = new SessionDB({ dbPath: join(tmpdir(), `timeline-recent-${randomUUID()}.db`) });
  cleanups.push(() => sessionDB.cleanup());
  const sessionId = `s-${randomUUID()}`;
  sessionDB.ensureSession(sessionId, "/project");
  for (let i = 1; i <= events; i++) {
    sessionDB.insertEvent(sessionId, { type: "note", category: "decision", data: `timeline memo ${i}`, priority: 2 }, "PostToolUse");
  }
  return { store, sessionDB };
}

describe("sort=timeline keeps the most recent matches", () => {
  test("limit 2 over 5 events returns memo 4 then memo 5", () => {
    const { store, sessionDB } = setup(5);
    const results = searchAllSources({
      query: "timeline memo", limit: 2, store, sort: "timeline", sessionDB, projectDir: "/project", configDir: "/nonexistent",
    });
    expect(results.map((r) => r.content)).toEqual(["timeline memo 4", "timeline memo 5"]);
  });

  test("fewer matches than limit returns all, oldest first", () => {
    const { store, sessionDB } = setup(3);
    const results = searchAllSources({
      query: "timeline memo", limit: 10, store, sort: "timeline", sessionDB, projectDir: "/project", configDir: "/nonexistent",
    });
    expect(results.map((r) => r.content)).toEqual(["timeline memo 1", "timeline memo 2", "timeline memo 3"]);
  });

  test("SessionDB.searchEvents returns the newest rows, oldest first", () => {
    const { sessionDB } = setup(5);
    expect(sessionDB.searchEvents("timeline memo", 2, "/project").map((r) => r.data)).toEqual(["timeline memo 4", "timeline memo 5"]);
  });
});
