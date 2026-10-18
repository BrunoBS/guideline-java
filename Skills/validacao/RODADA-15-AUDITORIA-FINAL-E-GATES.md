# Rodada 15 — auditoria final, evidências e gates de aceite

Data: 2026-10-17. Branch: `docs/golden-engineering-skills`. PR #4 (draft).

## Estado do ciclo
- 17 Engineering Skills com `SKILL.md` e referências didáticas sob `Skills/`.
- 14 rodadas anteriores concluídas; baseline da Rodada 14: commit `5ca641149655742d72ce8da5358d140c9670ba03`, GitHub Actions `39083162514`, quatro jobs verdes.
- Rodada 15 consolida a matriz de evidências e pendências. **CI desta rodada ainda precisa ser confirmado.**
- Não houve merge, promoção para Golden nem alteração em serviços ou bibliotecas Golden.

## Matriz de evidências verificáveis

| Domínio | Evidência automatizada | Escopo e limitação |
| --- | --- | --- |
| Estrutura das 17 Skills | `Skills/validacao/audit_skills.py` | Presença de arquivos, frontmatter, links e headings; não prova correção técnica |
| Java 25 | `Skills/laboratorio-java`, job `java25-smoke` | Smoke tests e cenários de concorrência isolados |
| MySQL / Redis | `Skills/laboratorio-integracao`, job `mysql-redis-testcontainers` | Isolamento JDBC, replay/idempotência, JWT/HTTP sintético, cache stampede e ownership Redis |
| Spring Boot 4 / Hibernate | `Skills/laboratorio-spring-hibernate`, job `spring-hibernate-testcontainers` | N+1, paginação, JWT decoder e SecurityFilterChain servlet simulada |
| GitHub CI | `.github/workflows/skills-validation.yml` | Quatro jobs verdes na Rodada 14; não certifica uso real da Golden |
| Casos A/B | `Skills/validacao/CASOS-E-GABARITO.md` e `AGENTE-A-B-PROTOCOLO.md` | Oito casos preparados, **nenhuma sessão A/B independente executada** |

## Critérios de aceite e veredito

1. **Estrutura e regressão automatizada: APROVADAS na baseline Rodada 14.** Os quatro jobs passaram.
2. **Testes isolados: APROVADOS na baseline Rodada 14**, com limitações de cobertura e infraestrutura explicitadas.
3. **Revisão técnica individual das 17 Skills com documentação oficial versionada: PENDENTE de evidência completa por Skill.**
4. **Experimento A/B Codex (controle sem Skills versus tratamento com Skills): BLOQUEADO**, sem sessões independentes, logs, pontuações ou julgamento cego.
5. **Integração e autorização na Golden: NÃO EXECUTADAS** por escopo e governança.
6. **Merge / promoção: NÃO AUTORIZADOS** até aprovação explícita.

**Conclusão:** a preparação e os laboratórios automatizados das 15 rodadas podem ser encerrados após CI verde deste documento, mas a **homologação integral das 17 Skills NÃO está concluída**. Não publicar métricas de ganho de qualidade, taxa de acerto ou pontuação A/B.

## Próximas ações fora do ciclo de 15 rodadas

- Executar os oito casos A/B em sessões Codex independentes, mesmo modelo e entradas, com isolamento, artefatos, rubrica 0–12 e revisão cega; reprovar qualquer erro crítico.
- Revisar individualmente as 17 Skills com referências oficiais, registrar versão, fonte, decisão e responsável.
- Reavaliar integração com Golden somente mediante autorização específica; manter PR #4 draft até decisão explícita.
