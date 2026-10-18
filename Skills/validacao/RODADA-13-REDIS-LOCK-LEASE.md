# Rodada 13 — lock Redis com ownership e expiração

## Baseline verde
Run 39082348951, quatro jobs verdes, commit 6ff3e03e6b021be9005664ee3400da272a84b108.

## Casos
`RedisLockOwnershipTest` usa Redis 7.4.5 via Testcontainers e Jedis, com `SET NX PX`, token UUID exclusivo por aquisição e script Lua atômico de compare-and-delete.

1. Apenas o owner atual libera o lock; outro cliente não pode liberar.
2. Após expiração do lease, o owner anterior não apaga o lock readquirido.
3. Simulação de líder que desaparece sem liberar: o follower readquire após TTL.

## Limites
A recuperação simula abandono do lock, não queda real de processo nem falha de rede. Não cobre fencing tokens, failover/replicação Redis, renovação do lease, indisponibilidade de Redis ou garantia de exclusão mútua distribuída sob pausas maiores que TTL. O teste da Rodada 12 ainda contém desbloqueio simplificado; sua implementação não deve ser usada em produção.

## Gate
CI do novo commit pendente; PR #4 não deve ser mesclado automaticamente.
