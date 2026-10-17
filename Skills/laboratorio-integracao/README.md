# Laboratório Testcontainers — MySQL 8.4

Projeto Maven **independente**, sem dependência de platform-build/platform-libraries/Golden. Usa JDK 25, JUnit 5, Testcontainers 1.21.3 e MySQL 8.4.6.

```sh
cd Skills/laboratorio-integracao
mvn -B -ntp verify
```

Exercita consulta JDBC parametrizada com escopo de workspace e rejeição de evento duplicado via constraint. **Não testa** a autorização da Golden, Hibernate, Spring Boot, Redis, nem prova semântica end-to-end de inbox/outbox. A suíte exige Docker; falha se Docker estiver indisponível. Registrar versões, logs e resultados antes de promover o status.

Referências: https://java.testcontainers.org/modules/databases/mysql/ ; https://dev.mysql.com/doc/refman/8.4/en/

## Cenários adicionados (pendentes de execução)
- Redis 7.4.5: `PING`, chaves distintas por workspace e TTL de 1 segundo.
- MySQL 8.4.6: rollback de marcador + efeito na mesma transação; replay de event ID sem segundo efeito.
- **Limites:** não valida autenticação/autorização do servidor, stampede distribuído, exactly-once externo, Spring Boot ou Hibernate. A pipeline deverá confirmar a execução.
