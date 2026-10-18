# Engineering Skills — catálogo de curadoria v0.2

**Status: DRAFT.** Fases 1 (pesquisa/curadoria selecionada) e 2 (enriquecimento editorial) concluídas como **primeira iteração**, não como auditoria exaustiva nem certificação. Nenhuma norma Golden foi alterada.

## Catálogo (17 Skills)

### Engenharia de código e arquitetura
- java-25-best-practices
- solid-clean-code
- design-patterns
- spring-boot-4
- architecture-review

### Performance, escala e dados
- api-scalability
- jvm-performance
- java-concurrency
- database-performance
- sql-query-optimization
- load-capacity-testing
- cache-engineering

### Resiliência, operação e segurança
- resilience-patterns
- distributed-systems
- observability-sre
- api-security
- testing-quality

## Documentos de suporte
- [AUDITORIA-SKILLS-EXTERNAS.md](AUDITORIA-SKILLS-EXTERNAS.md): 12 arquivos upstream lidos e ressalvas.
- [PESQUISA-FONTES.md](PESQUISA-FONTES.md): repositórios e documentação oficial.
- [EXEMPLOS-DECISAO.md](EXEMPLOS-DECISAO.md): oito cenários para validação posterior.
- [DEPENDENCIAS-E-ATIVACAO.md](DEPENDENCIAS-E-ATIVACAO.md): roteamento e distribuição para Codex.
- [ROADMAP-ENRIQUECIMENTO.md](ROADMAP-ENRIQUECIMENTO.md): etapas seguintes.
- [MATRIZ-RASTREABILIDADE.md](MATRIZ-RASTREABILIDADE.md): confronto futuro com Golden.
- [DIVERGENCIAS.md](DIVERGENCIAS.md): triagem inicial, **não** conclusões de conflito.
- Playbooks em `database-performance/references`, `resilience-patterns/references` e `jvm-performance/references`.

## Regras da curadoria
1. Priorizar evidência, workload real, análise de trade-offs e teste de regressão.
2. Não impor índice, cache, retry, GC, abstração ou escalabilidade horizontal sem diagnóstico.
3. Não copiar snippets de Java 21 / Spring Boot 3 sem confirmar compatibilidade com Java 25 / Spring Boot 4.
4. Não copiar scripts ou textos de terceiros sem verificar licença, origem e riscos.
5. Distinguir recomendações gerais de normas Golden; conflitos ficam pendentes de decisão.
6. Não executar mudanças em infraestrutura, banco ou código do produto nesta fase.

## Próximas etapas
- **Fase 3:** avaliar as Skills com cenários reproduzíveis e testes reais do agente.
- **Fase 4:** cruzar documentação Golden, registrar conflitos comprovados e construir identidade própria após aprovação.

**Nota de instalação:** `Skills/` é catálogo; não significa ativação automática no Codex. Consultar `DEPENDENCIAS-E-ATIVACAO.md`.
