# Summary

context-mode-plus is a public fork of [mksglu/context-mode](https://github.com/mksglu/context-mode) — a plugin that keeps large tool outputs out of a coding agent's context by running code in a sandbox and indexing results in SQLite FTS5. Since `2.1.7-plus.1` it is upstream's 2.x tree (a full rewrite) with the smallest diff that gives it its own identity: Claude Code installs `context-mode@context-mode-plus` from this repo, and updates, release tags and issue reports point here. On top of that it returns the newest entries from a `ctx_search` timeline and runs its gate away from the real `~/.claude`.

## Current status

- Released: `2.1.7-plus.1` (2026-11-10), based on upstream `v2.1.7`. The 1.x line ended at `1.0.169-plus.3`.
- Gate: 2,844 unit tests pass; the two Claude Code release-smoke cases fail on a machine with `claude` installed, as they do upstream. e2e: one case (`GP1/opencode-clientinfo-detect`) fails, reported as failing on upstream too. The paid live layer was not run.
- The owner's rules file reaches Claude Code through `@context-mode-usage.md` in `~/.claude/CLAUDE.md`, not through the plugin.

## Top priorities

1. Install `2.1.7-plus.1` from this repo and confirm `/ctx-doctor` in a real session.
2. Events journal retention (2.x never prunes it) — see [ROADMAP.md](ROADMAP.md).
3. A cadence for merging upstream 2.x releases.

Product goals and constraints: [PRD.md](PRD.md). Fork identity: [fork/README.md](fork/README.md).
