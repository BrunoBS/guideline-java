---
name: resilience-patterns
description: Orientações preliminares de Resiliência para revisões e implementações da Golden Platform; usar quando a tarefa abordar este tema.
---

# Resiliência

> DRAFT — proposta para revisão, não é política aprovada.

## Quando usar
Ao implementar, refatorar ou revisar mudanças que envolvam resiliência.

## Instruções provisórias
Definir timeout, retry com backoff/jitter, circuit breaker, bulkhead e idempotência por integração e semântica de falha.

## Evitar
Não repetir operações não idempotentes indiscriminadamente; respeitar DLQ e ordering.

## Checklist de revisão
- [ ] Conferir documentação Golden aplicável e versão das dependências.
- [ ] Identificar contratos públicos e compatibilidade retroativa.
- [ ] Verificar testes, observabilidade e riscos de regressão.
- [ ] Justificar decisões com evidência técnica.
- [ ] Registrar conflito em `../DIVERGENCIAS.md` antes de alterar convenções.

## Documentos a confrontar
messaging AWS/Azure, audit outbox, observability.

## Referências externas candidatas
- https://github.com/dunghoangcy-web/ai-skill-java-spring-boot
- https://github.com/Marisha-Sahay/awesome-java-agent-skills
- https://github.com/robsonkades/agent-skills

> Fontes candidatas: ainda não incorporadas nem auditadas integralmente quanto a licença e compatibilidade.
