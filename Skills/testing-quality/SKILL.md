---
name: testing-quality
description: Guia de qualidade e testes para implementação e revisão de APIs Java de alta escala com decisões verificáveis.
---

# Qualidade e testes

Status: DRAFT v0.2; engenharia independente, sem substituir políticas Golden.

## Quando ativar
Tarefas de implementação, diagnóstico, revisão ou refatoração relacionadas a qualidade e testes.

## Procedimento
1. Ler contratos, código, configuração, versões e testes relevantes; separar fatos de suposições.
2. Definir comportamento esperado, requisitos não funcionais e possíveis regressões.
3. Aplicar os critérios técnicos abaixo e comparar alternativas, inclusive não modificar.
4. Planejar mudança mínima, validação, observabilidade e rollback.
5. Produzir relatório de evidências, riscos e limitações.

## Critérios técnicos
1. Selecionar testes unitários para regras puras, slice para wiring, integração para banco/mensageria e contratos para interfaces públicas.
2. Usar banco real via Testcontainers quando dialeto, constraints, isolamento ou migrations importam.
3. Cobrir falhas: timeout, concorrência, autorização negada, rollback, duplicidade, ordering e reprocessamento.
4. Evitar mocks excessivos, testes frágeis e percentuais arbitrários de cobertura como substituto de qualidade.
5. Exigir fixtures determinísticas, evidência de execução e testes de regressão do bug.

## Entrega obrigatória
- Contexto, hipóteses e evidências existentes.
- Recomendação com justificativa e alternativas rejeitadas.
- Impacto em compatibilidade, carga, segurança e operação.
- Plano de teste, critérios de aceitação e reversão.

## Fontes e cautelas
Fonte: DHA testing; Awesome Java junit5-mockito-testcontainers; módulos platform-testing apenas na fase Golden.

Não copiar código ou regras de fonte externa sem revisar versão, licença e aderência ao projeto. Para conflitos, registrar na matriz de divergências antes de alterar normas.

## Contrato operacional e exemplos
Aplicar [contrato dos agentes](../CONTRATO-EXECUCAO-AGENTES.md) e [exemplos e contraindicações](references/EXEMPLOS-E-DECISOES.md). Exemplos didáticos: validar versão, imports, testes, segurança, rollback e evidências antes de recomendar adoção.

## Gate de validade dos testes
- Job verde comprova apenas cenários executados, não correção geral nem ganho de agentes.
- Cobrir concorrência, rollback pós-flush, autorização cruzada e falha de dependência.
- Teste que verifica apenas bean existente não comprova transação nem segurança.

## Gate de testes por tipo de alteração
- `feature`: happy path, contrato HTTP, validação, falha de dependência, segurança e regressão de comportamento.
- `bugfix`: reproduzir falha antes da correção e comprovar que o mesmo cenário passa depois; registrar evidência do teste vermelho quando possível.
- `refactor`: preservar entradas, saídas, erros, transações, autorização e eventos; executar suíte de caracterização.
- `migration`: validar Flyway em banco limpo e evolução de banco existente, constraints, rollback operacional e compatibilidade com versões de aplicação.
- `library`: compilar consumidor sintético, testar auto-configuração e contratos públicos; verificar dependências transitivas e comportamento sem configuração opcional.
- `security`: matriz de permissão e testes negativos de tenant cruzado, ausência de contexto e token inválido.
- `performance`: workload reproduzível, baseline e comparação sob condições equivalentes; nunca aprovar por microbenchmark isolado.
- Registrar comandos, versões, logs de falha e sucesso, infraestrutura utilizada, flakiness e cenários não executados; não usar cobertura percentual como único gate.
