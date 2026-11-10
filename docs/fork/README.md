# context-mode-plus (fork notes)

context-mode-plus is a fork of [mksglu/context-mode](https://github.com/mksglu/context-mode), kept under the original Elastic License 2.0. Since `2.1.7-plus.1` it is based on upstream 2.x; `1.0.169-plus.3` was the last release on the 1.x base.

| | Upstream | This fork |
|---|---|---|
| Repository | `mksglu/context-mode` | `PedroHenriqueNS/context-mode-plus` |
| Claude Code marketplace | `context-mode` | `context-mode-plus` |
| Claude Code plugin key | `context-mode@context-mode` | `context-mode@context-mode-plus` |
| Other agents' ids (Codex, ZCode, …) | `context-mode@context-mode` | unchanged |
| Plugin name (tool names) | `context-mode` | `context-mode` (unchanged: `mcp__plugin_context-mode_context-mode__*`) |
| Version | `2.1.7` | `2.1.7-plus.N` |
| Update, doctor D1 tags, issue reports | upstream repo and npm | this repo |

Install: `claude plugin marketplace add PedroHenriqueNS/context-mode-plus`, then `claude plugin install context-mode@context-mode-plus`. Update: `claude plugin marketplace update context-mode-plus && claude plugin update context-mode@context-mode-plus` (what `ctx_upgrade` prints). The fork is not published to npm.

The user's own rules (`~/.claude/context-mode-usage.md`) are not injected by the plugin in 2.x; `~/.claude/CLAUDE.md` imports them with `@context-mode-usage.md`.
