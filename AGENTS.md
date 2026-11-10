# AGENTS.md

Guide for any AI agent (or human) working on **context-mode-plus**.

## Project overview

context-mode-plus is a public fork of [mksglu/context-mode](https://github.com/mksglu/context-mode), kept under the Elastic License 2.0. Since `2.1.7-plus.1` it is based on upstream 2.x, a full rewrite: an MCP server plus hooks for 10 coding agents, where code runs in a sandbox, large outputs are indexed in SQLite FTS5 (`node:sqlite`), and only the answer enters the model's context. The fork keeps upstream's tree and changes as little as possible: its own identity (Claude Code installs `context-mode@context-mode-plus` from this repo, and updates, release tags and issue reports point here), a newest-first `ctx_search` timeline, a gate that cannot reach the real `~/.claude`, and its living docs. See [docs/SUMMARY.md](docs/SUMMARY.md) for status and [docs/fork/README.md](docs/fork/README.md) for the upstream ↔ fork identity table.

## Tech stack

TypeScript run directly by Node ≥ 24.15 (type stripping, `node:sqlite`), bundled with esbuild 0.24, tested with `node --test`, MCP through `@modelcontextprotocol/sdk`. No Bun, no better-sqlite3, no committed lockfile. Details: [docs/STACK.md](docs/STACK.md).

## Repository structure

```
src/core/            contracts (constants, types), store (FTS5), tools (ctx_*), hooks, policy, ops (doctor, upgrade)
src/adapters/        one file per supported agent (claude-code, codex, gemini, qwen, …)
src/entries/         server, hook and CLI entry points
src/setup/ src/cli/  `context-mode setup|doctor|upgrade`
build/               build scripts (build.mjs, manifests.ts, main-tree.mjs, check-*.mjs)
tests/               flat unit tests, tests/NNNN-<area>.test.mjs (docs/architecture/TEST-LAYOUT.md)
e2e/                 golden-path cases and live harness
plugins/claude-code/ the built Claude Code plugin, written by a release (never by hand)
.claude-plugin/      the marketplace this repo serves (name context-mode-plus)
docs/architecture/   upstream's ADRs and specs; docs/*.md (upper case) and docs/fork/ are the fork's docs
```

Architecture: upstream's [docs/architecture/](docs/architecture/) and [docs/how-it-works.md](docs/how-it-works.md); fork view in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Development workflow

```bash
npm install                     # dev tooling only; nothing from node_modules ships
npm run build                   # node build/build.mjs --out release-out
npm run typecheck               # tsc --noEmit
node scripts/gate.mjs --all     # build, tsc, unit tests, ci checks, e2e cases (temp HOME)
node --test tests/<file>        # one test file
```

Run tests with a temp `HOME` (the gate does this for you). Releases follow [docs/CONVENTIONS.md](docs/CONVENTIONS.md#releases).

## Coding conventions

All rules live in [docs/CONVENTIONS.md](docs/CONVENTIONS.md), which wins over anything here. The ones that bite most often: keep diffs vs upstream small and marked `context-mode-plus:`, rebrand only what the fork's users see, never hand-edit `plugins/claude-code/`, and tests never touch the real `~/.claude`.

## Commit and PR conventions

Conventional Commits with the `plus` scope for fork work (`feat(plus): …`, `fix(plus): …`). No AI attribution of any kind in commits, merge commits or PRs. Branches are `<type>/<short-kebab-slug>`. Details: [docs/CONVENTIONS.md](docs/CONVENTIONS.md#conventional-commits).

## Testing expectations

Every behavior change ships with a `node --test` test (TDD: red first), placed in the flat test file that owns its area (`docs/architecture/TEST-LAYOUT.md`); fork identity tests live in `tests/0007-identity.test.mjs`. Tests run with a temp `HOME` and without `CLAUDE_CONFIG_DIR`. The gate must pass before merge, except the two Claude Code release-smoke cases that need a machine without `claude` on PATH. Details: [docs/CONVENTIONS.md](docs/CONVENTIONS.md#testing).

## Known pitfalls

Read [docs/PITFALLS.md](docs/PITFALLS.md) before touching identity strings, releases, or tests that run real agents.

## Documentation maintenance

These files are living documents. When you make changes to this project, update the relevant docs in the same commit:

- Architectural change → update `docs/ARCHITECTURE.md`
- Architectural change that alters a flow depicted in a Mermaid diagram → update that diagram in the SAME commit (a stale diagram misleads agents because it looks authoritative). Diagram topology only; keep constraints in the prose beside it.
- New feature or feature change → update `docs/FEATURES.md`
- Discovered a gotcha → add to `docs/PITFALLS.md`
- Stack change (new dep, version bump, service) → update `docs/STACK.md`
- Scope or requirements change → update `docs/PRD.md` and `docs/SUMMARY.md`
- New coding rule, banned shortcut, or workflow convention → add to `docs/CONVENTIONS.md` (THE source of truth — never bury rules in commit messages, AGENTS.md prose, or private notes)
- Phase reached or priorities shifted → update `docs/ROADMAP.md`

If you skip a doc update, note why in the commit message.
