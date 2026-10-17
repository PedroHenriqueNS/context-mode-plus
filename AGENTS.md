# AGENTS.md

Guide for any AI agent (or human) working on **context-mode-plus**.

## Project overview

context-mode-plus is a public patch fork of [mksglu/context-mode](https://github.com/mksglu/context-mode) 1.0.169, kept under the Elastic License 2.0. context-mode is an MCP server plus a set of Claude Code hooks: code runs in a sandbox, large outputs are indexed in SQLite FTS5 rather than dumped into the model's context, session events are captured for recall, and routing hooks steer the model toward the sandbox tools. The fork keeps upstream's structure and adds small, isolated changes for one heavy Claude Code user: the user's own rules file as the single injected rules source, subagent injection limited to agents that can call `ctx_*`, event-driven nudges, RTK 1.0.x awareness, no code echo, batch dedup, and fork-owned upgrade/version signals. See [docs/SUMMARY.md](docs/SUMMARY.md) for status and [docs/fork/README.md](docs/fork/README.md) for the upstream ↔ fork identity table.

## Tech stack

TypeScript (strict, ESM/NodeNext) on Node ≥ 22.5, bundled with esbuild, tested with vitest, SQLite through `better-sqlite3`, MCP through `@modelcontextprotocol/sdk`. Hooks are plain `.mjs`. Details and versions: [docs/STACK.md](docs/STACK.md).

## Repository structure

```
src/                 TypeScript sources (compiled to build/, bundled to *.bundle.mjs)
  server.ts          MCP server and every ctx_* tool handler
  store.ts           FTS5 content store (index, search, chunking)
  executor.ts        sandboxed polyglot executor
  security.ts        deny/allow permission evaluation
  cli.ts             `context-mode` CLI (setup, doctor, upgrade, …)
  rtk-doctor.ts      fork: RTK checks for doctor / ctx_doctor
  session/           SessionDB, event extraction, snapshots, analytics
  search/            unified search (ctx_search), auto-memory
  adapters/          one adapter per host platform (claude-code, codex, …)
  util/              config dirs, project dir, version compare, …
hooks/               plain JS hooks (.mjs), no build step; *.bundle.mjs are build outputs
  core/              routing + fork modules (user-rules, subagent-tools, rtk, post-nudges)
tests/               vitest suites; tests/plus/ holds the fork's own tests
docs/                living docs (this set), upstream ADRs (docs/adr/), fork notes (docs/fork/)
start.mjs            MCP entry: self-heal, then loads server.bundle.mjs (or build/server.js)
.claude-plugin/      Claude Code plugin + marketplace manifests
skills/              plugin skills (ctx-doctor, ctx-stats, …)
```

Architecture and data flow: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Development workflow

```bash
bun install --frozen-lockfile   # deps from bun.lock (never npm install: it drifts the bundles)
npm run build                   # tsc + esbuild bundles + bundle/drift assertions
npm test                        # pretest runs the build, then vitest run
npm run typecheck               # tsc --noEmit
npx tsx src/cli.ts doctor       # diagnostics against the local tree
```

Before committing, run `git status`: a full `npm test` must leave the tree clean. Releases bump `package.json` and run `node scripts/version-sync.mjs` (see [docs/CONVENTIONS.md](docs/CONVENTIONS.md#releases)).

## Coding conventions

All rules live in [docs/CONVENTIONS.md](docs/CONVENTIONS.md), which wins over anything here. The ones that bite most often: keep diffs vs upstream small and isolated, put new logic in new modules, hooks fail open, never hand-edit a bundle, and tests never touch the real `~/.claude`.

## Commit and PR conventions

Conventional Commits with the `plus` scope for fork work (`feat(plus): …`, `fix(plus): …`). No AI attribution of any kind in commits, merge commits or PRs. Branches are `<type>/<short-kebab-slug>`. Details: [docs/CONVENTIONS.md](docs/CONVENTIONS.md#conventional-commits).

## Testing expectations

Every behavior change ships with a vitest test (TDD: red first). Fork tests go in `tests/plus/`. Tests that spawn `start.mjs` or hooks must isolate `HOME` and `CLAUDE_CONFIG_DIR`. The full suite must pass before merge. Details: [docs/CONVENTIONS.md](docs/CONVENTIONS.md#testing).

## Known pitfalls

Read [docs/PITFALLS.md](docs/PITFALLS.md) before touching bundles, versions, plugin cache paths, or tests that spawn the server.

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
