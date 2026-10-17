# Exemplos e decisões — database-performance

Status: **exemplos didáticos e protocolos**, não código compilado nem resultados de benchmark. Adapte tipos, imports, dependências e versão real antes de implementar.

## Caso de aplicação
**Cenário:** N+1 com paginação.

### Exemplo mínimo
```text
Paginar IDs com filtro tenant; buscar detalhes da página por IDs e reconstruir ordenação. Medir SQL gerado.
```

### Quando NÃO aplicar
Não combinar collection fetch join com paginação sem verificar comportamento.

### Procedimento obrigatório do agente
1. Identificar requisito funcional, restrições e contexto do repositório.
2. Consultar a fonte primária na versão exata e registrar incompatibilidades.
3. Inspecionar evidências disponíveis e separar fatos de hipóteses.
4. Comparar solução, alternativa simples e opção de não mudar.
5. Gerar código de produção com imports, erros, logs, testes e rollback apenas quando autorizado.
6. **Não afirmar que compilou ou executou sem saída de ferramenta.**

### Critério de verificação
Teste com dois tenants e 100 itens; contar SQL e validar página.

### Saída esperada
Relatório: diagnóstico; evidências; decisão; contraindicações; patch proposto; teste reproduzível; impacto em segurança/consistência; rollback; limitações.

### Referência
Hibernate ORM 7.1 user guide. Consultar inventário central em `Skills/PESQUISA-OFICIAL-E-GAPS-2026-10.md`. Não tratar este exemplo como certificação da API.

### Evidência existente versus meta
O laboratório `Skills/laboratorio-spring-hibernate` executa testes reais de N+1, paginação em duas etapas e isolamento em dataset pequeno (cinco ou sete pais, conforme teste). **Não** executou ainda o cenário de 100 itens indicado acima. Essa quantidade é meta de ampliação, não resultado comprovado. `JOIN FETCH` de coleção com `Pageable` é antipadrão; a segunda consulta também deve manter o filtro de workspace e a ordem original.
Fontes: https://docs.hibernate.org/orm/7.1/userguide/html_single/ e https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html
