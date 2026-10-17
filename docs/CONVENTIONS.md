# context-mode-plus — Conventions

Canonical home for project coding rules. Every rule that applies across the codebase lives here — naming, call-site patterns, error shapes, banned shortcuts, library choices, branching and PR workflow, anything else.

When a rule conflicts with what's in `AGENTS.md`, `CLAUDE.md`, the spec docs, or any inline comment, **this file wins**. The other files should be updated to match.

New conventions land HERE in the same PR that establishes them — never in commit messages, AI-assistant private notes, or buried inline comments.

---

## Languages and code style

- TypeScript in `src/` with `strict: true`, ESM and `NodeNext` resolution: relative imports carry the `.js` suffix (`import { probeRtk } from "./rtk-doctor.js"`).
- Hooks, `start.mjs` and `scripts/` are plain `.mjs` with no build step. Shared hook logic goes in `hooks/core/*.mjs` as small pure functions that tests can import directly.
- Follow upstream's style in the file you touch; do not reformat unrelated code.

## Fork discipline (patch fork)

- Keep the diff vs upstream small and isolated: new behavior goes in a new module; existing files only gain the call site. Mark fork-specific lines with a short `// context-mode-plus:` comment explaining why.
- Do not restructure, rename or delete upstream code you are not changing. The 12 platform adapters stay.
- Plugin identity is fixed: internal name `context-mode`, marketplace `context-mode-plus`, key `context-mode@context-mode-plus`, repo `PedroHenriqueNS/context-mode-plus`. Never change the internal name — it is the MCP tool-name prefix.
- Upgrade and version signals must point at the fork, never at upstream npm or GitHub.
- Licence (ELv2): keep `LICENSE` and copyright notices; the README states it is a fork.

## Hooks

- Fail open: catch everything, emit nothing on error, exit 0.
- At most one stdout write per hook, last, valid JSON in the host's format (`hookSpecificOutput` for Claude Code).
- No process spawns and no network in hooks; read at most a few small files. Do expensive checks (`rtk --version`, `rtk pipeline show`) only in doctor.
- User-facing nudge and doctor strings are in Portuguese (the owner's language); code, comments and logs are in English.

## Bundles

- `server.bundle.mjs`, `cli.bundle.mjs` and `hooks/*.bundle.mjs` are build outputs: never edit them by hand, always commit them together with the `src/` change that produced them.
- Build them from `bun install --frozen-lockfile` deps with `npm run build`. Never `npm install` without a lockfile (esbuild drift).
- On upstream merges, rebuild bundles; never merge bundle conflicts by hand.

## Releases

- Version format `X.Y.Z-plus.N` (upstream base + fork counter). Bump `package.json`, run `node scripts/version-sync.mjs` (syncs every manifest), rebuild, add a `docs/fork/CHANGELOG.md` entry (Portuguese), commit `fix(plus): …; release X.Y.Z-plus.N` or `chore(release): …`, annotated tag `vX.Y.Z-plus.N`, push `main` and the tag.
- Tests must not pin the release number (assert the `-plus.N` format and manifest sync instead).
- Any code that sorts or compares versions uses `compareVersions` from `src/util/version-compare.ts`.

---

## Branching and PR workflow

- Branch names: `<type>/<short-kebab-slug>` describing the change (`fix/timeline-recent`, `docs/project-living-docs`). Never adopt a tracker's auto-generated branch name.
- Work on a branch, merge into `main` locally or through a PR on `PedroHenriqueNS/context-mode-plus`; `main` is what users install.
- `upstream` remote = `mksglu/context-mode`. Pull upstream changes with a merge into a branch, rebuild bundles, run the full suite, then merge.

---

## Conventional Commits

- Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.
- Scope `plus` for fork behavior (`feat(plus): …`); `fork` for identity/infra of the fork (`chore(fork): …`); no scope or upstream's scope for upstream-style fixes.
- No AI attribution anywhere: no `Co-Authored-By` for an assistant, no "Generated with" footer, in commits, merge commits and PRs.

---

## Testing

- vitest; fork tests in `tests/plus/<feature>.test.ts`. TDD: write the failing test, see it fail, then implement.
- Any test that spawns `start.mjs`, the MCP server or a hook must set `HOME` and `CLAUDE_CONFIG_DIR` to a temp directory (import `tests/setup-home.ts` or set them in the spawn env). The suite must leave `~/.claude`, `hooks/hooks.json` and `git status` untouched.
- Tests that spawn a server wait for its exit before deleting their temp directory.
- Full `npm test` must pass before merging to `main`; a known flaky test (`win-sandbox-782-788` temp-dir race) may be re-run once.

---

## Diagramming

> Mermaid only (plain text → agent-readable, diffable, renders for humans; never an exported image). Diagram a flow only when it has branching, ordering that matters, or 4+ non-obvious relationships AND is stable. Otherwise use prose, tables, or ASCII trees. Topology goes in the diagram; constraints ("idempotent", "never retry on 4xx") go in prose beside it. Derive strictly from code, cap ~7 nodes (split bigger flows), and update any diagram in the same commit as the code change it depicts.

---

## Documentation maintenance

Same map as in `AGENTS.md`: architecture → `ARCHITECTURE.md` (and its diagram in the same commit); features → `FEATURES.md`; gotchas → `PITFALLS.md`; stack/version → `STACK.md`; scope → `PRD.md` + `SUMMARY.md`; rules → this file; phases/priorities → `ROADMAP.md`; every release → `docs/fork/CHANGELOG.md`. If a doc update is skipped, say why in the commit message.

---

## Where conventions live

| Scope | File |
|---|---|
| This file | Project-wide coding rules |
| Past failures + fixes | `docs/PITFALLS.md` |
| Upstream design decisions | `docs/adr/` |
| Fork identity, bundle and version rules (summary) | `docs/fork/README.md` |

When establishing a new convention (in code review, brainstorming, direct user instruction), add it HERE in the same PR.
