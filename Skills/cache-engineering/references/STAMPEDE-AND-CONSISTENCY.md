# Redis — cache stampede, consistência e segurança

Fonte: https://redis.io/docs/latest/develop/use-cases/cache-aside/

## Diagnóstico
Separar cache miss normal, hot key, expiração sincronizada de muitas chaves, expiração de **uma** chave muito popular, falha do Redis e invalidação concorrente.

## Decisões
- TTL com jitter reduz sincronização entre **chaves diferentes**; não resolve sozinho 10 mil acessos à mesma chave expirada.
- Single-flight por chave reduz carregamentos concorrentes por instância; em múltiplas instâncias, avaliar coordenação distribuída ou limite global no origin.
- Lock distribuído requer token único, expiração e liberação condicional por dono; avaliar fencing quando operação externa não tolera dono antigo.
- Stale-while-revalidate somente quando tolerância a dados desatualizados é explícita.
- Cache-aside com invalidação após escrita precisa definir janela de corrida, falha na invalidação e reconciliação.
- Negative caching deve ter TTL curto e evitar mascarar criação recente.
- Chaves precisam de escopo de tenant/ambiente e versão de contrato; jamais misturar dados autorizados de contextos diferentes.

## Métricas e testes
Hit/miss, origin QPS, p95/p99, lock contention, evictions, tamanho e erros; testar cold start, hot key, expiração, atualização concorrente e falha Redis.
