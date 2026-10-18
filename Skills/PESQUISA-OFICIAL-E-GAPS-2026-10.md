# Inventário de pesquisa e backlog de excelência — 2026-10-17

Objetivo: maximizar qualidade e eficácia das 17 Skills, sem prometer 100% de acerto universal. Todo conselho deve ser versionado, verificável e seguro.

## Fontes oficiais consultadas
- Java 25 / JDK 24 mudanças (JEP 491): https://docs.oracle.com/en/java/javase/25/migrate/significant-changes-jdk-24.html
- Java virtual threads: https://docs.oracle.com/en/java/javase/24/core/virtual-threads.html
- Spring Boot 4 virtual threads: https://docs.spring.io/spring-boot/4.0/reference/features/spring-application.html
- Spring Boot 4 observability: https://docs.spring.io/spring-boot/4.0/reference/actuator/observability.html
- Spring Boot 4 metrics: https://docs.spring.io/spring-boot/4.0/reference/actuator/metrics.html
- Spring Framework REST clients: https://docs.spring.io/spring-framework/reference/integration/rest-clients.html
- Spring Data JPA query methods: https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html
- Hibernate ORM 7.1 user guide: https://docs.hibernate.org/orm/7.1/userguide/html_single/
- MySQL EXPLAIN: https://dev.mysql.com/doc/refman/8.4/en/explain.html
- MySQL indexes: https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html
- MySQL invisible indexes: https://dev.mysql.com/doc/refman/8.4/en/invisible-indexes.html
- Redis cache-aside: https://redis.io/docs/latest/develop/use-cases/cache-aside/
- Resilience4j source/examples: https://github.com/resilience4j/resilience4j

## Correções encontradas
1. **Virtual threads:** Java 24 mudou o comportamento de synchronized/pinning. Não transportar conselhos Java 21 como regra Java 25.
2. **Hibernate:** N+1 não se resolve sempre com fetch join; avaliar multiplicação de linhas e paginação de coleções.
3. **Spring Data JPA:** distinguir Page, Slice e keyset Window; contagem e ordenação têm custos/semânticas distintos.
4. **MySQL:** indexar toda coluna é antipadrão; custo de INSERT/UPDATE/DELETE e seletividade importam.
5. **MySQL EXPLAIN ANALYZE:** executa a query; exigir autorização e ambiente seguro.
6. **Resilience4j:** circuit breaker e bulkhead precisam de instâncias específicas por dependência; compartilhar estado entre serviços pode causar falhas correlacionadas.
7. **Redis:** jitter entre chaves não evita stampede de uma hot key; proteção exige coordenação e controle de carga.
8. **Observability:** baixa cardinalidade em métricas, alta cardinalidade apenas em traces quando apropriado; evitar tags com IDs de tenant.

## Matriz de cobertura e próximos aprofundamentos
| Skill | Profundidade adicionada nesta rodada | Ainda falta para alta confiança |
|---|---|---|
| java-25-best-practices | pesquisa JEP 491 e virtual threads | exemplos compilados, preview/incubator, APIs de collections, profiling |
| solid-clean-code | revisão upstream prévia | refatorações antes/depois e testes |
| design-patterns | revisão upstream prévia | catálogo com critérios de não adoção |
| spring-boot-4 | referência oficial sobre virtual threads, REST clients | compatibilidade efetiva de starters, AOP, transações, validação |
| resilience-patterns | playbook retry/deadline/bulkhead | testes de injeção de falhas |
| jvm-performance | playbook anterior de performance | JFR real, GC/heap, CPU throttling e tuning causal |
| database-performance | playbook Hibernate 7 | planos reais, Testcontainers MySQL, regressão |
| testing-quality | revisão upstream prévia | fixtures e suites executáveis |
| architecture-review | revisão upstream prévia | ADRs e avaliações de boundaries |
| api-scalability | revisão de critérios | modelos de capacidade, fanout, load shedding |
| java-concurrency | playbook JDK 25 | testes de cancelamento e saturação |
| observability-sre | fontes Spring/Micrometer | dashboards, tracing, cardinalidade e alertas reais |
| distributed-systems | matriz de falhas e idempotência | inbox/outbox compilados e chaos tests |
| cache-engineering | playbook stampede/consistência | Redis local, race conditions e testes |
| api-security | revisão upstream prévia | BOLA/IDOR, threat model, JWT tests |
| load-capacity-testing | protocolo de workload/omissão | testes com gerador e dados brutos |
| sql-query-optimization | SQL de exemplo, índices e keyset | planos medidos com diferentes cardinalidades |

## Critério de saída por Skill
- Fonte primária da tecnologia/versão, com URL e data.
- Pelo menos dois casos: solução recomendada e caso em que **não** se deve aplicar a técnica.
- Exemplo executável ou procedimento reproduzível; não apenas prosa.
- Critério objetivo de entrada/saída, métricas, riscos, segurança e rollback.
- Teste de decisão com/sem Skill e evidência arquivada.
- Teste de compilação/execução quando o assunto envolve APIs concretas.
- Dependências entre Skills e owner de decisão claros.

## Observação
A pesquisa atual é seletiva, não revisão exaustiva de todos os repositórios públicos. O conteúdo foi sintetizado em linguagem própria; não foram importados arquivos upstream inteiros. A validação Codex e laboratório seguem pendentes.
