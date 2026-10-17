---
name: sql-query-optimization
description: Skill de otimização de consultas sql para investigar, implementar e revisar sistemas Java de alta escala com decisões baseadas em evidências.
---

# Otimização de consultas SQL

Status: pesquisa/curadoria v0.2. Independente de convenções Golden; não é norma aprovada.

## Gatilhos
Diagnosticar SQL e decidir com evidência sobre reescrita, índices, cardinalidade, paginação e locks.

## Protocolo
1. Ler código, contratos, configuração, métricas e testes disponíveis; separar fatos de hipóteses.
2. Coletar SQL real, parâmetros, EXPLAIN, estatísticas, cardinalidade, índices existentes, frequência e impacto de escrita.
3. Avaliar predicados sargáveis, índice composto/prefixo esquerdo, joins, N+1, sorts, filtros e estimativas versus execução real.
4. Identificar impacto em segurança, consistência, observabilidade e custo operacional.
5. Propor mudança mínima, critérios de aceitação, experimento controlado e reversão.

## Antipadrões
Não criar índice automaticamente nem recomendar FORCE INDEX sem análise; não executar EXPLAIN ANALYZE custoso em produção sem autorização.

## Entregáveis
Diagnóstico, hipóteses alternativas, plano, benchmark, impacto DML e rollback; consultar references/QUERY-REVIEW.md.

## Critérios de revisão
- [ ] Evidências e premissas explicitadas.
- [ ] Alternativas consideradas, inclusive não alterar.
- [ ] Comportamento em falha e sob carga descrito.
- [ ] Teste reproduzível e rollback definidos.
- [ ] Dependências entre Skills e conflitos registrados.

## Fontes para revisão aprofundada
DHA jpa-patterns; MySQL EXPLAIN docs.

> Texto original de curadoria, não transcrição de Skill de terceiros. Verificar APIs e versões na documentação oficial antes de gerar código.

## Aprofundamento obrigatório
Antes de recomendar índices, consultar plano, distribuição de parâmetros e custo DML; comparar índice, reescrita e nenhuma alteração.

Ler [playbook especializado](references/DIAGNOSTICO-MYSQL.md) antes de emitir recomendação ou alterar código. Exigir evidência e critérios de aceitação específicos do playbook.

## Contrato operacional e exemplos
Aplicar [contrato dos agentes](../CONTRATO-EXECUCAO-AGENTES.md) e [exemplos e contraindicações](references/EXEMPLOS-E-DECISOES.md). Exemplos didáticos: validar versão, imports, testes, segurança, rollback e evidências antes de recomendar adoção.
