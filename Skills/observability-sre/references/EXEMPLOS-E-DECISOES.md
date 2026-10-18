# Exemplos e decisões — observability-sre

Status: **exemplos didáticos e protocolos**, não código compilado nem resultados de benchmark. Adapte tipos, imports, dependências e versão real antes de implementar.

## Caso de aplicação
**Cenário:** Observação com cardinalidade controlada.

### Exemplo mínimo
```text
Observation.createNotStarted("configuration.load", registry).lowCardinalityKeyValue("outcome", "success").observe(() -> load());
```

### Quando NÃO aplicar
Não usar tenantId como label de métrica nem duplicar observações automáticas.

### Procedimento obrigatório do agente
1. Identificar requisito funcional, restrições e contexto do repositório.
2. Consultar a fonte primária na versão exata e registrar incompatibilidades.
3. Inspecionar evidências disponíveis e separar fatos de hipóteses.
4. Comparar solução, alternativa simples e opção de não mudar.
5. Gerar código de produção com imports, erros, logs, testes e rollback apenas quando autorizado.
6. **Não afirmar que compilou ou executou sem saída de ferramenta.**

### Critério de verificação
Verificar métricas e traces, propagação @Async e cardinalidade.

### Saída esperada
Relatório: diagnóstico; evidências; decisão; contraindicações; patch proposto; teste reproduzível; impacto em segurança/consistência; rollback; limitações.

### Referência
Spring Boot 4 observability docs. Consultar inventário central em `Skills/PESQUISA-OFICIAL-E-GAPS-2026-10.md`. Não tratar este exemplo como certificação da API.

### Pré-requisito e limite do snippet
`Observation.createNotStarted(...)` pressupõe um `ObservationRegistry` configurado e a dependência Micrometer compatível com o BOM; o exemplo não prova exportação de métricas nem spans. Confirmar nome da API e dependências no projeto real, executar teste de observação e inspecionar cardinalidade de tags. Nunca inserir `workspaceId` ou `userId` em low-cardinality keys.
Fonte oficial: https://docs.spring.io/spring-boot/4.0/reference/actuator/observability.html
