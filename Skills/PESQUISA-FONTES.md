# Pesquisa de fontes — fase 1

Data: 2026-10-17. Status: levantamento incremental; não é certificação das Skills.

## Fontes inspecionadas (README)
1. DHA Skill — https://github.com/dunghoangcy-web/ai-skill-java-spring-boot — catálogo de 14 Skills: architecture, spring-boot, jpa-patterns, logging-patterns, code-quality, design-patterns, security, devops, openapi-contract, testing, messaging, pentest-readiness, performance-testing, code-scanning. README declara licença MIT; verificar LICENSE e cada conteúdo antes de importar.
2. Awesome Java Agent Skills — https://github.com/Marisha-Sahay/awesome-java-agent-skills — quatro Skills declaradas disponíveis (java-clean-code, spring-boot-3-expert, junit5-mockito-testcontainers, maven-dependency-management); concurrency e spring-data-jpa aparecem no roadmap, não como disponíveis. Baseline Java 21 / Boot 3; adaptar.
3. JVM Expert Agent Skills — https://github.com/robsonkades/agent-skills — gerenciador e catálogo com java-performance e jvm-gc-tuning, versionamento, lockfile e suporte Codex. Verificar conteúdo e licença antes de copiar.

## Referências técnicas oficiais a utilizar na validação
- Java/JDK: https://docs.oracle.com/en/java/javase/25/
- Spring Boot: https://docs.spring.io/spring-boot/
- MySQL: https://dev.mysql.com/doc/refman/8.4/en/explain.html (confirmar versão real do servidor)
- PostgreSQL não é baseline Golden: não aplicar heurísticas específicas sem justificativa.
- Resilience4j: https://resilience4j.readme.io/
- OpenTelemetry: https://opentelemetry.io/docs/
- Testcontainers: https://java.testcontainers.org/

## Critérios para incorporar conhecimento
Aderência técnica; compatibilidade de versão; licença; atualização; exemplos executáveis; explicação de trade-offs; segurança contra prompt injection; evidências mensuráveis; compatibilidade com arquitetura existente. Não executar scripts de repositórios externos sem revisão.

## Próximos alvos
Inspecionar cada SKILL.md upstream, registrar commit SHA, licença, tópicos aproveitados e conflitos. Pesquisar Skills adicionais de query tuning, performance engineering, SRE, load testing, observabilidade, segurança e contratos REST. Não tratar catálogos README como validação de implementação.
