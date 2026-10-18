# Etapa 2 — protocolo de integração isolada

**Estado:** especificado, não executado. Exige JDK 25, Maven, Docker/Podman compatível com Testcontainers e imagens verificadas. Não usar Golden.

## Matriz de testes
1. **Java 25:** `javac --release 25` para fontes sem dependências, `java -cp out SmokeTests`; incluir teste de saturação com executor > permits, timeout, interrupção, exceção e contagem máxima.
2. **Spring Boot 4:** projeto isolado criado com BOM/parent da versão selecionada; validar `@Valid`, erros HTTP, AOP, interceptores, propagação de contexto, transações e shutdown.
3. **Hibernate ORM / Spring Data JPA:** validar versão efetiva gerenciada pelo Boot 4. Testar N+1 com query counter, DTO projection, paginação de coleção e duas consultas. Não assumir que Hibernate 7.1 é a versão gerenciada.
4. **MySQL 8:** Testcontainers com tag fixa, migrations e massa sintética; comparar EXPLAIN, índice composto, seletividade e custo de escrita. Validar isolamento tenant A/B e índices com concorrência.
5. **Redis:** Testcontainers; teste de hot key e expiração simultânea, isolamento de chaves por tenant, concorrência multi-instância, invalidação e queda Redis.
6. **Mensageria:** simular at-least-once, crash após commit/antes de ACK, inbox/outbox e replay. Preferir broker emulado/isolado, não serviço real.
7. **Resiliência:** dependência HTTP sintética com timeout, 503 e cancelamento; medir tentativas amplificadas, budget, p99 e recuperação.
8. **Observabilidade e segurança:** traces, métricas sem cardinalidade alta, BOLA/IDOR, token expirado e filtro em todas as consultas.

## Critérios
- Comandos, logs, dependências, imagens/digests, runtime e resultados brutos anexados.
- Nenhuma falha crítica de isolamento ou idempotência.
- Compilação e testes verdes em stack-alvo; não usar mocks como prova de integração.
- Se a infraestrutura de teste estiver indisponível, marcar BLOQUEADO e não simular aprovação.
