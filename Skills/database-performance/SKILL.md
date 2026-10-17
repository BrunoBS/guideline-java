---
name: database-performance
description: Orientações preliminares de Performance de banco para revisões e implementações da Golden Platform; usar quando a tarefa abordar este tema.
---

# Performance de banco

> DRAFT — proposta para revisão, não é política aprovada.

## Quando usar
Ao implementar, refatorar ou revisar mudanças que envolvam performance de banco.

## Instruções provisórias
Analisar EXPLAIN, índices, cardinalidade, paginação, N+1, transações e contenção.

## Evitar
Não alterar filtros de autorização, constraints ou migrations por otimização sem validação.

## Checklist de revisão
- [ ] Conferir documentação Golden aplicável e versão das dependências.
- [ ] Identificar contratos públicos e compatibilidade retroativa.
- [ ] Verificar testes, observabilidade e riscos de regressão.
- [ ] Justificar decisões com evidência técnica.
- [ ] Registrar conflito em `../DIVERGENCIAS.md` antes de alterar convenções.

## Documentos a confrontar
MySQL 8, Flyway, authorization, schemas.

## Referências externas candidatas
- https://github.com/dunghoangcy-web/ai-skill-java-spring-boot
- https://github.com/Marisha-Sahay/awesome-java-agent-skills
- https://github.com/robsonkades/agent-skills

> Fontes candidatas: ainda não incorporadas nem auditadas integralmente quanto a licença e compatibilidade.
