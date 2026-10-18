# Auditoria técnica de conteúdo — rodada 1/3 (17 out 2026)

## Escopo e evidência
Leitura direta de `SKILL.md` em cinco Skills críticas: `api-security`, `distributed-systems`, `java-concurrency`, `sql-query-optimization`, `cache-engineering`, e do contrato comum. Os 4 jobs do GitHub Actions run 39067716977 passaram. Esta auditoria é **de instruções**, não de execução A/B ou benchmark. As referências e exemplos profundos ainda requerem revisão linha a linha.

## Matriz de achados
| Skill | Instrução correta encontrada | Lacuna a fechar | Severidade | Status |
|---|---|---|---|---|
| api-security | Matriz identidade/recurso/ação; não confiar em UI, headers, claims não verificados | Exigir testes explícitos de negação no acesso ao objeto e na consulta; 404 vs 403 sem vazar existência | Alta | Refinamento recomendado |
| distributed-systems | Atomicidade local, replay, deduplicação, não prometer exactly-once fim a fim | Diferenciar deduplicação transacional local de efeitos externos e janelas de ACK | Alta | Refinamento recomendado |
| java-concurrency | Virtual threads não ampliam capacidade do banco; preservar cancelamento | Exigir teste de interrupção durante espera por semáforo e deadline da operação, além do timeout de aquisição | Média | Refinamento recomendado |
| sql-query-optimization | Plano real, cardinalidade, custo de escrita e reversão | Proibir concluir ganho só com EXPLAIN estimado; medir execução com workload equivalente | Média | Refinamento recomendado |
| cache-engineering | Tenant isolation, stampede, jitter não resolve hot key | Separar single-flight local de lock distribuído e exigir recuperação de lock/falha Redis | Alta | Refinamento recomendado |

## Bloqueios de promoção
- O workflow de estrutura não prova semântica das 17 Skills.
- A/B Codex permanece não executado; não atribuir notas ou declarar melhoria de agentes.
- Não foi feita revisão exaustiva das 17 Skills nem de todos os seus `references/`; esta é apenas a primeira rodada.

## Evidências reproduzíveis
- https://github.com/BrunoBS/guideline-java/actions/runs/39067716977
- `Skills/validacao/CASOS-E-GABARITO.md`
- `Skills/validacao/AGENTE-A-B-PROTOCOLO.md`

## Próximas rodadas
1. Aplicar refinamentos objetivos nos cinco SKILL.md com critérios de falha, sem substituir seus playbooks.
2. Auditar as 12 Skills restantes, com matriz individual e classificação de lacunas.
3. Revisar `references/`, executar verificações adicionais, e manter A/B como gate separado.
