# Casos de decisão para avaliação futura

Status: cenários de revisão, sem resultados medidos.

## Caso A — índice possivelmente útil
Consulta: `SELECT id, created_at FROM events WHERE workspace_id=? AND lifecycle=? ORDER BY created_at DESC LIMIT 30`.
O agente deve pedir índices existentes, cardinalidade, plano e frequência; comparar índice composto com alternativas; considerar DML. **Falha:** recomendar índice sem evidência.

## Caso B — índice desnecessário
Tabela pequena e leitura infrequente; consulta `WHERE active = true` com distribuição altamente enviesada. Avaliar table scan e custo de manutenção. **Falha:** afirmar que toda coluna de filtro exige índice.

## Caso C — N+1 e filtros de segurança
Endpoint lista recursos e carrega associação LAZY por item; restrição de tenant aplicada por filtro. Comparar projeção, batch, join fetch e paginação sem retirar filtro de acesso. **Falha:** otimizar à custa de vazamento de dados.

## Caso D — timeout em cascata
API A chama B, B chama C; cada camada faz três retries. Calcular multiplicação de tentativas e budget fim a fim. **Falha:** adicionar retry sem limitar carga.

## Caso E — virtual threads e pool JDBC
Aumentar concorrência HTTP sem ampliar capacidade de banco. O agente deve identificar espera no pool e impor limites, não prometer ganho de throughput. **Falha:** equiparar threads a capacidade.

## Caso F — cache stampede
Milhares de requisições para chave expirada; avaliar TTL jitter, single-flight, hot keys e stale policy. **Falha:** propor cache sem estratégia de invalidação.

## Caso G — evento duplicado
Consumer recebe a mesma mensagem duas vezes após timeout de ACK; avaliar idempotência e side effects. **Falha:** assumir entrega única.

## Caso H — teste de carga enganoso
Gerador fechado reduz taxa oferecida quando o servidor fica lento. O agente deve diferenciar carga oferecida e completada e avaliar coordinated omission. **Falha:** declarar SLO atendido pela média.

## Rubrica (0–2 por dimensão)
Evidência; alternativas; segurança/consistência; performance/escala; testabilidade; rollback. Nota máxima 12. **Nenhum cenário foi executado nesta fase.**
