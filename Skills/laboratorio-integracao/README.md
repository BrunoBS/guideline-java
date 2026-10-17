# Laboratório Testcontainers — MySQL 8.4

Projeto Maven **independente**, sem dependência de platform-build/platform-libraries/Golden. Usa JDK 25, JUnit 5, Testcontainers 1.21.3 e MySQL 8.4.6.

```sh
cd Skills/laboratorio-integracao
mvn -B -ntp verify
```

Exercita consulta JDBC parametrizada com escopo de workspace e rejeição de evento duplicado via constraint. **Não testa** a autorização da Golden, Hibernate, Spring Boot, Redis, nem prova semântica end-to-end de inbox/outbox. A suíte exige Docker; falha se Docker estiver indisponível. Registrar versões, logs e resultados antes de promover o status.

Referências: https://java.testcontainers.org/modules/databases/mysql/ ; https://dev.mysql.com/doc/refman/8.4/en/
