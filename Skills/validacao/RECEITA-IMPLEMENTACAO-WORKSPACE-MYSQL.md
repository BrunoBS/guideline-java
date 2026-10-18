# Receita executável — isolamento de recursos por workspace

## Objetivo
Provar que a consulta de recurso não confia apenas no identificador recebido, e que o usuário só acessa recursos de workspaces autorizados. Skill primária: `api-security`; auxiliares: `spring-boot-4`, `database-performance`, `testing-quality`.

## Código real
- `Skills/laboratorio-spring-hibernate/src/test/java/org/example/skills/WorkspaceResourceJdbcAuthorizationTest.java`: MySQL 8.4.6 via Testcontainers, grants e recursos reais em SQL, prepared statement, `EXISTS` por sujeito e workspace, casos de leitura permitida, cruzamento de tenant, recurso inexistente e revogação.
- `Skills/laboratorio-spring-hibernate/src/test/java/org/example/skills/SpringSecurityHttpChainTest.java`: cadeia Spring Security/JWT e HTTP servlet simulado, com issuer, audience, expiração, 401/403/404 e troca de usuário.

## Executar
```sh
java -version  # JDK 25
docker info
mvn -f Skills/laboratorio-spring-hibernate/pom.xml test
```
Requer Docker disponível ao Testcontainers. Registrar ID do run e status de cada job.

## Limites conhecidos
**Os dois testes são independentes.** A cadeia HTTP/JWT usa grants em memória; o teste MySQL usa grants persistidos, mas não passa pelo filtro HTTP. Portanto, ainda não prova um fluxo integrado HTTP → JWT → autorização → consulta MySQL. Não anunciar essa integração como concluída. A revogação aqui é consulta direta ao banco; não testa cache distribuído. A implementação de referência completa ainda requer um único teste ponta a ponta.

## Próxima receita
Construir um teste integrado com controller, principal JWT, resolvedor de workspace autorizado e repository real; depois, consumidor de biblioteca auto-configurada e outbox transacional.
