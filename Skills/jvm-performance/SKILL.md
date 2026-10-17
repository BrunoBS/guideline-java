---
name: jvm-performance
description: Orientações preliminares de Performance JVM para revisões e implementações da Golden Platform; usar quando a tarefa abordar este tema.
---

# Performance JVM

> DRAFT — proposta para revisão, não é política aprovada.

## Quando usar
Ao implementar, refatorar ou revisar mudanças que envolvam performance jvm.

## Instruções provisórias
Medir antes e depois; utilizar profiling, JFR, métricas de GC, heap e CPU, testes de carga representativos.

## Evitar
Não ajustar GC, pool ou threads com base apenas em intuição.

## Checklist de revisão
- [ ] Conferir documentação Golden aplicável e versão das dependências.
- [ ] Identificar contratos públicos e compatibilidade retroativa.
- [ ] Verificar testes, observabilidade e riscos de regressão.
- [ ] Justificar decisões com evidência técnica.
- [ ] Registrar conflito em `../DIVERGENCIAS.md` antes de alterar convenções.

## Documentos a confrontar
observability, ECS, Java 25.

## Referências externas candidatas
- https://github.com/dunghoangcy-web/ai-skill-java-spring-boot
- https://github.com/Marisha-Sahay/awesome-java-agent-skills
- https://github.com/robsonkades/agent-skills

> Fontes candidatas: ainda não incorporadas nem auditadas integralmente quanto a licença e compatibilidade.
