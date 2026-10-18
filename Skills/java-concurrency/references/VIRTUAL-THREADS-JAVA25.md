# Java 25 — virtual threads e concorrência

Fontes oficiais:
- https://docs.oracle.com/en/java/javase/24/core/virtual-threads.html
- https://docs.oracle.com/en/java/javase/25/migrate/significant-changes-jdk-24.html
- https://docs.spring.io/spring-boot/4.0/reference/features/spring-application.html

## Revisão crítica
- Virtual threads ajudam aplicações com muita espera bloqueante; não aceleram CPU nem ampliam conexões JDBC.
- **Java 24/JEP 491** melhorou a interação de `synchronized` com virtual threads. **Não repetir** a recomendação obsoleta de substituir todo `synchronized` por `ReentrantLock` para evitar pinning. Investigar bloqueios nativos e monitorar no runtime real.
- Não criar pool de virtual threads para limitar concorrência: limitar explicitamente o recurso escasso com semáforo, rate limiter, pool JDBC ou bulkhead.
- Cancelamento/interrupção, timeouts e propagação de contexto são parte do contrato.

## Exemplo de limitação por recurso
```java
final Semaphore permits = new Semaphore(20);
try {
    if (!permits.tryAcquire(200, TimeUnit.MILLISECONDS)) {
        throw new IllegalStateException("dependency saturated");
    }
    try {
        return blockingDependency.call();
    } finally {
        permits.release();
    }
} catch (InterruptedException e) {
    Thread.currentThread().interrupt();
    throw new IllegalStateException("request interrupted", e);
}
```
Exemplo ilustrativo; converter rejeição em resposta adequada e integrar deadline/cancelamento no serviço real.

## Spring Boot 4
`spring.threads.virtual.enabled=true` é opção; verificar efeitos sobre pools e tarefas agendadas. Threads virtuais são daemon; avaliar `spring.main.keep-alive=true` para processos que dependem de agendamento.

## Experimento
Taxa oferecida, concluída, p99, tempo de aquisição JDBC, filas, CPU, memória, threads, erros e cancelamentos. Comparar carga I/O-bound e CPU-bound, com limites idênticos.
