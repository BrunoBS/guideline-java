---
name: java-25-best-practices
description: Orientações preliminares de Java 25 para revisões e implementações da Golden Platform; usar quando a tarefa abordar este tema.
---

# Java 25

> DRAFT — proposta para revisão, não é política aprovada.

## Quando usar
Ao implementar, refatorar ou revisar mudanças que envolvam java 25.

## Instruções provisórias
Preferir recursos estáveis da linguagem; justificar records, sealed types e virtual threads por necessidade; evitar preview sem aprovação.

## Evitar
Não introduzir APIs de Java 21 como limite de versão nem recursos preview por padrão.

## Checklist de revisão
- [ ] Conferir documentação Golden aplicável e versão das dependências.
- [ ] Identificar contratos públicos e compatibilidade retroativa.
- [ ] Verificar testes, observabilidade e riscos de regressão.
- [ ] Justificar decisões com evidência técnica.
- [ ] Registrar conflito em `../DIVERGENCIAS.md` antes de alterar convenções.

## Documentos a confrontar
platform-build, parent POM, CI JDK 25.

## Referências externas candidatas
- https://github.com/dunghoangcy-web/ai-skill-java-spring-boot
- https://github.com/Marisha-Sahay/awesome-java-agent-skills
- https://github.com/robsonkades/agent-skills

> Fontes candidatas: ainda não incorporadas nem auditadas integralmente quanto a licença e compatibilidade.
