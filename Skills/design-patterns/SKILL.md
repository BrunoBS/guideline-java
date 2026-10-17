---
name: design-patterns
description: Guia de design patterns para implementação e revisão de APIs Java de alta escala com decisões verificáveis.
---

# Design Patterns

Status: DRAFT v0.2; engenharia independente, sem substituir políticas Golden.

## Quando ativar
Tarefas de implementação, diagnóstico, revisão ou refatoração relacionadas a design patterns.

## Procedimento
1. Ler contratos, código, configuração, versões e testes relevantes; separar fatos de suposições.
2. Definir comportamento esperado, requisitos não funcionais e possíveis regressões.
3. Aplicar os critérios técnicos abaixo e comparar alternativas, inclusive não modificar.
4. Planejar mudança mínima, validação, observabilidade e rollback.
5. Produzir relatório de evidências, riscos e limitações.

## Critérios técnicos
1. Strategy para algoritmos variantes; Factory para criação complexa; Adapter para SDK externo; Decorator para comportamento transversal; Specification para filtros composáveis.
2. Outbox para publicação confiável associada a transação local; Saga somente se compensações e consistência distribuída justificarem.
3. Identificar custo de abstração, extensibilidade necessária, impacto no debugging e ownership.
4. Comparar padrão com solução simples; evitar singleton mutável, service locator e generalização prematura.
5. Exigir exemplo de antes/depois, teste e justificativa da redução de acoplamento.

## Entrega obrigatória
- Contexto, hipóteses e evidências existentes.
- Recomendação com justificativa e alternativas rejeitadas.
- Impacto em compatibilidade, carga, segurança e operação.
- Plano de teste, critérios de aceitação e reversão.

## Fontes e cautelas
Fonte: DHA design-patterns e architecture.

Não copiar código ou regras de fonte externa sem revisar versão, licença e aderência ao projeto. Para conflitos, registrar na matriz de divergências antes de alterar normas.

## Exemplo e critério de decisão
Antes de orientar implementação, ler [EXEMPLOS-E-DECISOES.md](references/EXEMPLOS-E-DECISOES.md). O exemplo é ilustrativo, **não** foi compilado; produzir código completo e testes específicos ao projeto quando solicitado. Verificar documentação oficial na versão real. Não declarar execução, performance ou compatibilidade sem evidência.

## Contrato operacional e exemplos
Antes de recomendar ou implementar, aplicar o [contrato comum dos agentes](../CONTRATO-EXECUCAO-AGENTES.md) e consultar [exemplos e contraindicações](references/EXEMPLOS-E-DECISOES.md). Os exemplos são didáticos, não foram compilados no stack-alvo. Confirmar documentação oficial e versões reais; executar testes, registrar evidências e nunca alegar eficácia sem medições.
