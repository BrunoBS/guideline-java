---
name: testing-quality
description: Orientações preliminares de Qualidade e testes para revisões e implementações da Golden Platform; usar quando a tarefa abordar este tema.
---

# Qualidade e testes

> DRAFT — proposta para revisão, não é política aprovada.

## Quando usar
Ao implementar, refatorar ou revisar mudanças que envolvam qualidade e testes.

## Instruções provisórias
Usar JUnit, testes de contrato, integração e Testcontainers, priorizando os módulos platform-testing existentes.

## Evitar
Não duplicar fixtures ou subir containers em testes unitários sem necessidade.

## Checklist de revisão
- [ ] Conferir documentação Golden aplicável e versão das dependências.
- [ ] Identificar contratos públicos e compatibilidade retroativa.
- [ ] Verificar testes, observabilidade e riscos de regressão.
- [ ] Justificar decisões com evidência técnica.
- [ ] Registrar conflito em `../DIVERGENCIAS.md` antes de alterar convenções.

## Documentos a confrontar
platform-testing-core/authorization/http/kafka/database/aws/azure.

## Referências externas candidatas
- https://github.com/dunghoangcy-web/ai-skill-java-spring-boot
- https://github.com/Marisha-Sahay/awesome-java-agent-skills
- https://github.com/robsonkades/agent-skills

> Fontes candidatas: ainda não incorporadas nem auditadas integralmente quanto a licença e compatibilidade.
