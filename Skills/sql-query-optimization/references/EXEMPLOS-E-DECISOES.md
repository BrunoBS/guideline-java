# Exemplos e decisões — sql-query-optimization

Status: **exemplos didáticos e protocolos**, não código compilado nem resultados de benchmark. Adapte tipos, imports, dependências e versão real antes de implementar.

## Caso de aplicação
**Cenário:** Quando índice composto pode ajudar.

### Exemplo mínimo
```text
SELECT id FROM events WHERE workspace_id=? AND lifecycle=? ORDER BY created_at DESC LIMIT 30; -- candidato (workspace_id,lifecycle,created_at) somente após EXPLAIN.
```

### Quando NÃO aplicar
Não indexar boolean em tabela de 200 linhas sem medição.

### Procedimento obrigatório do agente
1. Identificar requisito funcional, restrições e contexto do repositório.
2. Consultar a fonte primária na versão exata e registrar incompatibilidades.
3. Inspecionar evidências disponíveis e separar fatos de hipóteses.
4. Comparar solução, alternativa simples e opção de não mudar.
5. Gerar código de produção com imports, erros, logs, testes e rollback apenas quando autorizado.
6. **Não afirmar que compilou ou executou sem saída de ferramenta.**

### Critério de verificação
EXPLAIN, cardinalidade, teste de DML, p99, rollback.

### Saída esperada
Relatório: diagnóstico; evidências; decisão; contraindicações; patch proposto; teste reproduzível; impacto em segurança/consistência; rollback; limitações.

### Referência
MySQL 8.4 EXPLAIN reference. Consultar inventário central em `Skills/PESQUISA-OFICIAL-E-GAPS-2026-10.md`. Não tratar este exemplo como certificação da API.

### Pré-requisito SQL
Os caracteres `?` representam parâmetros JDBC preparados; a linha mostrada não é uma instrução diretamente executável no cliente MySQL sem bind de parâmetros. Para avaliar plano, usar valores representativos em ambiente controlado e registrar esquema, índices existentes, distribuição, `EXPLAIN` e impacto de DML. Um índice candidato não é uma recomendação definitiva.
Fonte oficial: https://dev.mysql.com/doc/refman/8.4/en/explain.html
