# Rodada 7 — JWT criptográfico em laboratório isolado

## Baseline
Run 39079795600: quatro jobs verdes, commit a6ab25ef5e88ea9e0757f58afca594d26d195a2c.

## Implementado (CI novo pendente)
- Dependência de teste `com.nimbusds:nimbus-jose-jwt:9.47` no laboratório Maven.
- `JwtWorkspaceAuthorizationTest`: JWT assinado com HS256 e segredo local de teste, assinatura inválida, expiração, `nbf` futuro, emissor incorreto, audiência incorreta, subject vazio, payload adulterado e entrada malformada.
- Algoritmo aceito fixado em HS256 e comparação explícita de `iss`, `aud`, `exp`, `nbf` e `sub`.

## Limites
- Esta rodada prova validação criptográfica **isolada**, não integração do JWT no servidor HTTP da rodada 6. Esse servidor ainda usa credenciais simuladas.
- Não é Spring Security nem OAuth2 Resource Server; não há JWK/JWKS, RS256, rotação de chaves, clock skew configurável, revogação, scope/role, nem autenticação da Golden.
- A chave HS256 é estática e apenas para testes; não reutilizar em produção.
- A/B independente com Codex e broker real continuam pendentes.

## Próximos gates
1. Confirmar novo CI verde.
2. Integrar validador JWT com endpoint HTTP isolado e verificar 401/403/404 por credencial e grants.
3. Validar Spring Security Resource Server com JWT/JWKS e testes de assinatura/claims em projeto de teste independente.
4. Mensageria real e fault injection entre commit e ACK.
