# Procedimento de revisão de consultas SQL e índices

Status: guia técnico independente, sujeito a validação por SGBD e workload.

## 1. Coletar contexto antes de opinar
- SQL parametrizado real, objetivo de negócio, tabelas, esquema, índices existentes, cardinalidade, distribuição e volume.
- Frequência, concorrência, latência p50/p95/p99, linhas retornadas, custo de escrita, hardware e versão exata do SGBD.
- Plano EXPLAIN e, quando seguro, EXPLAIN ANALYZE em ambiente representativo. Não executar consultas pesadas em produção sem autorização.

## 2. Investigar o plano
- Table/index scans, estimated vs actual rows, filtros aplicados, joins, sorts, temp tables, lookups e rows examined.
- Predicados não sargáveis (função/cast na coluna, wildcard inicial, OR inadequado); collation e tipos incompatíveis.
- SELECT *, N+1, paginação OFFSET profundo, consultas repetidas, falta de limites, locks e transações extensas.

## 3. Avaliar índice como hipótese, não reflexo
- Verificar índice já existente e prefixo esquerdo em compostos.
- Considerar igualdade, range, ordenação, cobertura, seletividade e cardinalidade reais.
- Considerar custo de INSERT/UPDATE/DELETE, espaço, manutenção, planos alternativos e risco de regressão.
- Evitar índices duplicados e índices em colunas de baixa seletividade sem justificativa de workload.
- Comparar com alternativa de reescrita SQL, mudança de paginação, redução de dados ou ajuste de acesso.

## 4. Testar e decidir
- Medir antes/depois sob carga representativa; incluir leitura e escrita.
- Revisar plano após mudanças e variações de parâmetros (parameter skew).
- Definir rollback de índice/migration e janela segura de implantação.
- Preservar filtros de segurança, isolamento de workspace e semântica transacional.

## Entrega obrigatória
1. Diagnóstico e evidências (SQL, plano, métricas).
2. Hipóteses concorrentes, inclusive **nenhuma mudança**.
3. Índice candidato com ordem das colunas e justificativa OU motivo para não criar.
4. Impactos em escrita, armazenamento e manutenção.
5. Benchmark, critérios de aprovação e rollback.

## Exemplo de decisão
`WHERE account_id=? AND lifecycle=? ORDER BY created_at DESC LIMIT 20`: índice composto pode ser candidato, mas somente após examinar índices existentes, distribuição, plano e workload. Não prescrever automaticamente.
