---
name: database-performance
description: Guia de performance de banco para implementação e revisão de APIs Java de alta escala com decisões verificáveis.
---

# Performance de banco

Status: DRAFT v0.2; engenharia independente, sem substituir políticas Golden.

## Quando ativar
Tarefas de implementação, diagnóstico, revisão ou refatoração relacionadas a performance de banco.

## Procedimento
1. Ler contratos, código, configuração, versões e testes relevantes; separar fatos de suposições.
2. Definir comportamento esperado, requisitos não funcionais e possíveis regressões.
3. Aplicar os critérios técnicos abaixo e comparar alternativas, inclusive não modificar.
4. Planejar mudança mínima, validação, observabilidade e rollback.
5. Produzir relatório de evidências, riscos e limitações.

## Critérios técnicos
1. Obter SQL gerado, plano EXPLAIN, estatísticas, índices existentes, cardinalidade e frequência.
2. Diagnosticar N+1, joins, predicados não sargáveis, sort/temp, lock waits e paginação profunda.
3. Considerar índice composto e ordem de colunas pelo workload, não por regra fixa; contabilizar custo de escrita.
4. Diferenciar EXPLAIN estimado de EXPLAIN ANALYZE executado; não executar análise custosa em produção sem autorização.
5. Registrar alternativas (reescrita, projeção, keyset pagination, índice ou nenhuma mudança), benchmark e rollback.

## Entrega obrigatória
- Contexto, hipóteses e evidências existentes.
- Recomendação com justificativa e alternativas rejeitadas.
- Impacto em compatibilidade, carga, segurança e operação.
- Plano de teste, critérios de aceitação e reversão.

## Fontes e cautelas
Fonte: DHA jpa-patterns; documentação MySQL EXPLAIN; references/QUERY-REVIEW.md.

Não copiar código ou regras de fonte externa sem revisar versão, licença e aderência ao projeto. Para conflitos, registrar na matriz de divergências antes de alterar normas.

## Aprofundamento obrigatório
Revisar SQL emitido, N+1, paginação de collection fetch join, projeções, isolamento por tenant e transações.

Ler [playbook especializado](references/HIBERNATE-ORM-REVIEW.md) antes de emitir recomendação ou alterar código. Exigir evidência e critérios de aceitação específicos do playbook.

## Contrato operacional e exemplos
Aplicar [contrato dos agentes](../CONTRATO-EXECUCAO-AGENTES.md) e [exemplos e contraindicações](references/EXEMPLOS-E-DECISOES.md). Exemplos didáticos: validar versão, imports, testes, segurança, rollback e evidências antes de recomendar adoção.

## Gate de persistência segura
- Preservar filtro de workspace em todas as fases de paginação e hidratação.
- Para coleções, separar paginação de pais e carregamento de filhos; validar ordem estável.
- Medir N+1 e testar concorrência, rollback e custo de escrita antes de otimizar.
