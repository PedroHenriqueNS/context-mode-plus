# context-mode-plus P0+P1: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** transformar o fork `PedroHenriqueNS/context-mode-plus` (base: upstream 1.0.169) num plugin que se atualiza a partir do próprio fork, injeta as regras do usuário uma única vez, só injeta texto em subagentes que têm as `ctx_*`, avisa por evento, convive com o RTK 1.0.1 e não devolve ao modelo texto que ele já tem.

**Architecture:** um *patch fork* com diffs pequenos. A lógica nova fica em módulos `hooks/core/*.mjs` e `src/rtk-doctor.ts`, cada um com uma função pura testável. Os arquivos existentes só ganham chamadas para esses módulos. Os 12 adapters ficam intactos.

**Tech Stack:** Node ≥ 22.5 (máquina: v24.18.0), TypeScript, esbuild (bundles commitados), vitest. Hooks em `.mjs` puro.

**Spec:** `docs/fork/context-mode-fork-analise.md` (o estudo; seções 3, 5 e 7 são as normativas).

## Global Constraints

- Licença ELv2: manter `LICENSE` e os avisos de copyright, deixar claro no README que é um fork de `mksglu/context-mode` e não oferecê-lo como serviço gerenciado.
- Identidade (decisão D1, confirmada em 2026-10-16): nome interno do plugin `context-mode`, marketplace `context-mode-plus` (este repositório), chave `context-mode@context-mode-plus`, repo `https://github.com/PedroHenriqueNS/context-mode-plus.git`. Com isso os nomes de ferramenta continuam `mcp__plugin_context-mode_context-mode__*`.
- Versão: `1.0.169-plus.1`, sincronizada por `node scripts/version-sync.mjs`.
- Nenhum hook pode lançar exceção ou escrever JSON inválido no stdout (fail-open, como o upstream).
- Commits sem nenhuma atribuição de IA (regra global do usuário).
- Os bundles (`server.bundle.mjs`, `cli.bundle.mjs`, `hooks/*.bundle.mjs`) são regenerados com `npm run build` e commitados junto com o `src/` que os gerou.
- Testes novos ficam em `tests/plus/`.

## Review Focus

1. Arquivo de regras ausente, vazio ou ilegível: usar o bloco original, nunca injetar vazio (Task 3).
2. Tipo de subagente desconhecido, agente de plugin com várias versões em cache, frontmatter `tools:` em lista YAML multilinha em vez de string: na dúvida, injetar (Task 4).
3. `settings.json` ausente ou malformado ao detectar o RTK: `rtkActive = false`, sem exceção (Task 5).
4. `tool_response` em objeto (o Read devolve `{file:{content}}`) e Read com `offset`/`limit`: medir o JSON serializado, e sem aviso quando houver intervalo (Task 6).
5. Seções com o mesmo título vindas de fontes diferentes: não podem ser colapsadas no dedup do batch (Task 7).

---

### Task 0: Linha de base

**Files:** nenhum.

- [ ] **Step 1:** `npm ci`. Esperado: termina sem erro (o postinstall pode avisar).
- [ ] **Step 2:** `npm test > /tmp/cmp-baseline.txt 2>&1; tail -20 /tmp/cmp-baseline.txt`. Anotar no PR quais testes já falham antes de qualquer mudança. Essa lista é a referência de "não piorou".

### Task 1: Identidade do fork (P0)

**Files:**
- Modify: `.claude-plugin/marketplace.json` (`name` → `context-mode-plus`, `owner` → PedroHenriqueNS, versões), `.claude-plugin/plugin.json` (`homepage`, `repository`, `description` com "context-mode-plus — fork of mksglu/context-mode"), `package.json` (`version`, `repository`, `homepage`)
- Modify: todas as ocorrências de `"context-mode@context-mode"` em `start.mjs`, `scripts/postinstall.mjs`, `src/cli.ts`, `src/server.ts`
- Modify: `src/cli.ts:1266` e `:1985` (`marketplaces/context-mode` → `context-mode-plus`), `src/cli.ts:1642` (`cache/context-mode/context-mode` → `cache/context-mode-plus/context-mode`), `src/cli.ts:1305-1308` e `src/server.ts:4346` (URL do clone)
- Modify: `start.mjs:314` e `hooks/cache-heal-utils.mjs` (nome do script de heal: `context-mode-plus-cache-heal.mjs`; o hook de heal continua existindo porque contorna anthropics/claude-code#46915)
- Modify: `README.md` (aviso de fork no topo e link para `docs/fork/`)
- Delete: `.github/workflows/update-stats.yml`
- Move: `context-mode-fork-analise.md` (raiz) → `docs/fork/context-mode-fork-analise.md`
- Test: `tests/plus/identity.test.ts`

- [ ] **Step 1: Teste que falha.** `identity.test.ts` lê os arquivos acima e verifica:
  - `"context-mode@context-mode"` não aparece em nenhum arquivo `.ts`, `.mjs` ou `.json` fora de `tests/`, `docs/` e bundles;
  - `marketplace.json.name === "context-mode-plus"`;
  - `plugin.json.name === "context-mode"`;
  - as URLs de clone em `src/cli.ts` e `src/server.ts` são `https://github.com/PedroHenriqueNS/context-mode-plus.git`.
- [ ] **Step 2:** `npx vitest run tests/plus/identity.test.ts`. Esperado: FAIL.
- [ ] **Step 3:** aplicar as trocas. Atualizar também os testes existentes que fixam a chave antiga (`grep -rln "context-mode@context-mode" tests`).
- [ ] **Step 4:** `node scripts/version-sync.mjs && npm test`. Esperado: identity PASS e nenhuma falha nova em relação à Task 0.
- [ ] **Step 5:** commit `chore(fork): point identity, upgrade and heal at context-mode-plus`.

### Task 2: Sem eco do código na resposta (7b)

**Files:**
- Modify: `src/server.ts:1523` (`buildExecuteEcho`) e os pontos de uso em `:1827` e `:2145`
- Test: `tests/plus/no-echo.test.ts`; ajustar as asserções de eco em `tests/core/server.test.ts`

**Interfaces:**
- Produces: as respostas de `ctx_execute`/`ctx_execute_file` passam a ser `${output}` (o caminho `path=` continua no `ctx_execute_file`). O conteúdo **indexado** (quando há `intent` e o limite de auto-index é atingido) continua `${echo}${output}`, preservando a origem nas buscas.

- [ ] **Step 1: Teste que falha.** Chamar o handler de `ctx_execute` com `language:"javascript"` e `code:"console.log('ok-123')"`. O texto devolvido deve conter `ok-123` e **não** conter "```javascript". Para `ctx_execute_file`, idem, e o texto continua começando com `path=`.
- [ ] **Step 2:** rodar. Esperado: FAIL.
- [ ] **Step 3:** separar `responseText` de `indexText` nos dois handlers. `buildExecuteEcho` só é usado para `indexText`.
- [ ] **Step 4:** `npm test`. Esperado: PASS, com os testes de eco atualizados para checar o índice e não a resposta.
- [ ] **Step 5:** commit `feat(plus): stop echoing executed code back to the model`.

### Task 3: Regras do usuário como fonte única (item 4)

**Files:**
- Create: `hooks/core/user-rules.mjs`
- Modify: `hooks/sessionstart.mjs:49` e `:166`
- Test: `tests/plus/user-rules.test.ts`

**Interfaces:**
- Produces: `loadUserRules(configDir: string): string | null`. Lê `<configDir>/context-mode-usage.md`. Arquivo ausente, vazio (só espaços) ou ilegível devolve `null`. Caso contrário devolve `<context_mode_rules>\n${conteúdo.trim()}\n</context_mode_rules>`.
- Consumes: `resolveConfigDir()` de `hooks/session-helpers.mjs`.

- [ ] **Step 1: Teste que falha.** Em um diretório temporário:
  - arquivo `"# r\nUse ctx"` → resultado começa com `<context_mode_rules>` e contém `Use ctx`;
  - sem arquivo → `null`;
  - arquivo `"  \n"` → `null`.
  - Teste de integração: rodar `hooks/sessionstart.mjs` com `CLAUDE_CONFIG_DIR` apontando para o tmp e o arquivo presente. O `additionalContext` contém `<context_mode_rules>` e **não** contém `<context_window_protection>`. Sem o arquivo, contém `<context_window_protection>`.
- [ ] **Step 2:** rodar. Esperado: FAIL.
- [ ] **Step 3:** `sessionstart.mjs` usa `loadUserRules(resolveConfigDir()) ?? createRoutingBlock(toolNamer)`.
- [ ] **Step 4:** `npm test`. Esperado: PASS.
- [ ] **Step 5:** commit `feat(plus): inject the user's context-mode-usage.md instead of the built-in block`.

### Task 4: Injeção em subagentes conforme as ferramentas (item 3)

**Files:**
- Create: `hooks/core/subagent-tools.mjs`
- Modify: `hooks/core/routing.mjs:894-916` (ramo `Agent`) e `hooks/pretooluse.mjs` (repassar `configDir`/`projectDir`)
- Test: `tests/plus/subagent-tools.test.ts`; ajustar os casos de Agent em `tests/hooks/core-routing.test.ts`

**Interfaces:**
- Produces: `subagentHasCtxTools(subagentType: string, dirs: { configDir: string, projectDir: string }): boolean`. Regras, na ordem:
  1. `""`, `general-purpose`, `Explore`, `Plan` e `Bash` → `true`.
  2. `claude-code-guide` e `statusline-setup` → `false`.
  3. Achar o `.md` do agente:
     - tipo `plugin:nome` → `<configDir>/plugins/cache/*/<plugin>/*/agents/<nome>.md`, pegando o diretório de versão mais recente por `mtime`;
     - senão, `<projectDir>/.claude/agents/<tipo>.md` e depois `<configDir>/agents/<tipo>.md`.
  4. Não achou → `true`.
  5. Frontmatter sem `tools:` → `true`. Com `tools:`, aceitar string separada por vírgula ou lista YAML; `true` se algum item for `*`, começar com `mcp__plugin_context-mode` ou contiver `ctx_`; senão `false`.
- Produces: em `routePreToolUse`, a opção `options.subagentHasCtx: boolean` (padrão `true`). Quando é `false`, o ramo Agent devolve `null`. Quando é `true`, acrescenta `loadUserRules(...) ?? subagentBlock`, como já faz hoje.

- [ ] **Step 1: Teste que falha.** Com fixtures em tmp:
  - `feature-dev:code-explorer` com `tools: Glob, Grep, Read` → `false`;
  - o mesmo agente com `tools:\n  - Read\n  - mcp__plugin_context-mode_context-mode__ctx_execute` → `true`;
  - `meu-agente` sem arquivo → `true`;
  - `claude-code-guide` → `false`.
  - Em `core-routing`: `routePreToolUse("Agent", {prompt:"x", subagent_type:"claude-code-guide"}, …, {subagentHasCtx:false})` → `null`.
- [ ] **Step 2:** rodar. Esperado: FAIL.
- [ ] **Step 3:** implementar e conectar em `pretooluse.mjs`.
- [ ] **Step 4:** `npm test` e `npx vitest run tests/hooks/hook-latency.test.ts`. Esperado: PASS, sem regressão de latência.
- [ ] **Step 5:** commit `feat(plus): inject routing only into subagents that can call ctx tools`.

### Task 5: RTK no Bash e no doctor (item 6, seção 5)

**Files:**
- Create: `hooks/core/rtk.mjs`, `src/rtk-doctor.ts`
- Modify: `hooks/core/routing.mjs:704-841` (ramo Bash), `hooks/pretooluse.mjs`, `src/cli.ts:656` (`doctor`)
- Test: `tests/plus/rtk.test.ts`, `tests/plus/rtk-doctor.test.ts`

**Interfaces:**
- Produces: `isRtkBashHookActive(settingsPaths: string[]): boolean`. É `true` se algum arquivo tiver em `hooks.PreToolUse[]` um item com matcher que inclua `Bash` e um comando que case `/\brtk\b[^|;&]*\bhook\b|rtk-rewrite/`. Arquivo ausente ou JSON inválido é ignorado.
- Produces: em `routePreToolUse`, a opção `options.rtkActive: boolean` (padrão `false`). Com `true`, todo redirecionamento de Bash que hoje devolve `{action:"modify", updatedInput:{command:'echo "…"'}}` (curl/wget, HTTP inline, gradle/mvn/sbt) passa a devolver `{action:"deny", reason:<a mesma mensagem>, redirectMeta}`. Refatorar com `bashRedirect(message: string, meta: object|undefined, opts: {rtkActive: boolean, mcpToolsAvailable: boolean})`.
- Produces: `analyzeRtk(versionOut: string | null, pipelineOut: string | null): { summary: string, warnings: string[] }`:
  - `null` na versão → summary `"RTK não instalado"`;
  - versão ≥ 1.0.0 e `pipelineOut` `null` → edição `oss`;
  - aviso se `pipelineOut` casar `/\[\[hook\.after_tool\.(mcp|any)\]\]/` (saídas `ctx_*` comprimidas);
  - aviso se casar `/\[\[hook\.before_tool\.read\]\]/` (disputa o Read);
  - aviso se casar `/\[\[hook\.after_tool\.read\]\]/` com regra que não seja `lockfiles` habilitada.
- Consumes (no `doctor`): `execFileSync("rtk", ["--version"])` e `execFileSync("rtk", ["pipeline", "show"])`, cada um com try/catch → `null`.

- [ ] **Step 1: Teste que falha.**
  - `rtk.test.ts`: settings com `{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"command":"rtk hook claude"}]}]}}` → `true`; sem RTK → `false`; JSON quebrado → `false`.
  - `core-routing`: `curl -s https://x` com `rtkActive:true` → `action === "deny"` e `reason` contém `ctx_execute`; com `false` → `action === "modify"`, como hoje.
  - `rtk-doctor.test.ts`: `analyzeRtk("rtk 1.0.1", "[[hook.after_tool.mcp]]\nname=\"x\"")` → `warnings.length === 1`; `analyzeRtk("rtk 1.0.1", null)` → summary contém `oss`; `analyzeRtk(null, null)` → summary `"RTK não instalado"`.
- [ ] **Step 2:** rodar. Esperado: FAIL.
- [ ] **Step 3:** implementar. Em `pretooluse.mjs`, `settingsPaths` = `<configDir>/settings.json`, `<projectDir>/.claude/settings.json` e `<projectDir>/.claude/settings.local.json`.
- [ ] **Step 4:** com o RTK 1.0.1 instalado (Task 9, etapa 1), rodar `rtk pipeline show` e conferir se a saída é TOML com os cabeçalhos `[[hook.…]]`. Se não for, ajustar as regex do `analyzeRtk` e os fixtures. Depois `npm test`. Esperado: PASS.
- [ ] **Step 5:** commit `feat(plus): defer Bash rewrites to RTK and add RTK checks to doctor`.

### Task 6: Avisos por evento (item 5)

**Files:**
- Create: `hooks/core/post-nudges.mjs`
- Modify: `hooks/posttooluse.mjs` (emitir o aviso), `hooks/core/routing.mjs` (exportar `guidancePeriodic`; os ramos `Read` e `Grep` e o `guidanceOnce("bash", …)` final passam a devolver `null`, mantendo o `redirectMeta` do Read > 50 000 bytes)
- Test: `tests/plus/post-nudges.test.ts`; ajustar `tests/hooks/core-routing.test.ts`, `tests/guidance-throttle.test.ts` e `tests/hooks/redirect-marker-read.test.ts`

**Interfaces:**
- Produces: `decidePostNudge({ toolName, toolInput, responseText, sessionId }): string | null`:
  - **Read:** só sem `offset`/`limit` e com `responseText.length >= 8000`. Texto: `Esse Read trouxe ${kb} KB de ${file_path}. Se você não vai editar o arquivo, use ctx_execute_file(path, language, code) e imprima só o que precisa.`
  - **Bash:** com `responseText.length >= 5000`. Texto: `Esse comando imprimiu ${kb} KB. Para processar saídas desse tamanho, use ctx_execute(language: "shell", code) e imprima só o resultado.`
  - Cadência: `guidancePeriodic("post-<tool>", texto, sessionId, 5)`, ou seja, na 1ª, 6ª, 11ª… ocorrência por sessão.
  - Demais ferramentas → `null`.
- Produces: `posttooluse.mjs` escreve no stdout `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":<texto>}}` quando o aviso não é `null`. Isso fica dentro do try existente e acontece depois do `db.close()`.

- [ ] **Step 1: Teste que falha.**
  - Read de 9 000 caracteres sem intervalo → texto contém `ctx_execute_file` e o caminho;
  - o mesmo com `limit: 50` → `null`;
  - Bash com 4 999 caracteres → `null`, com 5 000 → texto;
  - 6 chamadas seguidas na mesma sessão → avisos na 1ª e na 6ª;
  - `tool_response` em objeto `{file:{content:"x".repeat(9000)}}` → aviso, medindo o JSON serializado.
  - Teste de processo: rodar `hooks/posttooluse.mjs` com esse payload e conferir que o stdout é JSON válido com `hookEventName === "PostToolUse"`.
- [ ] **Step 2:** rodar. Esperado: FAIL.
- [ ] **Step 3:** implementar e remover os avisos genéricos do PreToolUse listados em **Files**.
- [ ] **Step 4:** `npm test`. Esperado: PASS.
- [ ] **Step 5:** commit `feat(plus): replace once-per-session nudges with event-driven ones`.

### Task 7: Seções repetidas no batch (7c)

**Files:**
- Modify: `src/server.ts:1371` (`formatBatchQueryResults`)
- Test: `tests/plus/batch-dedup.test.ts`

**Interfaces:**
- Produces: dentro de uma chamada de `formatBatchQueryResults`, um resultado cuja chave `${result.source}\u0000${result.title}` já apareceu sob uma query anterior vira `### ${title}\n(mesma seção de "## ${primeiraQuery}")`, sem o snippet. A ordem das queries e a mensagem de limite de saída ficam como estão.

- [ ] **Step 1: Teste que falha.** Store em memória com uma seção "A" (fonte `s1`) que casa as duas queries `["foo","bar"]`. A saída contém o snippet de "A" uma única vez e a linha `(mesma seção de "## foo")`. Uma seção "A" de fonte `s2` continua aparecendo com o snippet completo.
- [ ] **Step 2:** rodar. Esperado: FAIL.
- [ ] **Step 3:** implementar com um `Map<string, string>` local de chave → primeira query.
- [ ] **Step 4:** `npm test`. Esperado: PASS.
- [ ] **Step 5:** commit `feat(plus): collapse repeated sections across batch queries`.

### Task 8: Build, versão e release

**Files:** bundles gerados, `package.json` e manifests sincronizados, `docs/fork/CHANGELOG.md` (criar)

- [ ] **Step 1:** `npm run build`. Esperado: termina com `assert-bundle` e `assert-asymmetric-drift` OK.
- [ ] **Step 2:** `npm test`. Esperado: nenhuma falha além da linha de base da Task 0.
- [ ] **Step 3:** smoke dos hooks reais: rodar `pretooluse.mjs`, `posttooluse.mjs` e `sessionstart.mjs` com payloads de exemplo (como no estudo) e conferir JSON válido e latência de ~40–60 ms.
- [ ] **Step 4:** `CHANGELOG.md` com uma linha por task. Commit `chore(release): 1.0.169-plus.1`, tag `v1.0.169-plus.1`, push. Push e tag só com confirmação do usuário.

### Task 9: Migração do ambiente (máquina do usuário; cada passo confirmado antes)

**Files:** fora do repositório. São passos de configuração, sem código.

- [ ] **Step 1, RTK etapa 1:** `brew upgrade rtk`. Conferir `rtk --version` = 1.0.1 e, com `rtk init -g --show`, que o hook continua em PreToolUse → `rtk hook claude`.
- [ ] **Step 2:** em `~/.claude/rtk-command-shapes.md`, trocar `rtk proxy` por `rtk bypass` e rodar de novo os exemplos com `rtk rewrite "<cmd>"`.
- [ ] **Step 3, memória:** adicionar `"CLAUDE_MEM_DISABLE_OBSERVATION": "1"` ao `env` de `~/.claude/settings.json`.
- [ ] **Step 4, plugin:**
  - remover a linha `@context-mode-usage.md` de `~/.claude/CLAUDE.md`;
  - desinstalar `context-mode@context-mode`;
  - adicionar o marketplace `PedroHenriqueNS/context-mode-plus`;
  - instalar `context-mode@context-mode-plus`;
  - remover do `settings.json` a entrada SessionStart do `context-mode-cache-heal.mjs` antigo.
- [ ] **Step 5:** nova sessão. Conferir que o SessionStart traz `<context_mode_rules>`, que `ctx_execute` responde sem eco e que `ctx doctor` mostra a seção RTK sem avisos.
- [ ] **Step 6, RTK etapa 2 (≥ 1 semana depois):** criar `~/Library/Application Support/rtk/pipeline.toml` com `[pipeline]\nextends = ["rtk:posthook"]`, rodar `rtk init -g` e `rtk pipeline validate`, comparar `rtk gain` antes e depois e conferir que `ctx doctor` continua sem avisos.
