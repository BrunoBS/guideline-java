---
name: architecture-review
description: Guia de revisão arquitetural para implementação e revisão de APIs Java de alta escala com decisões verificáveis.
---

# Revisão arquitetural

Status: DRAFT v0.2; engenharia independente, sem substituir políticas Golden.

## Quando ativar
Tarefas de implementação, diagnóstico, revisão ou refatoração relacionadas a revisão arquitetural.

## Procedimento
1. Ler contratos, código, configuração, versões e testes relevantes; separar fatos de suposições.
2. Definir comportamento esperado, requisitos não funcionais e possíveis regressões.
3. Aplicar os critérios técnicos abaixo e comparar alternativas, inclusive não modificar.
4. Planejar mudança mínima, validação, observabilidade e rollback.
5. Produzir relatório de evidências, riscos e limitações.

## Critérios técnicos
1. Mapear boundaries, ownership de dados, contratos, chamadas síncronas/assíncronas e blast radius.
2. Avaliar disponibilidade, consistência, segurança, performance, custo e operabilidade como trade-offs explícitos.
3. Revisar ciclo completo: API, transação, persistência, evento, cache, métricas, rollout e rollback.
4. Classificar findings por severidade e evidência; distinguir falha demonstrada, risco plausível e preferência estilística.
5. Priorizar menor solução que satisfaça requisitos; não aprovar abstrações sem necessidade.

## Entrega obrigatória
- Contexto, hipóteses e evidências existentes.
- Recomendação com justificativa e alternativas rejeitadas.
- Impacto em compatibilidade, carga, segurança e operação.
- Plano de teste, critérios de aceitação e reversão.

## Fontes e cautelas
Fonte: DHA architecture/code-quality/security/devops; Golden somente na segunda fase.

Não copiar código ou regras de fonte externa sem revisar versão, licença e aderência ao projeto. Para conflitos, registrar na matriz de divergências antes de alterar normas.

## Contrato operacional e exemplos
Aplicar [contrato dos agentes](../CONTRATO-EXECUCAO-AGENTES.md) e [exemplos e contraindicações](references/EXEMPLOS-E-DECISOES.md). Exemplos didáticos: validar versão, imports, testes, segurança, rollback e evidências antes de recomendar adoção.

## Gate de decisão arquitetural
- Registrar ADR com alternativas, ownership, custos e reversão.
- Não propor microserviço sem avaliar fronteira de dados e falhas distribuídas.
- Classificar findings em comprovado, provável ou hipótese.

## Gate de arquitetura executável
- Descrever fluxo ponta a ponta: entrada HTTP/mensagem → autenticação → autorização → caso de uso → transação → persistência → evento/outbox → cache → observabilidade.
- Registrar owner dos dados, contratos públicos, dependências síncronas/assíncronas, propagação de contexto, política de erros e limites de consistência.
- Para bibliotecas, mapear consumidores, API/ABI, compatibilidade de versões, dependências transitivas, auto-configuração e impacto de breaking changes.
- Para cada proposta arquitetural, comparar pelo menos alternativa mínima e alternativa distribuída, indicando custos de operação, testes, falhas e reversão.
- Exigir ADR com cenário, decisão, opções rejeitadas, riscos, evidência e critérios de revisão; não promover um desenho a norma sem validação.
- Gate de segurança: nenhum boundary pode confiar em contexto de tenant fornecido pelo cliente sem autenticação/autorização no backend.
- Gate de entrega: diagrama ou sequência verificável, matriz de contratos e plano de teste de integração/falha.
