# Rodada 8 — JWT verificado + autorização HTTP por workspace

## Baseline verde
Run 39080092624, quatro jobs aprovados no commit dc09c490087fdeb5619ce2d70fcc572f4769d455.

## Teste adicionado
`Skills/laboratorio-integracao/src/test/java/org/example/skills/JwtHttpWorkspaceAuthorizationTest.java` usa HTTP real em loopback, tokens JWT HS256 assinados com Nimbus JOSE JWT e MySQL 8.4.6 em Testcontainers.

O servidor verifica algoritmo, assinatura, issuer, audience, exp, nbf e subject **antes** de acessar a tabela de grants. O workspace enviado pelo cliente não concede acesso sozinho. Os resultados testados são:
- `200`: JWT válido, grant e recurso do próprio workspace.
- `401`: token ausente, assinatura incorreta, expiração, issuer/audience incorretos.
- `403`: usuário autenticado sem grant no workspace solicitado.
- `404`: recurso inexistente ou recurso de outro workspace sob workspace permitido.
- `400`: workspace malformado.

## Limites e próximos gates
- É um **servidor HTTP de laboratório**, não Spring Security, nem a implementação Golden. Segredos e tokens são exclusivamente de teste.
- Não testa JWKS/RS256, rotação de chaves, revogação, clock skew, scope/role ou interceptadores da Golden.
- A separação `403` para falta de grant e `404` para recurso não encontrado é política de teste; em produção a escolha deve considerar não revelar existência de recursos.
- Não há broker real; não há testes A/B Codex independentes.
- Novo commit requer confirmação de CI; nenhum merge autorizado.
