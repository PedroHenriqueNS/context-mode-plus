# Pitfalls

Past failures and non-obvious constraints, newest first. Rules derived from them live in [CONVENTIONS.md](CONVENTIONS.md).

### 2026-10-16 — `/reload-plugins` does not restart the MCP server
After installing a new version, `/reload-plugins` reloaded skills and hooks but the running MCP server process (started with the session) kept serving the old bundle. Hooks pick up a new version immediately (they are spawned per call); `ctx_*` tools do not until the session restarts. Verify a release in a **new** session, or by spawning the installed `start.mjs` directly.

### 2026-10-16 — Old version directories must keep resolving
A session keeps `CLAUDE_PLUGIN_ROOT` pointing at the version directory it started with. `ctx-upgrade` updates that directory in place; `claude plugin update` installs a new one. Deleting or moving an old version directory breaks every session still using it (it took down this repo's own MCP server once). Replace an old directory with a symlink to the current one instead of deleting it.

### 2026-10-16 — `ctx_search` timeline returned the oldest matches (fixed in `plus.3`)
`SessionDB.searchEvents` used `ORDER BY id ASC LIMIT ?` and `searchAllSources` sorted ascending then kept the first `limit`, so `limit: 2` returned entries from days ago. Fixed: newest rows are taken, then shown oldest → newest.

### 2026-10-16 — Content-store results are labelled `"current-session"` even when they are not
`src/search/unified.ts` hard-codes `origin: "current-session"` for content-store hits, and the store at `~/.claude/context-mode/content/<hash>.db` is persistent per project (upstream's CONTRIBUTING.md calls it ephemeral `/tmp` storage — outdated). Do not trust the label or the "relevance only ranks the current session" wording. Open item, see [ROADMAP.md](ROADMAP.md).

### 2026-10-16 — Tests wrote into the real `~/.claude`
Tests that spawned `start.mjs` with `{ ...process.env }` let it deploy the cache-heal hook into the developer's real `settings.json`. Fixed by isolating `HOME` and `CLAUDE_CONFIG_DIR` (`tests/setup-home.ts`). Any new test that spawns the server or a hook must do the same.

### 2026-10-16 — Full test run mutates the tree
Historically a full `npm test` rewrote `hooks/hooks.json` to local paths and left `f0.tmp`/`f1.tmp`/`f2.tmp` in the repo root (mostly fixed with the isolation work). Always run `git status` before committing and never commit those changes.

### 2026-10-16 — Bundles drift when deps come from npm
`npm install` without a lockfile pulls a different esbuild and rewrites every bundle (~350 noisy lines each). Install with `bun install --frozen-lockfile`. Upstream's committed bundles are not byte-reproducible locally even then — accept the residual drift and always rebuild on merges.

### 2026-10-16 — `-plus.N` versions broke version sorts
`a.split(".").map(Number)` turns `169-plus` into `NaN`, so "newest cache dir" picks could choose an older version. All comparisons now go through `src/util/version-compare.ts` (`X.Y.Z` < `X.Y.Z-plus.N`).

### 2026-10-16 — Pinned release numbers in tests break every release
`identity.test.ts` asserted `1.0.169-plus.1` and failed after the bump to `plus.2`. Assert the version format and manifest sync, never the exact number.

### 2026-10-16 — `rtk pipeline show` prints a listing, not TOML
Without a name it prints the resolved pipeline as an indented rule listing (`  hook.after_tool.read` / `    lockfiles [rtk:posthook] … (disabled)`); only `rtk pipeline show <name>` prints TOML. The doctor parser targets the listing.

### 2026-10-16 — Bash `modify` is already a deny on Claude Code
The claude-code formatter renders routing `modify` decisions for Bash as a deny with the same message, so the feared RTK/context-mode `updatedInput` collision never happened there. The `rtkActive` path still matters for other hosts and makes the intent explicit.

### 2026-10-17 — `AGENTS.md` is in upstream's `.gitignore`
Upstream ignored `AGENTS.md` because plugin startup once auto-generated it (now disabled in `start.mjs`). The fork's `AGENTS.md` was added with `git add -f` and stays tracked; `.gitignore` is left as upstream has it to keep the diff small. A new copy elsewhere in the tree would still be ignored.

### Inherited — local builds are ignored while `server.bundle.mjs` exists
`start.mjs` loads `server.bundle.mjs` before `build/server.js`. When iterating on `src/` with `tsc` only, rebuild the bundle (`npm run build`) or your change will not run.

### Inherited — SessionDB is multi-writer by design
Two processes may open the same database; contention is handled by `withRetry()` and `busy_timeout`. Do not add file locks or `locking_mode = EXCLUSIVE` ([ADR 0001](adr/0001-sessiondb-multi-writer.md)).
