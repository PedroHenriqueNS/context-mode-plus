# context-mode-plus (fork notes)

context-mode-plus is a fork of [mksglu/context-mode](https://github.com/mksglu/context-mode) 1.0.169, kept under the original Elastic License 2.0.

| | Upstream | This fork |
|---|---|---|
| Repository | `mksglu/context-mode` | `PedroHenriqueNS/context-mode-plus` |
| Marketplace | `context-mode` | `context-mode-plus` |
| Plugin key | `context-mode@context-mode` | `context-mode@context-mode-plus` |
| Plugin name (tool names) | `context-mode` | `context-mode` (unchanged: `mcp__plugin_context-mode_context-mode__*`) |
| Version | `1.0.169` | `1.0.169-plus.1` |

Install: `/plugin marketplace add PedroHenriqueNS/context-mode-plus`, then `/plugin install context-mode@context-mode-plus`.

Bundles (`cli.bundle.mjs`, `server.bundle.mjs`, `hooks/*.bundle.mjs`) are whatever `npm run build` produces from bun-installed deps (`bun install --frozen-lockfile`). On upstream merges, always rebuild them; never hand-merge a bundle.

Version and upgrade signals come from this fork: the "latest version" check reads `package.json` on the default branch of `PedroHenriqueNS/context-mode-plus`. The fork is not published to npm.
