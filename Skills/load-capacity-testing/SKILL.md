---
name: load-capacity-testing
description: Skill de testes de carga e capacidade para investigar, implementar e revisar sistemas Java de alta escala com decisões baseadas em evidências.
---

# Testes de carga e capacidade

Status: pesquisa/curadoria v0.2. Independente de convenções Golden; não é norma aprovada.

## Gatilhos
Projetar workload representativo, stress, spike, soak, ramp-up, capacity envelope e critérios de release.

## Protocolo
1. Ler código, contratos, configuração, métricas e testes disponíveis; separar fatos de hipóteses.
2. Registrar gerador, hardware, massa de dados, think time, taxas oferecida/concluída, warmup e omissão coordenada.
3. Comparar p50/p95/p99, throughput útil, erros, saturação, filas, GC e downstreams por cenário.
4. Identificar impacto em segurança, consistência, observabilidade e custo operacional.
5. Propor mudança mínima, critérios de aceitação, experimento controlado e reversão.

## Antipadrões
Não inferir capacidade apenas de média ou de teste sem carga realista; não ocultar requests rejeitadas.

## Entregáveis
Relatório reproduzível com cenário, versão, limites, métricas, capacidade segura e rollback.

## Critérios de revisão
- [ ] Evidências e premissas explicitadas.
- [ ] Alternativas consideradas, inclusive não alterar.
- [ ] Comportamento em falha e sob carga descrito.
- [ ] Teste reproduzível e rollback definidos.
- [ ] Dependências entre Skills e conflitos registrados.

## Fontes para revisão aprofundada
DHA performance-testing; JVM Expert java-performance.

> Texto original de curadoria, não transcrição de Skill de terceiros. Verificar APIs e versões na documentação oficial antes de gerar código.

## Aprofundamento obrigatório
Distinguir offered load e goodput, saturação do gerador e coordinated omission.

Ler [playbook especializado](references/WORKLOAD-AND-OMISSION.md) antes de emitir recomendação ou alterar código. Exigir evidência e critérios de aceitação específicos do playbook.
