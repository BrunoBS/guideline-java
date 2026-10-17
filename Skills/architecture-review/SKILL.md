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
