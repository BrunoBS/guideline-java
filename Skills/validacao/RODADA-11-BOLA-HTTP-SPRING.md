# Rodada 11 — autorização por recurso e isolamento BOLA no Spring Security

## Baseline verde
GitHub Actions 39081282937: quatro jobs verdes, commit 91aaec5524d78e305dcdc315058cb74783f707a0.

## Alteração
Expandido o teste `SpringSecurityHttpChainTest` com dois sujeitos JWT (`alice`, `bob`), workspaces 10/20/30, grants explícitos e catálogo de recursos separado. Exercita acesso legítimo dos dois usuários, header de workspace forjado, IDs cruzados e recurso sem grant.

O filtro JWT do Spring Security autentica a requisição; o controlador de laboratório verifica grant antes da visibilidade do recurso. Sem grant retorna 403; com grant e recurso de outro workspace retorna 404, sem revelar conteúdo.

## Limites
- Os grants e recursos do teste Spring MVC são mapas em memória; não representam autorização real da Golden ou SQL da aplicação. Os testes JDBC/MySQL de rodadas anteriores permanecem independentes.
- A política 403/404 deve ser definida conforme o risco de enumeração no serviço real.
- Não há teste de `@PreAuthorize`, interceptadores Golden, JWT via JWKS/RS256, broker real nem avaliação A/B Codex.
- Novo commit pendente de CI. Não efetuar merge do PR #4.
