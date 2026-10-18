# Auditoria de exemplos e playbooks — rodada 3

Data: 2026-10-17. Escopo: leitura dos 17 arquivos `references/EXEMPLOS-E-DECISOES.md`, sete playbooks especializados e inventário central de fontes. Não é prova de compilação de todos os snippets nem certificação de documentação externa.

## Matriz de 17 exemplos
| Skill | Cenário lido | Achado / decisão |
|---|---|---|
| java-25-best-practices | record com validação | Didático; sem compilação isolada do snippet. Laboratório Java distinto foi executado. |
| solid-clean-code | interface de política | Tipos Order/BigDecimal não definidos/importados; ilustrativo. |
| design-patterns | interface Strategy | Event não definido; seleção e tratamento de tipo desconhecido precisam de código completo. |
| spring-boot-4 | record com NotBlank | Anotação isolada não garante HTTP 400; explicitar starter, @Valid e teste. **Corrigido.** |
| resilience-patterns | amplificação de retry | 4×4=16 depende de cada tentativa repetir cadeia; hipótese corretamente condicionada. |
| jvm-performance | diagnóstico p99 | Checklist observacional; requer JFR/carga real, sem benchmark comprovado. |
| database-performance | N+1/paginação | Critério de 100 itens não executado; testes reais menores. **Corrigido.** |
| testing-quality | JUnit assertThrows | Snippet depende de classe/imports; não é teste standalone. **Corrigido.** |
| architecture-review | ADR | Procedimento, não exemplo de código; falta ADR concreto avaliado. |
| api-scalability | limite de página | Math.min/max apenas limita size; faltam validação de entrada, overflow e contrato HTTP. |
| java-concurrency | Semaphore | 1000 tarefas/20 permissões não executadas; exemplo não comprova interrupção. **Corrigido.** |
| observability-sre | Micrometer Observation | Depende de registry, BOM e exportação; snippet não comprova traces. **Corrigido.** |
| distributed-systems | insert inbox | Único insert não prova atomicidade com efeito externo; laboratório cobre DB local apenas. |
| cache-engineering | hot key | Descrição correta da limitação do TTL jitter; sem teste de 10 mil misses. |
| api-security | BOLA/IDOR | Exige teste HTTP real de autorização; laboratório JDBC apenas prova filtro explícito. |
| load-capacity-testing | 500 RPS | Meta de cenário, não carga executada; gerador e dados brutos ausentes. |
| sql-query-optimization | índice composto | SQL com ? é parametrizado, não executável diretamente no console; candidato requer EXPLAIN. **Corrigido.** |

## Revisão dos sete playbooks
| Playbook | Avaliação | Gate ainda aberto |
|---|---|---|
| Hibernate ORM | Alerta correto para N+1 e collection fetch + pagination | Stress com volume real, plano SQL e consistência entre consultas |
| Java virtual threads | Distingue mudança JEP 491 e limite do JDBC | Teste de interrupção e carga com virtual threads |
| Idempotency failure matrix | Diferencia outbox/inbox e exactly-once | Falhas externas/ACK reais, crash injection |
| Redis stampede | Distingue jitter e single-flight local | Burst de hot key e coordenação multi-instância |
| Retry budgets | Explica multiplicação e deadlines | Fault injection com cliente HTTP real |
| Load / omission | Reconhece closed-loop e coordinated omission | Execução open-loop e dados de latência |
| MySQL diagnóstico | EXPLAIN e índices tratados como hipóteses | Planos comparados em distribuições representativas |

## Limites de evidência
- Os exemplos são majoritariamente `text`, não unidades compiláveis; seis receberam ressalvas concretas neste ciclo.
- URLs oficiais foram inventariadas e associadas por domínio, mas **não houve verificação online de cada URL e versão nesta rodada**. Não declarar checagem externa completa.
- Os testes Java25, MySQL, Redis e Spring/Hibernate comprovam cenários específicos do laboratório; não cobrem todos os exemplos.
- A/B com Codex permanece sem execução independente. Sem nota de eficácia, sem homologação geral.

## Prioridades para a próxima rodada
P0: testar autorização HTTP BOLA/IDOR, falha externa/ACK e concorrência em cache. P1: Spring Validation HTTP, cancelamento virtual threads e retry fault injection. P2: benchmarks de carga/JFR/EXPLAIN com datasets representativos. Preparar A/B Codex com runner externo isolado e logs integrais.

## Governança
Nenhum merge. Nenhuma alteração em Golden. Todas as Skills continuam DRAFT até gates cumpridos.
