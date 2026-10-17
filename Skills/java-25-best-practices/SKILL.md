---
name: java-25-best-practices
description: Guia de java 25 para implementação e revisão de APIs Java de alta escala com decisões verificáveis.
---

# Java 25

Status: DRAFT v0.2; engenharia independente, sem substituir políticas Golden.

## Quando ativar
Tarefas de implementação, diagnóstico, revisão ou refatoração relacionadas a java 25.

## Procedimento
1. Ler contratos, código, configuração, versões e testes relevantes; separar fatos de suposições.
2. Definir comportamento esperado, requisitos não funcionais e possíveis regressões.
3. Aplicar os critérios técnicos abaixo e comparar alternativas, inclusive não modificar.
4. Planejar mudança mínima, validação, observabilidade e rollback.
5. Produzir relatório de evidências, riscos e limitações.

## Critérios técnicos
1. Conferir runtime JDK vendor/build, toolchain Maven, bytecode e dependências antes de sugerir recursos novos.
2. Preferir records para carriers imutáveis, sealed types para hierarquias fechadas e pattern matching quando clareia regras; não transformar entidades JPA em records indiscriminadamente.
3. Virtual threads beneficiam espera bloqueante, não trabalho CPU-bound; impor limites de concorrência em recursos escassos.
4. Distinguir recursos finalizados, preview e incubator na versão real; não habilitar preview por suposição.
5. Medir alocação, latência e throughput antes de alterar estruturas, streams ou coleções.

## Entrega obrigatória
- Contexto, hipóteses e evidências existentes.
- Recomendação com justificativa e alternativas rejeitadas.
- Impacto em compatibilidade, carga, segurança e operação.
- Plano de teste, critérios de aceitação e reversão.

## Fontes e cautelas
Fonte: JDK 25 Oracle docs; Awesome Java Clean Code (Java 21, revisão crítica); JVM Expert java-performance.

Não copiar código ou regras de fonte externa sem revisar versão, licença e aderência ao projeto. Para conflitos, registrar na matriz de divergências antes de alterar normas.

## Exemplo e critério de decisão
Antes de orientar implementação, ler [EXEMPLOS-E-DECISOES.md](references/EXEMPLOS-E-DECISOES.md). O exemplo é ilustrativo, **não** foi compilado; produzir código completo e testes específicos ao projeto quando solicitado. Verificar documentação oficial na versão real. Não declarar execução, performance ou compatibilidade sem evidência.

## Contrato operacional e exemplos
Antes de recomendar ou implementar, aplicar o [contrato comum dos agentes](../CONTRATO-EXECUCAO-AGENTES.md) e consultar [exemplos e contraindicações](references/EXEMPLOS-E-DECISOES.md). Os exemplos são didáticos, não foram compilados no stack-alvo. Confirmar documentação oficial e versões reais; executar testes, registrar evidências e nunca alegar eficácia sem medições.
