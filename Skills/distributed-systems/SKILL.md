---
name: distributed-systems
description: Skill de sistemas distribuídos para investigar, implementar e revisar sistemas Java de alta escala com decisões baseadas em evidências.
---

# Sistemas distribuídos

Status: pesquisa/curadoria v0.2. Independente de convenções Golden; não é norma aprovada.

## Gatilhos
Projetar consistência, ownership, eventos, outbox/inbox, duplicidade, ordenação, retries e falhas parciais.

## Protocolo
1. Ler código, contratos, configuração, métricas e testes disponíveis; separar fatos de hipóteses.
2. Classificar garantias necessárias (at-least-once, ordering, consistência eventual) e efeitos colaterais.
3. Usar chaves idempotentes e deduplicação; preservar atomicidade local; documentar reconciliação e replay.
4. Identificar impacto em segurança, consistência, observabilidade e custo operacional.
5. Propor mudança mínima, critérios de aceitação, experimento controlado e reversão.

## Antipadrões
Não prometer exactly-once end-to-end sem evidência; não fazer dual-write sem estratégia de recuperação.

## Entregáveis
Diagramas de sequência e falhas, testes de duplicidade, perda temporária, reordenação e replay.

## Critérios de revisão
- [ ] Evidências e premissas explicitadas.
- [ ] Alternativas consideradas, inclusive não alterar.
- [ ] Comportamento em falha e sob carga descrito.
- [ ] Teste reproduzível e rollback definidos.
- [ ] Dependências entre Skills e conflitos registrados.

## Fontes para revisão aprofundada
DHA architecture/messaging; Resilience4j; transactional outbox pattern.

> Texto original de curadoria, não transcrição de Skill de terceiros. Verificar APIs e versões na documentação oficial antes de gerar código.

## Aprofundamento obrigatório
Testar falhas antes/depois do commit, ACK, efeitos externos, outbox e replay.

Ler [playbook especializado](references/IDEMPOTENCY-FAILURE-MATRIX.md) antes de emitir recomendação ou alterar código. Exigir evidência e critérios de aceitação específicos do playbook.

## Contrato operacional e exemplos
Aplicar [contrato dos agentes](../CONTRATO-EXECUCAO-AGENTES.md) e [exemplos e contraindicações](references/EXEMPLOS-E-DECISOES.md). Exemplos didáticos: validar versão, imports, testes, segurança, rollback e evidências antes de recomendar adoção.
