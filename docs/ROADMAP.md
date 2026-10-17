# Roadmap

Item numbers refer to the improvement list in the owner's (local-only) study, `docs/fork/private/context-mode-fork-analise.md`.

## Phase 1 — Fork foundation (P0 + P1) — done (2026-10-16)

Shipped in `1.0.169-plus.1` → `plus.3`:

- Fork identity, fork-owned upgrade/version signals, `-plus.N` version ordering (P0).
- No code echo (7b), batch dedup (7c), user rules as single source (4), tool-aware subagent injection (3), event-driven nudges (5), RTK 1.0.x awareness incl. doctor (6).
- Owner's machine migrated: RTK 1.0.1, claude-mem observer off, upstream plugin and marketplace removed, old session files (> 30 days) moved to Trash.
- Test suite isolated from the real `~/.claude`.
- Timeline search returns recent entries (`plus.3`).

## Phase 2 — In flight / next

| Item | Target | Notes |
|---|---|---|
| RTK stage 2: enable `rtk:posthook` | ~2026-10-23 | Compare `rtk gain` before/after; keep `ctx doctor` warning-free |
| Honest content-store labels | `plus.4` | Replace the hard-coded `"current-session"` origin; fix the `ctx_search` description ("relevance only ranks the current session" is false) |
| Session-data retention (item 9) | `plus.4`/`plus.5` | VACUUM + `wal_checkpoint(TRUNCATE)`, age cap for session files, `ctx purge --older-than` |

## Phase 3 — Later

| Item | Notes |
|---|---|
| Read-only allow-list for the project boundary (item 8) | e.g. `CONTEXT_MODE_EXTRA_ROOTS=~/.claude`, opt-in |
| Narrower PreToolUse `mcp__` matcher (item 11) | Skip host tools (`ccd_*`, computer-use…) |
| Deferred minors from the Phase 1 reviews | Image/PDF Reads can get a misleading nudge; `getUpgradeHint` still says `npm update -g`; doctor label "npm (MCP)"; RTK hook detection misses empty/`*` matchers |

## Deferred / not planned

- Removing the 11 unused platform adapters (item 10) — widens the upstream diff; revisit only if upstream stops changing.
- Treating `rtk`-prefixed commands specially and standing down the Read nudge when RTK has read rules — moot after the event-nudge redesign.

> TODO: Decide a cadence for merging upstream releases (upstream had no code commits between 2026-06-29 and 2026-10-16).
