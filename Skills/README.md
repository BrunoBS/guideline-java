# Golden Engineering Skills — proposta em análise

Status: DRAFT / NÃO APROVADO. Este diretório não altera as regras vigentes da Golden Platform Foundation.

## Objetivo
Construir Skills reutilizáveis para agentes (Codex e compatíveis), confrontando cada recomendação com a documentação vigente antes de torná-la normativa.

## Catálogo
- java-25-best-practices
- solid-clean-code
- design-patterns
- spring-boot-4
- resilience-patterns
- jvm-performance
- database-performance
- testing-quality
- architecture-review

## Ordem de precedência provisória
1. Contratos e decisões aprovadas da Golden, verificados na documentação do projeto.
2. Documentação oficial das tecnologias nas versões efetivamente utilizadas.
3. Recomendações das Skills externas, após revisão de licença, compatibilidade e segurança.

Divergências não devem ser resolvidas automaticamente. Registrar em `DIVERGENCIAS.md`, com evidência documental e proposta de decisão. Não modificar arquitetura, código, migrations, bibliotecas ou padrões existentes nesta fase.

## Referências candidatas (não incorporadas sem auditoria)
- https://github.com/dunghoangcy-web/ai-skill-java-spring-boot
- https://github.com/Marisha-Sahay/awesome-java-agent-skills
- https://github.com/anthropics/skills
- https://github.com/robsonkades/agent-skills
- https://github.com/resilience4j/resilience4j

## Critérios de aceitação
Cada Skill deve documentar: gatilho de uso, escopo, decisões obrigatórias, antipadrões, checklist, exemplos, referências e divergências. Validar as versões Java 25 / Spring Boot 4 e aderência a platform-build/platform-libraries. A análise documental está em andamento; não alegar conformidade integral sem conferir os arquivos de origem.
