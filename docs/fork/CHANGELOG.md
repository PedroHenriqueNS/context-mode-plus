# Changelog (context-mode-plus)

## 2.1.7-plus.1 — 2026-11-10

- Nova base: upstream context-mode 2.1.7, reescrita completa (Node 24.15+, `node:sqlite`, ferramentas `ctx_execute`, `ctx_batch`, `ctx_index`, `ctx_search`, `ctx_resume`, …). As mudanças do fork 1.x foram descartadas: a 2.x já cobre o eco de código e a deduplicação em lote, e torna desnecessários os lembretes, o filtro de subagentes, o reparo do registro e o adiamento do Bash ao RTK.
- Identidade do fork no Claude Code: `context-mode@context-mode-plus` do marketplace `context-mode-plus`; `ctx_upgrade` e o doctor mostram o comando de atualização do fork; o doctor (D1) lê as tags de release deste repositório; relatórios de problema vão para `PedroHenriqueNS/context-mode-plus`.
- `ctx_search` com `sort: "timeline"` e sem cursor devolve a página mais recente (a 2.x devolvia a mais antiga).
- O gate roda todas as camadas com `HOME` temporário e sem `CLAUDE_CONFIG_DIR`/`CONTEXT_MODE_DATA_DIR`; os testes unitários rodam por glob (Node 24.22).
- Os workflows de release (npm), estatísticas, semanal e triagem de issues do upstream não rodam no fork.
- Removida a seção RTK do doctor. As regras de `~/.claude/context-mode-usage.md` passam a vir de um `@import` no `~/.claude/CLAUDE.md`.

## 1.0.169-plus.3 — 2026-10-16

- `ctx_search` com `sort: "timeline"` devolve as entradas mais recentes (em ordem cronológica); antes devolvia as mais antigas.

## 1.0.169-plus.2 — 2026-10-16

- O `doctor` lê a listagem real do `rtk pipeline show` do RTK 1.0.1 (antes esperava TOML).
- A ferramenta MCP `ctx_doctor` também mostra a seção RTK (antes só o doctor da CLI).

## 1.0.169-plus.1 — 2026-10-16

- Identidade do fork (`context-mode-plus`, marketplace próprio), migração do upgrade e autocorreção do registro de plugins.
- Sem eco de código: `ctx_execute` e `ctx_execute_file` não devolvem mais o código executado ao modelo (o índice mantém a proveniência).
- Regras do usuário como fonte única: `~/.claude/context-mode-usage.md` substitui o bloco embutido quando existe.
- Injeção ciente de ferramentas nos subagentes: só recebem o bloco os que realmente podem chamar as ferramentas ctx.
- Bash ciente do RTK e `doctor`: com o hook do RTK ativo, redireciona com `deny` em vez de `modify`, e o `doctor` verifica o RTK.
- Lembretes orientados a eventos: Read/Bash grandes disparam o aviso após o resultado, no lugar do aviso único por sessão.
- Deduplicação em lote: seção que casa várias consultas do `ctx_batch_execute` aparece uma vez; as demais recebem uma linha de referência.
