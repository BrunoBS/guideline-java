# Roadmap de enriquecimento — engenharia de alta escala

## Fase 1 — Arsenal técnico (atual)
- Inventariar fontes e revisar licença, versão, escopo e qualidade.
- Desenvolver playbooks independentes para SQL/índices, resiliência e performance JVM.
- Ampliar: API contracts, observabilidade/SRE, segurança, concorrência/backpressure, mensageria e capacity planning.
- Criar cenários de avaliação: carga, falha, regressão, query sem índice e query em que índice não ajuda.

## Fase 2 — Identidade Golden (posterior, somente após revisão)
- Mapear documentação Golden vigente e versões reais.
- Classificar divergências com evidências, risco e alternativas.
- Aprovar regras Golden, exemplos específicos e testes automatizados.
- Distribuir Skills aprovadas para Codex em `.agents/skills/` nos repositórios consumidores, sem confundir pasta de catálogo com instalação ativa.

## Política
Nada de merge automático, mudança de código ou alteração de arquitetura nesta fase. Nenhuma Skill externa será copiada integralmente sem verificar licença, proveniência e qualidade.
