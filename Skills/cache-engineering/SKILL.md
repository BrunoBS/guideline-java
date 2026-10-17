---
name: cache-engineering
description: Skill de engenharia de cache para investigar, implementar e revisar sistemas Java de alta escala com decisões baseadas em evidências.
---

# Engenharia de cache

Status: pesquisa/curadoria v0.2. Independente de convenções Golden; não é norma aprovada.

## Gatilhos
Decidir se usar cache, TTL, chave, invalidação, consistência, stampede, hot keys e limites de memória.

## Protocolo
1. Ler código, contratos, configuração, métricas e testes disponíveis; separar fatos de hipóteses.
2. Definir fonte da verdade, taxa de acerto, custo de miss, tolerância a stale e comportamento de indisponibilidade.
3. Avaliar cache-aside, invalidação por evento, TTL com jitter, single-flight, negative caching e métricas de hit/miss.
4. Identificar impacto em segurança, consistência, observabilidade e custo operacional.
5. Propor mudança mínima, critérios de aceitação, experimento controlado e reversão.

## Antipadrões
Não cachear dados de autorização entre tenants sem isolamento; não confiar em TTL como única garantia de correção.

## Entregáveis
Plano de chave e invalidação, teste de concorrência em miss, falha Redis e atualização simultânea.

## Critérios de revisão
- [ ] Evidências e premissas explicitadas.
- [ ] Alternativas consideradas, inclusive não alterar.
- [ ] Comportamento em falha e sob carga descrito.
- [ ] Teste reproduzível e rollback definidos.
- [ ] Dependências entre Skills e conflitos registrados.

## Fontes para revisão aprofundada
DHA architecture, Redis docs, distributed systems.

> Texto original de curadoria, não transcrição de Skill de terceiros. Verificar APIs e versões na documentação oficial antes de gerar código.

## Aprofundamento obrigatório
TTL jitter não resolve hot key isolada; diferenciar single-flight local, coordenação distribuída e stale.

Ler [playbook especializado](references/STAMPEDE-AND-CONSISTENCY.md) antes de emitir recomendação ou alterar código. Exigir evidência e critérios de aceitação específicos do playbook.

## Contrato operacional e exemplos
Aplicar [contrato dos agentes](../CONTRATO-EXECUCAO-AGENTES.md) e [exemplos e contraindicações](references/EXEMPLOS-E-DECISOES.md). Exemplos didáticos: validar versão, imports, testes, segurança, rollback e evidências antes de recomendar adoção.
