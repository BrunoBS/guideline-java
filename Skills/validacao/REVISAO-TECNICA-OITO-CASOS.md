# Fase 3.2 — revisão técnica dos oito cenários (nesta conversa)

Data: 2026-10-17. **Natureza:** revisão analítica de casos e de suficiência das instruções existentes. **Não** é execução independente do Codex, teste A/B, benchmark, teste de integração nem avaliação de desempenho do agente. Não há pontuação de respostas de agente.

## SQL-01 — índice candidato
**Resposta técnica esperada:** confirmar `SHOW INDEX`/`SHOW CREATE TABLE`, cardinalidade/distribuição, filtros adicionais, EXPLAIN, latência e escrita. Um índice como `(workspace_id, lifecycle, created_at)` pode permitir filtro e ordenação, mas sua adequação depende de seletividade, planos, ordenação e custo de DML. Testar índices alternativos e query sem índice novo.
**Diagnóstico da Skill:** cobre índices compostos e evidência; falta instrução para explicar cobertura, descending index, impacto de ordenação e comparar múltiplas distribuições de parâmetros.
**Ação editorial:** acrescentar checklist de plano e experimento A/B SQL.

## SQL-02 — índice desnecessário
**Resposta esperada:** com 200 linhas e 98% true, full scan provavelmente é competitivo; não criar índice isolado só porque há WHERE. `SELECT *` pode ser aceitável em algumas condições, mas revisar payload e evolução do contrato.
**Diagnóstico:** a Skill já proíbe indexação automática. Falta um exemplo explícito de recusa justificada.
**Ação:** exemplo de `NO CHANGE` com critério.

## SQL-03 — N+1 e autorização
**Resposta esperada:** observar SQL real e quantidade de queries por página; considerar DTO projection, batch fetching ou consultas em duas etapas. Fetch join com paginação de coleções pode provocar paginação em memória ou comportamento inadequado; confirmar no ORM/versão. Garantir filtro de tenant/workspace em toda consulta e nas consultas derivadas.
**Diagnóstico:** cobre N+1 e segurança genericamente, mas não explicita armadilhas de fetch join + paginação nem testes de isolamento.
**Ação:** caso de segurança e plano SQL com verificação por tenant.

## RES-01 — retries em cascata
**Resposta esperada:** no modelo em que cada tentativa de A refaz B e cada tentativa de B refaz C, 4×4=16 chamadas C no pior caso; não é uma garantia para toda topologia. Escolher camada de retry, deadline global, backoff/jitter, idempotência e limites de concorrência.
**Diagnóstico:** menciona retry storm e orçamento; falta equação de amplificação e caso numérico.
**Ação:** matriz de tentativas por camada e orçamento de deadline.

## JVM-01 — virtual threads e JDBC
**Resposta esperada:** 2000 requisições podem bloquear aguardando 20 conexões; throughput fica condicionado por tempo de retenção e capacidade do banco. Virtual threads reduzem custo de espera, não elevam capacidade do pool. Inspecionar acquisition time, active/pending connections, query latency, lock waits, CPU e p99.
**Diagnóstico:** orientação correta; faltam sinais diagnósticos concretos e teste de saturação com limites.
**Ação:** protocolo de medição Hikari/DB.

## CACHE-01 — stampede
**Resposta esperada:** identificar hot key, taxa de miss e fanout; usar single-flight por chave, TTL jitter entre chaves, bounded concurrency e stale-while-revalidate apenas se consistência permitir. **Jitter sozinho não resolve milhares de acessos à mesma chave expirada.** Isolar tenant em chaves e autorização.
**Diagnóstico:** cita jitter/single-flight mas não diferencia casos nem stale policy.
**Ação:** decisão por padrão de tráfego e risco de consistência.

## MSG-01 — duplicidade
**Resposta esperada:** após commit e antes do ACK, reentrega é possível. Proteger efeito por chave de idempotência e constraint/transação, registrar processamento durável; coordenar side effects externos com estratégia de idempotência/reconciliação. Testar crash em pontos diferentes e replay.
**Diagnóstico:** aborda duplicidade, mas precisa explicar atomicidade entre inbox, banco e efeito externo.
**Ação:** matriz de pontos de falha.

## LOAD-01 — coordinated omission
**Resposta esperada:** separar carga oferecida, aceita e completada, erro, rejeição e tempo na fila; closed-loop pode ocultar latência em saturação. Avaliar open-loop/arrival-rate com gerador capaz, timestamps e correção de omissão coordenada; evitar confundir histogramas corrigidos com medidas diretas.
**Diagnóstico:** cobre offered vs completed e coordinated omission, mas sem protocolo e critérios de validade do gerador.
**Ação:** checklist de teste e confiabilidade dos percentis.

## Resultado desta revisão
- **8/8** casos possuem raciocínio de referência documentado nesta revisão.
- **8/8** apresentam ao menos uma oportunidade concreta de aprofundar as Skills.
- **0/8** casos foram executados com Codex.
- **0** comparações A/B, **0** benchmarks e **0** alterações em sistemas Golden.
- **Sem nota numérica de eficácia**: ausência de saídas reais de agente impede mensuração honesta.

## Próximo gate
1. Congelar prompts e critérios antes dos testes.
2. Executar cada caso em sessões isoladas, sem Skill e com Skill.
3. Registrar respostas completas e pontuação por avaliador, de preferência com avaliação cega.
4. Somente após evidência, melhorar Skills e repetir os casos.
5. Se necessário, executar laboratório sintético em ambiente separado; sem acesso a serviços Golden.
