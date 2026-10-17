# Summary

context-mode-plus is a public fork of [mksglu/context-mode](https://github.com/mksglu/context-mode) — an MCP server and Claude Code hook set that keeps large tool outputs out of the model's context by running code in a sandbox and indexing results in SQLite FTS5. The fork tunes it for one heavy Claude Code setup (many plugins, RTK, custom rules files): it injects the user's own rules once, injects into subagents only when they can use `ctx_*`, nudges after the fact instead of once per session, cooperates with RTK 1.0.x, and stops echoing back text the model already has. It stays a patch fork: upstream's structure and its 12 platform adapters are kept, so upstream fixes can still be merged.

## Current status

- Released: `1.0.169-plus.3` (2026-10-16), installed as `context-mode@context-mode-plus` from this repo's own marketplace.
- Verified live in real sessions: rules injection, no code echo, Read/Bash nudges, subagent rules injection, `ctx_doctor` RTK line, recent-first `ctx_search` timeline.
- Full suite green (221 files, ~4.8k tests).

## Top priorities

1. RTK stage 2: enable `rtk:posthook` after a week of `rtk gain` baseline (~2026-10-23) — see [ROADMAP.md](ROADMAP.md).
2. Fix the misleading `"current-session"` label on persistent content-store results (planned `plus.4`).
3. Session-data retention (VACUUM + age cap) so `~/.claude/context-mode` stops growing.

Product goals and constraints: [PRD.md](PRD.md). Feature list: [FEATURES.md](FEATURES.md).
