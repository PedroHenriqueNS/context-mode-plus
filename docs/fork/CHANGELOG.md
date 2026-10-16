# Changelog (context-mode-plus)

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
