# Stack

## Languages and runtime

| Item | Version | Notes |
|---|---|---|
| TypeScript | ^5.7 | `strict: true`, `module`/`moduleResolution: NodeNext`, target ES2022, `src/` → `build/` |
| Node.js | ≥ 22.5 (`engines`) | CI pins 22.5; owner's machine runs 24.x |
| Plain JavaScript (`.mjs`) | — | `hooks/`, `start.mjs`, `scripts/` run unbuilt |
| Bun | 1.3.x | Installs deps from `bun.lock`; the executor prefers Bun for JS/TS when present |

## Runtime dependencies

| Package | Version | Used for |
|---|---|---|
| `@modelcontextprotocol/sdk` | ^1.26.0 | MCP server transport and tool registry |
| `better-sqlite3` | ^12.6.2 | SessionDB and ContentStore (FTS5) — native module, external to bundles |
| `zod` | ^3.25.0 | Tool input schemas |
| `turndown` + `turndown-plugin-gfm` + `@mixmark-io/domino` | ^7.2 / ^1.0 / ^2.2 | HTML → Markdown for `ctx_fetch_and_index` |
| `@clack/prompts` | ^1.0.1 | CLI prompts (`setup`, `doctor`, `upgrade`) |
| `picocolors` | ^1.1.1 | CLI colors |

## Dev tooling

| Tool | Version | Used for |
|---|---|---|
| esbuild | ^0.27.3 | `server.bundle.mjs`, `cli.bundle.mjs`, `hooks/*.bundle.mjs` |
| vitest | ^4.0.18 | Test runner (`npm test`) |
| tsx | ^4.21.0 | Running TS directly (`npx tsx src/cli.ts doctor`) |
| `@types/*` | — | node, better-sqlite3, turndown |

## Build outputs

`npm run build` = `tsc` → `build/`, then esbuild bundles, then `scripts/assert-bundle.mjs` and `scripts/assert-asymmetric-drift.mjs`. Bundles are committed (the plugin runs from the git checkout Claude Code installs). Rules for producing them: [CONVENTIONS.md](CONVENTIONS.md#bundles).

## Distribution

- Claude Code plugin from this repo's own marketplace: `/plugin marketplace add PedroHenriqueNS/context-mode-plus`, then `/plugin install context-mode@context-mode-plus`.
- Manifests: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` (plus other platforms' manifests kept from upstream).
- Not published to npm.

## CI

GitHub Actions `.github/workflows/ci.yml`: Ubuntu, macOS and Windows on Node 22.5 — install, typecheck, build, bundle assertions, tests, CLI doctor. CI never commits bundles (upstream's `bundle.yml` bot was removed).

## External integrations

| Integration | Version | Relationship |
|---|---|---|
| Claude Code | — | Primary host: MCP server + hooks (`hooks/hooks.json`) |
| RTK (rtk-ai/rtk) | 1.0.1 on the owner's machine | Separate PreToolUse/PostToolUse hooks; the fork detects RTK's Bash hook and reads `rtk pipeline show` in doctor |
| Other agents (Codex, Gemini CLI, Cursor, OpenCode, Pi, …) | — | Upstream adapters kept, not exercised by the owner |

> TODO: Record the RTK `rtk:posthook` decision and its measured effect once stage 2 runs (~2026-10-23).
