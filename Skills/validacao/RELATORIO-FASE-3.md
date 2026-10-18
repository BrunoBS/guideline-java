# Fase 3 — avaliação inicial de qualidade das Skills

Data: 2026-10-17. Escopo autorizado: somente `guideline-java/Skills/`; nenhum serviço Golden alterado.

## Três frentes de validação
1. **3.1 — Inspeção estática/documental (EXECUTADA):** leitura dos 17 SKILL.md da branch, checklist estrutural e cobertura de tópicos.
2. **3.2 — Simulação de decisão técnica (PREPARADA, NÃO EXECUTADA COM CODEX):** oito cenários com respostas esperadas, critérios e reprovações em `CASOS-E-GABARITO.md`.
3. **3.3 — Laboratório isolado (PLANEJADO, NÃO EXECUTADO):** protocolos de SQL, Java e falhas em `LABORATORIO-ISOLADO.md`. Não usar repositórios reais.

## Evidência da inspeção estática
- 17/17 Skills acessíveis no GitHub na branch `docs/golden-engineering-skills`.
- 17/17 contêm frontmatter, descrição, gatilho, instruções de avaliação, indicação de testes e seção de fontes/cautelas.
- 0/17 contêm bloco de código executável (```), comandos reproduzíveis ou teste de exemplo **no corpo principal**.
- 17/17 possuem 37 linhas; aproximadamente 221–268 palavras por Skill.
- Três playbooks de referência adicionais existem para SQL, resiliência e JVM; isso melhora profundidade **parcialmente**, mas não substitui casos executáveis em cada Skill.
- Oito cenários de avaliação foram documentados, porém ainda não há respostas reais do Codex, compilação, execução de testes ou medições.

## Avaliação qualitativa — editorial, não benchmark
| Dimensão | Nota provisória (0–5) | Evidência / limitação |
|---|---:|---|
| Organização e descoberta | 4 | 17 Skills nomeadas e agrupadas; ativação Codex ainda não testada |
| Cobertura de temas de alta escala | 4 | Banco, concorrência, resiliência, segurança, SRE, cache e carga |
| Profundidade especializada | 2 | Textos concisos; regras avançadas ainda incompletas |
| Exemplos reproduzíveis | 1 | Nenhum bloco executável nos 17 SKILL.md |
| Critérios baseados em evidência | 4 | Exigem métricas, alternativas, testes e rollback |
| Compatibilidade técnica comprovada | 1 | Sem compilação Java 25/Spring Boot 4 ou prova MySQL |
| Comportamento do agente comprovado | 0 | Codex não executado contra casos |
| Identidade Golden | NÃO AVALIADA | Fase 4 deliberadamente adiada |

**Leitura:** as notas são julgamento de maturidade editorial, não desempenho do agente nem certificação. Não calcular média geral como se representasse eficácia.

## Riscos prioritários
P0 — nenhuma avaliação real do agente: não afirmar que Codex segue as instruções.
P0 — nenhum experimento/benchmark: não afirmar ganho de performance, capacidade ou confiabilidade.
P1 — nenhuma Skill possui exemplos e contraexemplos executáveis; referências técnicas nem sempre têm versão/página exata.
P1 — Skills de SQL e database-performance podem se sobrepor; idem api-scalability, load-capacity-testing e jvm-performance. Refinar ownership.
P1 — faltam critérios de saída específicos por Skill, além do checklist compartilhado.
P2 — validação de formato, links, proveniência/commit SHA de terceiros e regras de instalação ainda pendentes.

## Veredito
**Prontas para revisão editorial e ensaios controlados; não prontas para adoção normativa nem para orientar alterações autônomas em produção.** A próxima evidência necessária é uma execução real do Codex com e sem Skill, sob os mesmos casos, seguida de laboratório isolado.

## Restrições
Não houve modificação de `platform-build`, `platform-libraries`, serviços Golden, banco ou infraestrutura. Esta fase só registra artefatos de avaliação em `Skills/`.
