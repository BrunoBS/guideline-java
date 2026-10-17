# Spring Boot 4 + Hibernate + MySQL: laboratório isolado

**Objetivo:** comprovar bootstrap de Spring Boot 4.0.0, versão efetiva do Hibernate gerenciada pelo BOM, consultas Spring Data JPA com isolamento por workspace e paginação determinística. Projeto isolado: não depende de repositórios Golden.

```sh
cd Skills/laboratorio-spring-hibernate
mvn -B -ntp verify
```

**Status inicial: NÃO EXECUTADO.** O teste `rollsBackTransactionalServiceOperationOnFailure` exercita um serviço `@Transactional` que executa `saveAndFlush` e lança exceção, verificando rollback. N+1 **não foi implementado**; exige associação real e contagem de statements, sem usar Hibernate estatísticas como prova por si só.

### Fontes primárias
- https://docs.spring.io/spring-boot/4.0/reference/testing/index.html
- https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html
- https://docs.hibernate.org/orm/7.1/userguide/html_single/
- https://java.testcontainers.org/modules/databases/mysql/

### Gates restantes
Validar startup no CI, isolar dados por tenant, paginação e ordenação, testar transação real com service, comparar N+1 vs projeção/fetch plan, validar SQL e plano MySQL. Nunca promover como Golden reference sem aprovação.
