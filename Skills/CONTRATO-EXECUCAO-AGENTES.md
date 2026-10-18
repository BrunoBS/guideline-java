# Contrato de execução das 17 Skills — regras para agentes

**Escopo:** recomendações e exemplos independentes; não altera a Golden. Este documento é normativo **somente para a utilização destas Skills**, não para a arquitetura dos serviços. Não promete 100% de acerto: exige evidência, testes e aprovação humana para alterações de risco.

## Ordem de execução obrigatória
1. Detectar stack e versões **reais** em pom.xml, BOM, build, configuração e runtime; não assumir compatibilidade de exemplos.
2. Ler SKILL.md e seus `references/` relevantes. Se várias Skills se aplicam, explicitar conflito e escolher responsável primário.
3. Escrever contrato funcional, não funcionais, isolamento/segurança, falhas, orçamento de latência e restrições.
4. Estabelecer baseline com evidências: teste que falha, EXPLAIN, JFR, tracing, métricas ou reprodução.
5. Formular pelo menos duas hipóteses, incluindo **não alterar** quando aplicável.
6. Propor mudança mínima, Clean Code, SRP, nomes explícitos, erros tipados, interfaces só quando há fronteira/variação.
7. Produzir implementação **completa**, imports, dependências versionadas e testes de sucesso, erro, concorrência e regressão; nunca copiar snippets `text` como código compilado.
8. Rodar build/testes e registrar comandos, versão e saída; se não for possível, marcar `NÃO EXECUTADO`.
9. Medir antes/depois com workload equivalente, inclusive p95/p99, throughput, erros, memória e impacto em escrita, conforme o caso.
10. Documentar risco, segurança, rollback, decisão e evidências. **Nunca** modificar serviço Golden sem solicitação explícita.

## Matriz de decisões por domínio
| Skill | Faça | Evite | Teste crítico |
|---|---|---|---|
| java-25-best-practices | validar API estável/preview e linguagem | preview sem flags/aceite | compilação JDK 25 |
| solid-clean-code | responsabilidade clara e nomes de domínio | abstração especulativa | regressão comportamental |
| design-patterns | selecionar padrão pelo problema | Strategy/Factory por reflexo | troca de implementação |
| spring-boot-4 | checar starters, validation, AOP, transação | transportar exemplos Boot 3 sem revisão | teste de contexto HTTP |
| resilience-patterns | deadline e budget fim a fim | retry em erro permanente | fault injection |
| jvm-performance | correlacionar JFR/GC/CPU/DB | tuning por palpite | carga reproduzível |
| database-performance | medir SQL ORM e isolamento | collection fetch join paginado sem teste | tenant A/B e count |
| testing-quality | testes de falha e integração real | mockar tudo e chamar de integração | regressão no MySQL |
| architecture-review | ADR com alternativas e custos | microserviço por classe | cenário de falha |
| api-scalability | limite, ordenação, backpressure | escalar app sem medir DB | saturação/limites |
| java-concurrency | limite recurso escasso, cancelamento | pool de virtual threads como semáforo | simultaneidade máxima |
| observability-sre | métricas com cardinalidade controlada | tenant ID como label | scrape e trace |
| distributed-systems | inbox/outbox e replay | exactly-once end-to-end | crash pós-commit |
| cache-engineering | single-flight, TTL, consistência | jitter como cura de hot key | burst e invalidação |
| api-security | autorização por objeto/contexto | confiar apenas no papel | IDOR/tenant A→B |
| load-capacity-testing | offered load, goodput e erros | só média closed-loop | gerador não saturado |
| sql-query-optimization | EXPLAIN e custo DML | indexar toda coluna filtrada | antes/depois e rollback |

## Exemplos de código com contratos verificáveis

### Exemplo 1 — Java, value object e invariantes
```java
import java.util.Objects;

public record ConfigurationKey(String value) {
    public ConfigurationKey {
        Objects.requireNonNull(value, "value");
        if (value.isBlank() || value.length() > 80
                || !value.matches("[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*")) {
            throw new IllegalArgumentException("Invalid configuration key");
        }
    }
}
```
**Teste:** nulo, branco, 81 caracteres, separador duplicado e válido. **Não usar** record como entidade JPA mutável.

### Exemplo 2 — Concorrência limitada, sem perder interrupção
```java
import java.util.concurrent.Callable;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

public final class BoundedCaller {
    private final Semaphore permits;
    public BoundedCaller(int maxConcurrent) {
        if (maxConcurrent <= 0) throw new IllegalArgumentException("maxConcurrent");
        this.permits = new Semaphore(maxConcurrent);
    }
    public <T> T call(Callable<T> operation) throws Exception {
        if (!permits.tryAcquire(200, TimeUnit.MILLISECONDS)) {
            throw new TimeoutException("Dependency capacity exhausted");
        }
        try {
            return operation.call();
        } finally {
            permits.release();
        }
    }
}
```
**Teste:** executar N tarefas com barreira e contador `AtomicInteger`, garantir máximo ≤ limite, liberar após exceção e interrupção. **Não** confundir este timeout de aquisição com deadline da chamada.

### Exemplo 3 — SQL: indexação é hipótese, não conclusão
```sql
EXPLAIN FORMAT=JSON
SELECT id, created_at
FROM events
WHERE workspace_id = 42 AND lifecycle = 'ACTIVE'
ORDER BY created_at DESC, id DESC LIMIT 30;
-- Candidato de experimento, não criar em produção automaticamente:
CREATE INDEX idx_events_ws_lifecycle_created_id
  ON events (workspace_id, lifecycle, created_at DESC, id DESC);
```
**Teste:** comparar plano, distribuição, rows examined, custo de INSERT/UPDATE e p99. `EXPLAIN ANALYZE` **executa** a instrução; não usar em produção sem autorização. Verificar MySQL 8.0 vs 8.4.

### Exemplo 4 — Mensageria: deduplicação durável
```sql
CREATE TABLE processed_event (
  event_id CHAR(36) NOT NULL PRIMARY KEY,
  processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```
Na **mesma transação** do efeito no banco: inserir `event_id` e alterar estado; chave duplicada indica replay já confirmado. Para efeitos externos, exigir idempotency key no destino ou reconciliação; inbox local sozinho não cria atomicidade com HTTP externo. Testar crash pós-commit e pré-ACK.

### Exemplo 5 — Segurança de recurso
```sql
SELECT id, name FROM configuration
WHERE identifier = ? AND workspace_id = ?;
```
`workspace_id` deve vir de contexto autorizado validado no servidor, **não** apenas de parâmetro controlado pelo cliente. Testar que um usuário do workspace A não lê o identificador de B, inclusive em count, projection, cache e segunda consulta.

## Exemplos negativos e recusas
- Tabela de 200 linhas, 98% enabled: **não recomendar** índice boolean sem ganho medido.
- POST de efeito não idempotente com timeout após envio: **não repetir** cegamente.
- Collection fetch join + paginação: **não afirmar** que o banco paginou sem verificar SQL e comportamento Hibernate.
- 2.000 requests, 20 conexões JDBC: **não aumentar** pool para 2.000 nem afirmar que virtual threads aumentam capacidade do banco.
- 10.000 requests para uma hot key: **não** vender TTL jitter como solução isolada.
- Consumer que caiu após commit e antes de ACK: **não** alegar exactly-once end-to-end.
- Teste closed-loop em saturação: **não** afirmar capacidade pelo p99 observado sem verificar coordinated omission.

## Fontes primárias e versões
- Java 25: https://docs.oracle.com/en/java/javase/25/core/concurrency.html
- Java 25 preview: https://docs.oracle.com/en/java/javase/25/core/structured-concurrency.html
- Spring Boot 4: https://docs.spring.io/spring-boot/4.0/reference/testing/testcontainers.html
- Hibernate 7.1: https://docs.hibernate.org/orm/7.1/userguide/html_single/
- MySQL 8.4: https://dev.mysql.com/doc/refman/8.4/en/explain.html
- Spring Data JPA: https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html
- Redis: https://redis.io/docs/latest/develop/use-cases/cache-aside/

**Gate de adoção:** a execução de um exemplo em Java 21 não comprova compatibilidade Java 25; fonte oficial e revisão estática também não substituem compilação/integração. Requer teste real em ambiente isolado com stack-alvo.
