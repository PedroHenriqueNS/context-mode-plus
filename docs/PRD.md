# Product Requirements — context-mode-plus

## Problem

Upstream context-mode works, but in a setup with ~40 plugins, RTK and several global rules files it leaves measurable waste and friction (study of 30 days of transcripts, 2026-10-16):

- The routing rules reach the model twice (the plugin's ~4.9 KB SessionStart block plus the user's own rules file imported from `CLAUDE.md`), and every subagent prompt gets another ~4.8 KB — including subagents that cannot call `ctx_*` at all.
- Nudges fire once per session, so they do not change behavior: in the measured period the sandbox tools were used far less than Bash/Read, and most large Reads were of files never edited.
- `ctx_execute` echoes the code the model just wrote (~14.5% of what those tools returned), and `ctx_batch_execute` repeats identical sections across queries (~12.8%).
- Bash rewrites could collide with RTK's PreToolUse rewrite, and nothing in context-mode knew about RTK 1.0's pipelines.
- `ctx-upgrade` and the version check pointed at upstream, so a fork would be overwritten on the next upgrade.

## Target users

Primary: the fork's owner, a heavy Claude Code user on macOS with RTK and many plugins. Secondary: anyone with a similar setup who installs the public fork.

## Goals

- Cut injected and echoed context without losing any sandbox/search capability.
- Make nudges react to what actually happened (a large Read or Bash output).
- Coexist cleanly with RTK 1.0.x (defer Bash rewrites, report pipeline conflicts in doctor).
- Keep upgrades and version signals on the fork.
- Keep the diff vs upstream small enough to keep merging upstream fixes.

## Non-goals

- Removing the other 11 platform adapters (deferred; widens the upstream diff).
- Replacing upstream's architecture, storage format or tool set.
- Publishing to npm or offering the fork as a managed service (also barred by ELv2).
- Owning session memory for other tools (claude-mem's observer is disabled on the owner's machine; that is configuration, not fork code).

## Success metrics

- Context saved: conservative estimate ~5.1 M tokens / 30 days (~3.3 k per session), up to ~10 M if the event nudges shift 50% of large Reads/Bash to the sandbox. Measure with `ctx stats` and transcript analysis; compare with `rtk gain` to avoid double counting.
- No regressions: full test suite green; hooks never block a tool call (fail-open).
- Upstream mergeability: an upstream release can be merged with conflicts limited to the files the fork touches.

## Constraints

- Licence: Elastic License 2.0 — keep `LICENSE` and notices, state clearly it is a fork, no managed-service offering.
- Plugin identity: internal name stays `context-mode` so tool names (`mcp__plugin_context-mode_context-mode__*`) and the owner's rules keep working; marketplace and key are `context-mode-plus`.
- Hooks run on every tool call: no process spawn, minimal file I/O, ~40–60 ms budget.
- Primary host is Claude Code; other adapters must keep compiling and passing their tests.

> TODO: Decide whether a public changelog/announcement is wanted for users other than the owner.
