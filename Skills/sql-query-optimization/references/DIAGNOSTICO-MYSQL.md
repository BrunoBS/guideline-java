# Diagnóstico MySQL 8.x — decisão de índices e reescrita

Status: guia técnico independente; validar versão exata do servidor. Fonte oficial: https://dev.mysql.com/doc/refman/8.4/en/explain.html e https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html

## Dados mínimos antes de decidir
- SQL **real** com parâmetros representativos, taxa de chamadas, SLA, tamanho do resultado e percentis.
- `SHOW CREATE TABLE`, `SHOW INDEX FROM events`, cardinalidade/distribuição, estatísticas, volume e crescimento.
- `EXPLAIN FORMAT=JSON SELECT ...` ou `EXPLAIN FORMAT=TREE SELECT ...`, conforme versão.
- Quando autorizado em ambiente seguro: `EXPLAIN ANALYZE SELECT ...`. **Executa** a consulta; não rodar indiscriminadamente em produção.
- Comparar rows examined/returned, join order, access path, filesort, temporary tables, estimativas versus reais e loops.

## Caso A: filtro e ordenação
```sql
SELECT id, created_at
FROM events
WHERE workspace_id = ? AND lifecycle = ?
ORDER BY created_at DESC, id DESC
LIMIT 30;
```
Candidato de teste (não prescrição automática):
```sql
CREATE INDEX idx_events_workspace_lifecycle_created_id
ON events (workspace_id, lifecycle, created_at DESC, id DESC);
```
A ordem exata depende do workload, predicados de igualdade/faixa, seletividade, índices preexistentes, PK implícita no índice secundário InnoDB, paginação e custo de manutenção. Compare com índice mais curto e ausência de novo índice.

## Caso B: NÃO indexar
```sql
SELECT id, name FROM flags WHERE enabled = TRUE;
```
Tabela com 200 linhas e 98% TRUE: full scan pode ser mais eficiente. Evite índice boolean isolado sem evidência de ganho.

## Keyset pagination
```sql
SELECT id, created_at
FROM events
WHERE workspace_id = ?
  AND (created_at < ? OR (created_at = ? AND id < ?))
ORDER BY created_at DESC, id DESC
LIMIT 30;
```
Requer ordenação estável, cursor consistente, isolamento adequado e comparação de planos. A forma do predicado pode afetar uso de índice; avaliar também comparação por tupla quando aplicável.

## Antes/depois
Repetir mesma carga, distribuição de parâmetros e concorrência; medir p50/p95/p99, throughput, CPU, I/O, lock waits, DML e armazenamento. Considerar índices invisíveis para experimentos controlados, com atenção a sessões, planos e hints. Não usar `FORCE INDEX` como solução inicial.

## Decisão final
Escolher **indexar**, **reescrever**, **alterar paginação/projeção**, **corrigir ORM**, **atualizar estatísticas** (se necessário) ou **não alterar**. Documentar riscos e rollback.
