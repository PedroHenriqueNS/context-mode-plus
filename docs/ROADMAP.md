# Roadmap

Item numbers refer to the improvement list in the owner's (local-only) study, `docs/fork/private/context-mode-fork-analise.md`.

## Phase 1 — Fork foundation on 1.0.169 — done (2026-10-16)

`1.0.169-plus.1` → `plus.3`: fork identity, no code echo, batch dedup, user rules as single source, tool-aware subagent injection, event-driven nudges, RTK awareness, timeline returning recent entries, tests isolated from `~/.claude`.

## Phase 2 — Rebase on upstream 2.x — `2.1.7-plus.1` (2026-11-10)

Upstream 2.0 is a full rewrite. The fork took its tree and kept only what 2.x still lacks:

| 1.x fork feature | In 2.1.7-plus.1 |
|---|---|
| Fork identity, update and version signals | Ported (Claude Code key `context-mode@context-mode-plus`, D1 tags and issues from the fork repo) |
| Timeline returns recent entries | Ported (2.x returns the oldest first) |
| Tests isolated from `~/.claude` | Ported in the gate (temp `HOME`, no `CLAUDE_CONFIG_DIR`) |
| No code echo, batch dedup | Covered upstream |
| Event-driven nudges, subagent filter, registry heal, RTK Bash deferral, content-store labels | Moot in 2.x's design |
| User rules as single source | `@context-mode-usage.md` in `~/.claude/CLAUDE.md` (no code) |
| RTK section in doctor | Dropped |

## Phase 3 — Next

| Item | Notes |
|---|---|
| Events journal retention (item 9) | 2.x prunes sources after 30 days and caps the DB at 500 MB, but never prunes the events journal; `ctx_purge` has no age option |
| Merge cadence for upstream releases | Upstream shipped 2.1.0 → 2.1.7 in four days; merge each tag into a branch, rerun the gate, fix identity pins |
| Narrower PreToolUse `mcp__` matcher (item 11) | Recheck against 2.x's matcher before porting |

## Deferred / not planned

- RTK checks in doctor: dropped with the 2.x rebase; revisit only if RTK and 2.x collide.
- Removing unused agent adapters: widens the upstream diff.
