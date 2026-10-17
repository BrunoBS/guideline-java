---
name: api-scalability
description: Skill de escalabilidade de apis para investigar, implementar e revisar sistemas Java de alta escala com decisões baseadas em evidências.
---

# Escalabilidade de APIs

Status: pesquisa/curadoria v0.2. Independente de convenções Golden; não é norma aprovada.

## Gatilhos
Analisar throughput/goodput, latência p95/p99, concorrência, limites por cliente, paginação, fanout, custos e crescimento horizontal.

## Protocolo
1. Ler código, contratos, configuração, métricas e testes disponíveis; separar fatos de hipóteses.
2. Modelar demanda: taxa oferecida, requisições aceitas/concluídas, mistura de endpoints, payload e burst. Calcular budget fim a fim e saturação por dependência.
3. Aplicar limites explícitos, paginação determinística e bounded queues; comparar scale-up, scale-out e redução de trabalho por requisição.
4. Identificar impacto em segurança, consistência, observabilidade e custo operacional.
5. Propor mudança mínima, critérios de aceitação, experimento controlado e reversão.

## Antipadrões
Não assumir que adicionar réplicas resolve gargalo compartilhado; não deixar retries multiplicarem tráfego.

## Entregáveis
Contrato de API com limites; diagrama de gargalos; teste de pico, soak e degradação; decisão baseada em p99 e taxa de erro.

## Critérios de revisão
- [ ] Evidências e premissas explicitadas.
- [ ] Alternativas consideradas, inclusive não alterar.
- [ ] Comportamento em falha e sob carga descrito.
- [ ] Teste reproduzível e rollback definidos.
- [ ] Dependências entre Skills e conflitos registrados.

## Fontes para revisão aprofundada
DHA architecture, performance-testing, openapi-contract.

> Texto original de curadoria, não transcrição de Skill de terceiros. Verificar APIs e versões na documentação oficial antes de gerar código.

## Contrato operacional e exemplos
Aplicar [contrato dos agentes](../CONTRATO-EXECUCAO-AGENTES.md) e [exemplos e contraindicações](references/EXEMPLOS-E-DECISOES.md). Exemplos didáticos: validar versão, imports, testes, segurança, rollback e evidências antes de recomendar adoção.
