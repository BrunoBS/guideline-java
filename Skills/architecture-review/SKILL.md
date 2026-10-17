---
name: architecture-review
description: Orientações preliminares de Revisão de arquitetura para revisões e implementações da Golden Platform; usar quando a tarefa abordar este tema.
---

# Revisão de arquitetura

> DRAFT — proposta para revisão, não é política aprovada.

## Quando usar
Ao implementar, refatorar ou revisar mudanças que envolvam revisão de arquitetura.

## Instruções provisórias
Revisar dependências, limites de contexto, contratos, segurança, resiliência, observabilidade e evidências de teste.

## Evitar
Não aprovar mudanças estruturais por preferências genéricas; registrar divergências.

## Checklist de revisão
- [ ] Conferir documentação Golden aplicável e versão das dependências.
- [ ] Identificar contratos públicos e compatibilidade retroativa.
- [ ] Verificar testes, observabilidade e riscos de regressão.
- [ ] Justificar decisões com evidência técnica.
- [ ] Registrar conflito em `../DIVERGENCIAS.md` antes de alterar convenções.

## Documentos a confrontar
governance, roadmap, guideline, platform-build/platform-libraries.

## Referências externas candidatas
- https://github.com/dunghoangcy-web/ai-skill-java-spring-boot
- https://github.com/Marisha-Sahay/awesome-java-agent-skills
- https://github.com/robsonkades/agent-skills

> Fontes candidatas: ainda não incorporadas nem auditadas integralmente quanto a licença e compatibilidade.
