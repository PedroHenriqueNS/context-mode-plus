# Stack

Base: upstream context-mode 2.1.7. Upstream's own reference: [docs/architecture/](architecture/).

## Languages and runtime

| Item | Version | Notes |
|---|---|---|
| Node.js | ≥ 24.15.0 (`engines`) | Runs the TypeScript in `src/` directly (type stripping); first version with `node:sqlite` unflagged. Owner's machine: 24.22 |
| TypeScript | ^5.7 | `tsc --noEmit` only (type check); no compile step |
| SQLite | `node:sqlite` | One `context.db` per project under `~/.context-mode`; FTS5 Porter + trigram tables |

No Bun and no native modules.

## Dependencies

Everything is dev-only: `npm install` brings the build and test tooling, and the shipped plugin is self-contained bundles.

| Package | Version | Used for |
|---|---|---|
| esbuild | 0.24.0 | `server.mjs`, `hook.mjs`, `cli.mjs` bundles (target node24) |
| `@modelcontextprotocol/sdk`, `@modelcontextprotocol/server` | ^1.26 / 2.3.1 | MCP server, bundled |
| zod | ^3.25 | tool input schemas, bundled |
| `@clack/prompts` | ^1.0.1 | CLI prompts, bundled |
| htmlparser2 | ^12 | HTML → Markdown for `ctx_index` with `url` |
| typescript, `@types/node` | ^5.7, ^22.19 | type check |

`package-lock.json` is git-ignored upstream; the fork follows that.

## Build and release outputs

`npm run build` = `node build/build.mjs --out release-out` (bundles, manifests, `SHA256SUMS`). A release writes the built Claude Code plugin to `plugins/claude-code/` and the marketplace files ([CONVENTIONS.md](CONVENTIONS.md#releases)).

## Distribution

- Claude Code: `claude plugin marketplace add PedroHenriqueNS/context-mode-plus`, then `claude plugin install context-mode@context-mode-plus`.
- Not published to npm. Upstream's `release.yml` (npm publish) is not used by the fork.

## Tests and CI

- `node --test` unit files in `tests/`, e2e cases in `e2e/`, all run by `node scripts/gate.mjs --all` with a temp `HOME`.
- `.github/workflows/ci.yml` is upstream's (Ubuntu, macOS, Windows).

## External integrations

| Integration | Version | Relationship |
|---|---|---|
| Claude Code | 2.1.x | Primary host: plugin hooks (`hooks/claude-code.json`) + MCP server |
| RTK (rtk-ai/rtk) | 1.0.1 on the owner's machine | Separate Bash PreToolUse hook. v2 never rewrites Bash input, so they do not collide; v2's PostToolUse replace also shortens RTK's output over 4 KB (`CTX_REPLACE_TRIGGER_BYTES`). No RTK check in doctor |
| Other agents (Codex, Gemini CLI, Qwen, Pi, OpenCode, Copilot CLI, Kiro, VS Code, ZCode) | — | Upstream adapters kept, not exercised by the owner |
