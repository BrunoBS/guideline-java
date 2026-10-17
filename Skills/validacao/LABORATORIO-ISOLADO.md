# 3.3 — Plano de laboratório técnico isolado

**Status: PLANEJADO, NÃO EXECUTADO.** Laboratório descartável fora dos repositórios de produto. Nenhum resultado ou benchmark disponível.

## Regras de isolamento
- Criar diretório temporário ou repositório de laboratório novo, mediante aprovação de execução.
- Não usar dados, credenciais, endpoints ou infraestrutura Golden.
- Serviços locais/containerizados; imagens com tags fixas, checagem de integridade e versões compatíveis.
- Não executar scripts upstream de terceiros sem revisão.
- Não realizar carga em sistemas reais; limitar CPU/memória e registrar recursos disponíveis.
- Só copiar resultados e documentação de avaliação para `Skills/validacao/`.

## Experimento A — MySQL e consultas
Banco sintético, tabelas `events` e `flags`, massa com distribuição conhecida e escrita concorrente. Comparar full scan, índice isolado, índice composto, reescrita e keyset pagination. Capturar `EXPLAIN`, quando seguro `EXPLAIN ANALYZE`, latência p50/p95/p99, rows examined, tamanho de índice, throughput de INSERT/UPDATE. Confirmar versão do MySQL antes de usar sintaxe/recursos.

## Experimento B — Java 25 e concorrência
Serviço HTTP mínimo com dois endpoints: CPU-bound e I/O bloqueante simulado; cliente gerador com limites. Comparar plataforma vs virtual threads com mesma taxa oferecida; medir throughput útil, p99, CPU, memória, fila JDBC simulada/real e cancelamentos. Virtual threads não devem remover limites do downstream.

## Experimento C — Resiliência
Dois serviços HTTP sintéticos A e B; injetar latência, timeout, 5xx, desconexão e saturação. Comparar sem proteção, retry limitado com jitter, timeout/deadline e bulkhead. Medir taxa de sucesso, tentativas totais, carga induzida, recuperação e p99. Não aplicar fallback que muda semântica.

## Experimento D — Cache
Redis local com chave quente e expiração simultânea; comparar sem proteção, jitter, single-flight e stale-if-allowed. Medir chamadas ao origin, hit ratio, erros, consistência e memória.

## Critério de validade
- Workload, gerador, hardware, versões, seeds, tamanho dos dados e tempo de aquecimento registrados.
- Testes repetidos com controle de variabilidade e observação de cauda.
- Separar comportamento do software de eficácia da Skill: um benchmark bom **não prova** que a instrução do agente é boa.
- Nenhum resultado declarado antes de execução observável.

## Saídas esperadas
Scripts reprodutíveis revisados; métricas brutas; comparação com/sem recomendação; relatório de limitações; proposta de atualização das Skills. A execução do laboratório requer passo separado.
