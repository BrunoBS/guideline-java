# Auditoria de Skills externas — fase 1

Data: 2026-10-17. Escopo: inspeção textual de 12 SKILL.md selecionados e READMEs de 3 repositórios. Não é auditoria exaustiva de todo o GitHub nem validação de execução.

## Matriz de evidências

| Fonte | Arquivo upstream lido | Tema aproveitado | Avaliação / ressalva |
|---|---|---|---|
| DHA | architecture/SKILL.md | ownership, boundaries, contratos, complexidade progressiva | Forte base de arquitetura; genérica |
| DHA | jpa-patterns/SKILL.md | transações, N+1, índices, migrations | Falta análise detalhada de planos e cardinalidade |
| DHA | performance-testing/SKILL.md | workloads, SLO, carga, capacidade | Requer aprofundar cauda, omissão coordenada e saturação |
| DHA | messaging/SKILL.md | outbox, idempotência, DLQ | Precisará matriz específica por provedor |
| DHA | openapi-contract/SKILL.md | contratos, paginação, erros, compatibilidade | Falta segurança de paginação sob escrita concorrente |
| DHA | code-quality/SKILL.md | severidade, refatoração segura | Bom ponto de partida para SOLID |
| DHA | security/SKILL.md | JWT, autorização, segredos, abuso | Requer threat modeling específico |
| DHA | testing/SKILL.md | pirâmide, integração, contratos | Complementar com testes de falha/carga |
| Awesome Java | skills/clean-code/java-clean-code/SKILL.md | Java moderno, imutabilidade, exceptions | Java 21; impõe estilo 2 espaços, 100 chars e coverage arbitrários; NÃO incorporar como normas |
| Awesome Java | skills/testing/junit5-mockito-testcontainers/SKILL.md | AAA, Mockito, Testcontainers | Exemplo PostgreSQL; não pressupor MySQL nem versão |
| Awesome Java | skills/build-tools/maven-dependency-management/SKILL.md | BOM, convergência, transitive deps | Exemplo Spring Boot 3.1.5 e Enforcer antigo; não copiar versões |
| JVM Expert | skills/java-performance/SKILL.md | triagem de sintomas, população afetada, métricas, hipóteses | Excelente método evidence-first; skill roteadora, depende de especialistas |

## Observações técnicas da curadoria
- Os exemplos Java 21/Spring Boot 3 não foram tratados como compatíveis automaticamente com Java 25/Spring Boot 4.
- Regras de estilo e percentuais de cobertura de terceiros não são requisitos Golden.
- A recomendação upstream de Testcontainers PostgreSQL não foi adotada como escolha de banco.
- O material de performance mais forte enfatiza triagem e causalidade; não autoriza tuning sem medição.
- Para índices, EXPLAIN estimado e EXPLAIN ANALYZE executado respondem perguntas diferentes; este último pode consumir recursos e deve ser autorizado.
- Licenças e commits de cada arquivo ainda precisam ser congelados por SHA antes de importar trechos ou scripts. Nesta rodada houve leitura e síntese original, não cópia integral.

## Fontes oficiais verificadas
- https://docs.spring.io/spring-boot/4.0/reference/actuator/observability.html
- https://docs.spring.io/spring-boot/4.0/reference/actuator/metrics.html
- https://docs.spring.io/spring-boot/4.0/reference/actuator/tracing.html
- https://dev.mysql.com/doc/refman/8.4/en/explain.html

**Cuidado:** documentação MySQL 8.4 foi consultada como referência de mecanismo; verificar funcionalidades na versão MySQL 8.x efetivamente implantada antes de usar comandos.

## Lacunas para avaliação prática
Nenhum teste Codex com as Skills foi executado; nenhum benchmark foi rodado; nenhuma prova de compatibilidade Java 25/Spring Boot 4 foi compilada. Isso pertence à fase 3.
