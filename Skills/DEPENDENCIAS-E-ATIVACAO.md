# Roteamento de Skills e instalação

## Como escolher
- SQL lento: sql-query-optimization + database-performance + load-capacity-testing quando há gargalo sob carga.
- Latência p99: jvm-performance + observability-sre + api-scalability; adicionar database-performance conforme tracing.
- Incidente com downstream: resilience-patterns + distributed-systems + observability-sre.
- Novo endpoint: spring-boot-4 + api-scalability + api-security + testing-quality.
- Refatoração: solid-clean-code + architecture-review + testing-quality.
- Evento ou fila: distributed-systems + resilience-patterns + testing-quality.
- Cache: cache-engineering + distributed-systems + observability-sre.
- Concorrência: java-concurrency + jvm-performance + testing-quality.

## Catálogo vs instalação
A pasta `Skills/` no guideline-java é uma biblioteca de curadoria e documentação. Ela **não garante** descoberta automática pelo Codex em outros repositórios. Após aprovação, distribuir para `.agents/skills/<nome>/SKILL.md` no repositório consumidor ou diretório global do agente. Validar regras de descoberta na versão do Codex usada.

## Política de execução
Skills são instruções, não autoridade para alterar código ou infraestrutura. Scripts externos não devem ser executados sem revisão. Evitar copiar fontes não auditadas. Evidências de testes devem ser reais, nunca inferidas.
