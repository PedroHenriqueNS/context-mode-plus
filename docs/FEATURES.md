# Features

Upstream features first (inherited unchanged unless noted), then fork features. Release history: [fork/CHANGELOG.md](fork/CHANGELOG.md).

## Upstream (inherited)

### Sandboxed execution — `ctx_execute`, `ctx_execute_file`, `ctx_batch_execute`
- **Purpose:** analyze data in code so only the printed answer enters the model's context.
- **Behavior:** runs code in 11 languages in a temp sandbox; outputs over ~5 KB with an `intent` are auto-indexed and returned as section titles; `ctx_batch_execute` runs several commands and answers `queries` in one call.
- **Implementation:** `src/executor.ts`, `src/runtime.ts`, handlers in `src/server.ts`.
- **Status:** shipped. Fork changes: no code echo, batch dedup (below).

### Knowledge base — `ctx_index`, `ctx_fetch_and_index`, `ctx_search`
- **Purpose:** store large content once, retrieve only the matching passages.
- **Behavior:** FTS5 with Porter + trigram matchers merged by RRF, proximity rerank, typo correction; `sort: "timeline"` merges prior-session events and auto-memory.
- **Implementation:** `src/store.ts`, `src/search/unified.ts`.
- **Status:** shipped. Fork change: timeline keeps the most recent entries (below).

### Session memory
- **Purpose:** survive compaction and resume with the important events.
- **Behavior:** hooks capture 26 event categories into SessionDB; PreCompact builds a snapshot; SessionStart re-injects a compact directive.
- **Implementation:** `src/session/*`, `hooks/posttooluse.mjs`, `precompact.mjs`, `sessionstart.mjs`, `userpromptsubmit.mjs`, `stop.mjs`.
- **Status:** shipped (the owner's chosen memory; claude-mem's observer is disabled on that machine).

### Routing hooks
- **Purpose:** steer the model away from context-flooding tools.
- **Behavior:** curl/wget/inline-HTTP/build commands redirected to the sandbox; WebFetch denied in favor of `ctx_fetch_and_index`; security deny/ask rules applied to sandboxed code.
- **Implementation:** `hooks/core/routing.mjs`, `hooks/pretooluse.mjs`.
- **Status:** shipped. Fork changes: RTK-aware Bash, event nudges, tool-aware subagent injection (below).

### Operations — `ctx_stats`, `ctx_doctor`, `ctx_upgrade`, `ctx_purge`, `ctx_insight`
- **Behavior:** savings report, diagnostics, self-upgrade, knowledge-base wipe, analytics dashboard.
- **Status:** shipped. Fork changes: doctor RTK section, fork-owned upgrade.

### Multi-platform adapters
- **Behavior:** Codex, Gemini CLI, Cursor, OpenCode, Pi, OpenClaw, Kimi, Kiro, Qwen, Copilot, Zed and others.
- **Status:** shipped upstream, kept unchanged and untested by the owner.

## Fork (context-mode-plus)

### Fork identity and upgrade — `plus.1`
- **Purpose:** the fork must not be overwritten by upstream.
- **Behavior:** marketplace and key `context-mode-plus`; `ctx-upgrade`, CLI upgrade and the outdated check use the fork repo; `-plus.N` versions sort correctly everywhere; out-of-plugin heal hook renamed `context-mode-plus-cache-heal.mjs`.
- **Status:** shipped.

### No code echo — `plus.1`
- **Behavior:** `ctx_execute`/`ctx_execute_file` return only the output (`ctx_execute_file` keeps a `path=` line); the code is still indexed under `<source>:code` for search provenance.
- **Status:** shipped, verified live.

### User rules as the single source — `plus.1`
- **Behavior:** SessionStart injects `<config dir>/context-mode-usage.md` as `<context_mode_rules>` (≤ 64 KB) instead of the built-in block; falls back to upstream's block when the file is missing or blank.
- **Status:** shipped, verified live. Requires removing the file's `@import` from `CLAUDE.md` to avoid double injection.

### Tool-aware subagent injection — `plus.1`
- **Behavior:** Agent prompts get the rules only if the agent can call `ctx_*` (built-in table + agent frontmatter `tools:` from user, project or plugin agents; unknown → inject). Rules are separated from the prompt by a blank line.
- **Status:** shipped; injection verified live, the "no tools → nothing" path covered by tests.

### RTK awareness — `plus.1`, doctor fixes `plus.2`
- **Behavior:** with RTK's Bash hook in settings, Bash redirects deny instead of rewriting; `doctor` and `ctx_doctor` report RTK version/edition and warn on pipelines that would compress `ctx_*` output (`after_tool.mcp`/`any`), contend for Read (`before_tool.read`) or alter Read output (non-lockfile `after_tool.read`).
- **Status:** shipped, verified live with RTK 1.0.1.

### Event-driven nudges — `plus.1`
- **Behavior:** PostToolUse advises `ctx_execute_file` after a Read ≥ 8 000 chars without offset/limit, and `ctx_execute` after a Bash output ≥ 5 000 chars, on the 1st, 6th, 11th… occurrence per session; nothing for subagents without `ctx_*`. The once-per-session PreToolUse advice is gone.
- **Status:** shipped, both nudges verified live.

### Batch dedup — `plus.1`
- **Behavior:** a section matched by several `ctx_batch_execute` queries is shown once; later queries point to it.
- **Status:** shipped.

### Timeline returns recent entries — `plus.3`
- **Behavior:** `ctx_search` with `sort: "timeline"` keeps the newest `limit` matches, still listed oldest → newest.
- **Status:** shipped, verified against real data.

### Planned
- Honest labels for persistent content-store results (`"knowledge-base"` with the real indexing time) — see [ROADMAP.md](ROADMAP.md).
