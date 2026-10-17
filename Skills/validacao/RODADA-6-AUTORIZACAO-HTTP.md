# Rodada 6 — autorização HTTP isolada

## Baseline verde
GitHub Actions run 39079273223, quatro jobs concluídos com sucesso.

## Novo teste
`Skills/laboratorio-integracao/src/test/java/org/example/skills/HttpWorkspaceAuthorizationTest.java`

Servidor HTTP real em loopback (`com.sun.net.httpserver.HttpServer`), cliente `java.net.http.HttpClient` e MySQL 8.4.6 em Testcontainers. Exercita:
- 200 para token de teste e recurso no workspace autorizado;
- 404 para IDOR entre workspaces e para header X-Workspace-Id forjado;
- 401 para ausência de credencial e token de teste inválido;
- 400 para workspace malformado;
- 200 para outro usuário no próprio workspace.

A consulta SQL vincula identificador do recurso, workspace solicitado e concessão de acesso do subject autenticado no servidor. O header sozinho nunca concede acesso.

## Limitações / gate aberto
- Os tokens `test-alice` e `test-bob` são mapeamento **somente do teste**; não são JWTs, não há validação criptográfica de claims, expiração, issuer ou audience.
- Não usa Spring MVC nem Spring Security; não certifica os interceptadores, filtros ou authorization lib da Golden.
- Não há broker real nesta rodada. Replay local MySQL foi validado na rodada 5.
- Este commit requer CI verde; não declarar aprovado antecipadamente.
- A/B Codex independente e revisão online exaustiva permanecem pendentes.

## Próximo passo
Adicionar laboratório Spring Security/JWT ou OIDC com testes de expiração, assinatura e issuer/audience; em paralelo, avaliar broker real e crash injection. Preservar PR #4 sem merge e não alterar serviços Golden.
