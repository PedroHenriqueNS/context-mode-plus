# context-mode-plus — Conventions

Canonical home for project coding rules. Every rule that applies across the codebase lives here — naming, call-site patterns, error shapes, banned shortcuts, library choices, branching and PR workflow, anything else.

When a rule conflicts with what's in `AGENTS.md`, `CLAUDE.md`, the spec docs, or any inline comment, **this file wins**. The other files should be updated to match.

New conventions land HERE in the same PR that establishes them — never in commit messages, AI-assistant private notes, or buried inline comments.

---

## Languages and code style

- TypeScript in `src/` with `strict: true` and ESM; Node runs it directly (type stripping), so tests import `.ts` files. Build and release scripts in `build/` and `scripts/` are `.mjs` or `.ts`.
- Shared literals live in `src/core/contracts/constants.ts`; prefer a constant over a repeated string.
- Follow upstream's style in the file you touch; do not reformat unrelated code.

## Fork discipline

- The fork is upstream's v2 tree plus the smallest diff that gives it its own identity and fixes. Do not restructure, rename or delete upstream code you are not changing. Mark every fork line with a short `// context-mode-plus:` comment saying why.
- Identity: internal name `context-mode` (`SERVER_KEY`, the MCP tool-name prefix — never change it); Claude Code marketplace `context-mode-plus` (`CLAUDE_MARKETPLACE_NAME`), key `context-mode@context-mode-plus`; repo `PedroHenriqueNS/context-mode-plus` (`FORK_REPO_SLUG`). Other agents keep upstream's ids (`PLUGIN_MARKETPLACE_NAME = "context-mode"`): their marketplace files are not renamed.
- Update commands, release tags (doctor D1) and issue reports point at the fork, never at upstream. Strings that only detect old upstream installs stay upstream's.
- Never open an issue or PR on upstream; every change lands in this fork.
- Licence (ELv2): keep `LICENSE` and copyright notices; the README states it is a fork.

## Build output

- `plugins/claude-code/`, the root `.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`, `gemini-extension.json`, `qwen-extension.json` and `hooks/*.json` are written by a release (`build/main-tree.mjs`). Never edit them by hand.
- `release-out/` is a local build output and is git-ignored.

## Releases

- Version `X.Y.Z-plus.N`: upstream base + fork counter. Doctor D1 treats `plus` as its own channel and reads `vX.Y.Z-plus.N` tags from the fork repo.
- Steps, on `main` with a clean tree and a green gate:
  1. `node build/build.mjs --out release-out --sha "$(git rev-parse HEAD)" --version X.Y.Z-plus.N`
  2. `node build/main-tree.mjs --pkg release-out --repo . --version X.Y.Z-plus.N` writes `plugins/claude-code/` and the marketplace files.
  3. Set `version` in `package.json` and `.claude-plugin/plugin.json` to `X.Y.Z-plus.N`, add a `docs/fork/CHANGELOG.md` entry (Portuguese).
  4. Commit `chore(release): vX.Y.Z-plus.N` as the owner (not upstream's bot), annotated tag `vX.Y.Z-plus.N`, push `main` and the tag.
- Upstream's `release.yml` publishes to npm and is not used by the fork.

---

## Branching and PR workflow

- Branch names: `<type>/<short-kebab-slug>` describing the change (`fix/timeline-recent`, `docs/project-living-docs`). Never adopt a tracker's auto-generated branch name.
- Work on a branch, merge into `main` locally or through a PR on `PedroHenriqueNS/context-mode-plus`; `main` is what users install.
- `upstream` remote = `mksglu/context-mode`. Pull an upstream release with a merge of its tag into a branch, rerun the gate, fix the identity pins it brings, then merge.

---

## Conventional Commits

- Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.
- Scope `plus` for fork behavior (`feat(plus): …`); `fork` for identity/infra of the fork (`chore(fork): …`); no scope or upstream's scope for upstream-style fixes.
- No AI attribution anywhere: no `Co-Authored-By` for an assistant, no "Generated with" footer, in commits, merge commits and PRs.

---

## Testing

- `node --test`, flat files `tests/NNNN-<area>.test.mjs`; a new test goes in the file that owns its area (`docs/architecture/TEST-LAYOUT.md`). TDD: write the failing test, see it fail, then implement.
- Fork identity tests live in `tests/0007-identity.test.mjs`. Upstream tests that pinned upstream's identity are updated to the fork's, never deleted or skipped.
- Run tests with a temp `HOME` and without `CLAUDE_CONFIG_DIR` / `CONTEXT_MODE_DATA_DIR`; `scripts/gate.mjs` does it for every layer. Some cases run the real `claude` and an uninstall.
- `node scripts/gate.mjs --all` must pass before merging to `main`. Known machine failures: the two `release/smoke: claude-code with … no claude on PATH` cases fail where `claude` is installed.

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
| Fork identity and version rules (summary) | `docs/fork/README.md` |

When establishing a new convention (in code review, brainstorming, direct user instruction), add it HERE in the same PR.
