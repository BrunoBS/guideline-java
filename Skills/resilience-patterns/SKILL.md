---
name: resilience-patterns
description: Guia de resiliência para implementação e revisão de APIs Java de alta escala com decisões verificáveis.
---

# Resiliência

Status: DRAFT v0.2; engenharia independente, sem substituir políticas Golden.

## Quando ativar
Tarefas de implementação, diagnóstico, revisão ou refatoração relacionadas a resiliência.

## Procedimento
1. Ler contratos, código, configuração, versões e testes relevantes; separar fatos de suposições.
2. Definir comportamento esperado, requisitos não funcionais e possíveis regressões.
3. Aplicar os critérios técnicos abaixo e comparar alternativas, inclusive não modificar.
4. Planejar mudança mínima, validação, observabilidade e rollback.
5. Produzir relatório de evidências, riscos e limitações.

## Critérios técnicos
1. Definir deadline fim a fim antes de timeout por dependência; separar falhas transitórias e permanentes.
2. Retries limitados, backoff/jitter e orçamento total de tentativas entre camadas; evitar retry storms.
3. Circuit breaker e bulkhead devem ser dimensionados por carga e taxa de erro; fallback apenas quando preserva semântica.
4. Para mensagens: idempotência, DLQ, replay, ordenação e outbox; testar duplicidade e poison messages.
5. Exigir chaos/fault injection controlado, observabilidade de tentativas, filas, erros e recuperação.

## Entrega obrigatória
- Contexto, hipóteses e evidências existentes.
- Recomendação com justificativa e alternativas rejeitadas.
- Impacto em compatibilidade, carga, segurança e operação.
- Plano de teste, critérios de aceitação e reversão.

## Fontes e cautelas
Fonte: DHA architecture/messaging; Resilience4j; references/FAILURE-MODES.md.

Não copiar código ou regras de fonte externa sem revisar versão, licença e aderência ao projeto. Para conflitos, registrar na matriz de divergências antes de alterar normas.

## Aprofundamento obrigatório
Calcular amplificação de retries, deadline fim a fim e idempotência; verificar cancelamento real do I/O.

Ler [playbook especializado](references/RETRY-BUDGETS.md) antes de emitir recomendação ou alterar código. Exigir evidência e critérios de aceitação específicos do playbook.

## Contrato operacional e exemplos
Aplicar [contrato dos agentes](../CONTRATO-EXECUCAO-AGENTES.md) e [exemplos e contraindicações](references/EXEMPLOS-E-DECISOES.md). Exemplos didáticos: validar versão, imports, testes, segurança, rollback e evidências antes de recomendar adoção.

## Gate de orçamento de retries
- Contabilizar tentativas totais entre camadas e deadline fim a fim.
- Não repetir operação não idempotente sem estratégia comprovada.
- Fallback não pode mascarar erro de autorização ou integridade.
