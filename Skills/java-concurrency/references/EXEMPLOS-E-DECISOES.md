# Exemplos e decisões — java-concurrency

Status: **exemplos didáticos e protocolos**, não código compilado nem resultados de benchmark. Adapte tipos, imports, dependências e versão real antes de implementar.

## Caso de aplicação
**Cenário:** Limitação de dependência.

### Exemplo mínimo
```text
Semaphore gate = new Semaphore(20); if (!gate.tryAcquire()) throw new RejectedExecutionException(); try { callDependency(); } finally { gate.release(); }
```

### Quando NÃO aplicar
Não usar pool de virtual threads como controle de concorrência nem substituir todo synchronized por lock.

### Procedimento obrigatório do agente
1. Identificar requisito funcional, restrições e contexto do repositório.
2. Consultar a fonte primária na versão exata e registrar incompatibilidades.
3. Inspecionar evidências disponíveis e separar fatos de hipóteses.
4. Comparar solução, alternativa simples e opção de não mudar.
5. Gerar código de produção com imports, erros, logs, testes e rollback apenas quando autorizado.
6. **Não afirmar que compilou ou executou sem saída de ferramenta.**

### Critério de verificação
Teste de 1000 tarefas com máximo de 20 chamadas simultâneas.

### Saída esperada
Relatório: diagnóstico; evidências; decisão; contraindicações; patch proposto; teste reproduzível; impacto em segurança/consistência; rollback; limitações.

### Referência
Oracle Java 25 concurrency docs. Consultar inventário central em `Skills/PESQUISA-OFICIAL-E-GAPS-2026-10.md`. Não tratar este exemplo como certificação da API.

### Evidência existente versus meta
O laboratório `Skills/laboratorio-java` exercita um limite pequeno de concorrência, mas **não** executa as 1000 tarefas/20 chamadas do critério acima. Para comprovar saturação, usar mais workers que permissões, barreira de início, `AtomicInteger` de chamadas ativas e assert do pico; testar também interrupção durante espera e timeout de aquisição. Timeout do semáforo não impõe deadline ao I/O executado após adquirir permissão.
Fonte oficial: https://docs.oracle.com/en/java/javase/25/core/virtual-threads.html
