# Rodada 12 — contenção de cache stampede no Redis

## Baseline
Run 39081834644: quatro jobs verdes, commit 3b474d241b3c410ae28ab95644197dc64404e4dd.

## Implementação (novo CI pendente)
Teste `RedisCacheStampedeTest`: Redis 7.4.5 Testcontainers, Jedis, 12 chamadas concorrentes em virtual threads, sincronizadas por CountDownLatch. Todas iniciam com cache vazio; o primeiro obtém `SET NX PX`, reconfirma o cache, reconstrói e publica; demais aguardam a chave. O teste verifica que todos recebem o valor e somente uma reconstrução ocorre.

## Limitações importantes
O desbloqueio `GET` seguido de `DEL` **não é atômico**; a identidade fixa do owner é apenas uma simplificação de teste. Não copiar para produção. Uma implementação robusta exige token de lock exclusivo por aquisição, remoção condicional atômica via script Lua/compare-and-delete, tratamento de lease expirado, falha do líder, timeout, métricas e política de fallback.

O teste prova comportamento concorrente em execução normal, **não** tolerância a falhas nem exclusão mútua sob expiração de lease. Ainda faltam broker real, A/B Codex independente e integração Golden.

## Próximo gate
Confirmar CI; adicionar testes de ownership/lease e falha do líder antes de recomendar qualquer algoritmo de lock como padrão.
