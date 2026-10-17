---
name: jvm-performance
description: Guia de performance jvm para implementação e revisão de APIs Java de alta escala com decisões verificáveis.
---

# Performance JVM

Status: DRAFT v0.2; engenharia independente, sem substituir políticas Golden.

## Quando ativar
Tarefas de implementação, diagnóstico, revisão ou refatoração relacionadas a performance jvm.

## Procedimento
1. Ler contratos, código, configuração, versões e testes relevantes; separar fatos de suposições.
2. Definir comportamento esperado, requisitos não funcionais e possíveis regressões.
3. Aplicar os critérios técnicos abaixo e comparar alternativas, inclusive não modificar.
4. Planejar mudança mínima, validação, observabilidade e rollback.
5. Produzir relatório de evidências, riscos e limitações.

## Critérios técnicos
1. Definir carga e SLO; medir goodput, latência p95/p99, erros e saturação.
2. Triar CPU, alocação, GC, JIT, locks, filas, conexões e downstream; distinguir correlação de causa.
3. Usar JFR/perfis com orçamento de overhead e proteção de dados; comparar versão afetada e controle.
4. Revisar heap/RSS/cgroup, CPU throttling e memória nativa em containers.
5. Validar uma hipótese por experimento; comparar custo por requisição e regressões sob mesma carga.

## Entrega obrigatória
- Contexto, hipóteses e evidências existentes.
- Recomendação com justificativa e alternativas rejeitadas.
- Impacto em compatibilidade, carga, segurança e operação.
- Plano de teste, critérios de aceitação e reversão.

## Fontes e cautelas
Fonte: JVM Expert java-performance; DHA performance-testing; references/PERFORMANCE-ENGINEERING.md.

Não copiar código ou regras de fonte externa sem revisar versão, licença e aderência ao projeto. Para conflitos, registrar na matriz de divergências antes de alterar normas.

## Contrato operacional e exemplos
Aplicar [contrato dos agentes](../CONTRATO-EXECUCAO-AGENTES.md) e [exemplos e contraindicações](references/EXEMPLOS-E-DECISOES.md). Exemplos didáticos: validar versão, imports, testes, segurança, rollback e evidências antes de recomendar adoção.
