---
name: observability-sre
description: Skill de observabilidade e sre para investigar, implementar e revisar sistemas Java de alta escala com decisões baseadas em evidências.
---

# Observabilidade e SRE

Status: pesquisa/curadoria v0.2. Independente de convenções Golden; não é norma aprovada.

## Gatilhos
Investigar SLIs/SLOs, tracing distribuído, métricas, logs estruturados, alertas e resposta a incidentes.

## Protocolo
1. Ler código, contratos, configuração, métricas e testes disponíveis; separar fatos de hipóteses.
2. Definir sintomas observáveis, métricas RED/USE, ownership e correlação de traces sem expor dados pessoais.
3. Propagar contexto entre HTTP, async e mensagens; instrumentar dependências e operações de negócio com cardinalidade controlada.
4. Identificar impacto em segurança, consistência, observabilidade e custo operacional.
5. Propor mudança mínima, critérios de aceitação, experimento controlado e reversão.

## Antipadrões
Não usar IDs de usuário/workspace como labels de alta cardinalidade; não ativar sampling 100% em produção por padrão.

## Entregáveis
Dashboard, runbook, alertas acionáveis, teste de propagação e rastreio de falhas entre serviços.

## Critérios de revisão
- [ ] Evidências e premissas explicitadas.
- [ ] Alternativas consideradas, inclusive não alterar.
- [ ] Comportamento em falha e sob carga descrito.
- [ ] Teste reproduzível e rollback definidos.
- [ ] Dependências entre Skills e conflitos registrados.

## Fontes para revisão aprofundada
Spring Boot 4 Actuator observability/tracing/metrics, OpenTelemetry, DHA logging-patterns.

> Texto original de curadoria, não transcrição de Skill de terceiros. Verificar APIs e versões na documentação oficial antes de gerar código.
