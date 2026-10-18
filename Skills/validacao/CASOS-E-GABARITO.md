# 3.2 — Casos de decisão e gabarito para Codex

**Status: preparados; nenhum caso executado com Codex.** Executar duas variantes independentes por caso: sem Skill (controle) e com Skills ativadas. Preservar mesma entrada, contexto e modelo; registrar respostas integrais.

## Rubrica
Pontuar cada critério de 0 (ausente/incorreto), 1 (parcial), 2 (correto e justificado):
1. Reconhece limites das evidências.
2. Faz diagnóstico causal e considera hipóteses alternativas.
3. Protege segurança, integridade e semântica.
4. Entende trade-offs de performance, custo e escala.
5. Propõe verificação reproduzível.
6. Apresenta risco e reversão.

**Total: 0–12.** Aprovação sugerida: ≥10 e nenhum erro crítico de segurança/integridade; 7–9 revisão; ≤6 reprovação. Critérios provisórios, não validados.

## Casos
### SQL-01 — índice candidato
`SELECT id, created_at FROM events WHERE workspace_id=? AND lifecycle=? ORDER BY created_at DESC LIMIT 30`
Contexto: milhões de registros, alta taxa de escrita; índices desconhecidos. Esperado: solicitar índices/plano/distribuição, considerar composto e ordem das colunas, avaliar custo DML; **não prescrever índice definitivo**. Skill: sql-query-optimization + database-performance.

### SQL-02 — índice pode não ajudar
`SELECT * FROM flags WHERE enabled = true`
Contexto: 200 linhas, 98% enabled; chamada esporádica. Esperado: avaliar full scan, projeção e frequência; reconhecer que índice isolado em boolean pode piorar escrita sem ganho útil. Skill: sql-query-optimization.

### SQL-03 — N+1 com autorização
Endpoint pagina recursos de tenant e acessa associação LAZY para cada item. Esperado: verificar SQL emitido, projeção/batching/join fetch, estabilidade da paginação e manutenção de filtros de tenant; nunca retirar segurança para ganhar velocidade. Skills: database-performance + api-security.

### RES-01 — retries em cascata
A→B→C; A e B fazem três retries além da tentativa original. Esperado: reconhecer até 16 chamadas C por requisição A em cenário simplificado de falhas que propagam (4×4), verificar se cada camada de fato refaz C, budget/deadline/jitter e idempotência. Skill: resilience-patterns.

### JVM-01 — virtual threads e JDBC
2000 requisições concorrentes, pool JDBC 20, consultas lentas. Esperado: distinguir concorrência de capacidade, analisar fila no pool, tempo de consulta, saturação do banco; não recomendar pool 2000. Skills: java-concurrency + jvm-performance.

### CACHE-01 — expiração simultânea
10000 requisições para mesma chave expirada. Esperado: avaliar stampede, single-flight, TTL jitter, hot keys, stale policy e isolamento por tenant. Skill: cache-engineering.

### MSG-01 — duplicidade de evento
Consumidor processa evento e falha antes do ACK. Esperado: at-least-once, idempotência durável, chave única/inbox e testes de replay; não prometer exactly-once. Skill: distributed-systems.

### LOAD-01 — carga mascarada
Gerador closed-loop reduz requisições oferecidas quando o servidor fica lento. Esperado: distinguir offered load, completed goodput, filas e coordinated omission; pedir teste aberto ou correção metodológica. Skills: load-capacity-testing + observability-sre.

## Registro obrigatório por execução
Case ID; data; modelo/versão; prompt literal; Skills ativadas; resposta integral; pontuação por dimensão; erros críticos; diferença em relação ao controle; decisão; evidência (arquivo/log). Não atribuir notas sem respostas reais.
