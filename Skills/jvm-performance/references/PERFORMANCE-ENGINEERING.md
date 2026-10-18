# Engenharia de performance para APIs Java

## Método
1. Definir SLI/SLO: throughput, p50/p95/p99, disponibilidade, erro, saturação, uso de CPU/memória.
2. Definir workload representativo: mistura de endpoints, tamanho de payload, cache frio/quente, usuários concorrentes e think time.
3. Medir baseline e gargalo: tracing, métricas, JFR, alocação, GC, lock contention, pools HTTP/JDBC e queries.
4. Criar hipótese isolada; aplicar uma mudança por vez; comparar sob mesmas condições.
5. Rodar testes de carga, stress, spike, soak e recuperação; observar cauda de latência e erros, não apenas média.
6. Dimensionar limites: CPU quota/container, heap vs memória nativa, conexões, threads/virtual threads, fila e upstream.
7. Publicar evidências, regressões e plano de reversão.

## Cautelas
- Virtual threads não removem limites de banco, rede ou serviços remotos; investigar pinning e concorrência real.
- Não ampliar Hikari pool sem avaliar limite de conexões do banco e multiplicação por réplicas.
- Não assumir que GC específico é superior sem medição; analisar pausas, throughput e memória.
- Cache exige consistência, invalidação, TTL, cardinalidade e política de falha; não é solução universal.
- Benchmarks sintéticos não substituem testes de ponta a ponta.

## Saída da Skill
Baseline, hipótese, evidência de perfil/plano, mudança proposta, benchmark antes/depois, impacto no p99, capacidade estimada com premissas e rollback.
