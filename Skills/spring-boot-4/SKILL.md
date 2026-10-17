---
name: spring-boot-4
description: Guia de spring boot 4 para implementação e revisão de APIs Java de alta escala com decisões verificáveis.
---

# Spring Boot 4

Status: DRAFT v0.2; engenharia independente, sem substituir políticas Golden.

## Quando ativar
Tarefas de implementação, diagnóstico, revisão ou refatoração relacionadas a spring boot 4.

## Procedimento
1. Ler contratos, código, configuração, versões e testes relevantes; separar fatos de suposições.
2. Definir comportamento esperado, requisitos não funcionais e possíveis regressões.
3. Aplicar os critérios técnicos abaixo e comparar alternativas, inclusive não modificar.
4. Planejar mudança mínima, validação, observabilidade e rollback.
5. Produzir relatório de evidências, riscos e limitações.

## Critérios técnicos
1. Ler parent/BOM e dependências efetivas; confirmar módulos e starters na documentação da versão alvo.
2. Definir DTOs e validação nas fronteiras, separar contratos HTTP de domínio e persistência.
3. Usar injeção por construtor; configuração tipada; evitar lógica de negócio em @Configuration e controllers.
4. Revisar transações, proxies/AOP, propagação de contexto e efeitos de @Async.
5. Garantir Actuator, readiness/liveness, métricas e tracing sem expor endpoints administrativos.

## Entrega obrigatória
- Contexto, hipóteses e evidências existentes.
- Recomendação com justificativa e alternativas rejeitadas.
- Impacto em compatibilidade, carga, segurança e operação.
- Plano de teste, critérios de aceitação e reversão.

## Fontes e cautelas
Fonte: DHA spring-boot e openapi-contract; Spring Boot 4 reference.

Não copiar código ou regras de fonte externa sem revisar versão, licença e aderência ao projeto. Para conflitos, registrar na matriz de divergências antes de alterar normas.

## Contrato operacional e exemplos
Aplicar [contrato dos agentes](../CONTRATO-EXECUCAO-AGENTES.md) e [exemplos e contraindicações](references/EXEMPLOS-E-DECISOES.md). Exemplos didáticos: validar versão, imports, testes, segurança, rollback e evidências antes de recomendar adoção.
