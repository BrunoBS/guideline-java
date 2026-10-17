---
name: java-concurrency
description: Skill de concorrência java 25 para investigar, implementar e revisar sistemas Java de alta escala com decisões baseadas em evidências.
---

# Concorrência Java 25

Status: pesquisa/curadoria v0.2. Independente de convenções Golden; não é norma aprovada.

## Gatilhos
Avaliar paralelismo, virtual threads, sincronização, cancelamento, timeouts, propagação de contexto, race conditions e limites.

## Protocolo
1. Ler código, contratos, configuração, métricas e testes disponíveis; separar fatos de hipóteses.
2. Distinguir tarefas CPU-bound de I/O-bound. Identificar recursos compartilhados, thread safety, pool JDBC e limites externos.
3. Usar virtual threads para I/O bloqueante quando adequado, com limitação de concorrência no recurso escasso. Preservar interrupção e cancelamento.
4. Identificar impacto em segurança, consistência, observabilidade e custo operacional.
5. Propor mudança mínima, critérios de aceitação, experimento controlado e reversão.

## Antipadrões
Não criar pool de virtual threads; não supor que virtual threads elevam capacidade do banco; não compartilhar objetos mutáveis sem proteção.

## Entregáveis
Teste determinístico de concorrência, teste de saturação e medição de filas/locks/pinning conforme runtime.

## Critérios de revisão
- [ ] Evidências e premissas explicitadas.
- [ ] Alternativas consideradas, inclusive não alterar.
- [ ] Comportamento em falha e sob carga descrito.
- [ ] Teste reproduzível e rollback definidos.
- [ ] Dependências entre Skills e conflitos registrados.

## Fontes para revisão aprofundada
JDK 25 docs, JVM Expert performance, Awesome Java clean code (revisar afirmações de Java 21).

> Texto original de curadoria, não transcrição de Skill de terceiros. Verificar APIs e versões na documentação oficial antes de gerar código.

## Aprofundamento obrigatório
Não aplicar conselho obsoleto sobre synchronized/pinning; limitar recursos escassos, não threads virtuais.

Ler [playbook especializado](references/VIRTUAL-THREADS-JAVA25.md) antes de emitir recomendação ou alterar código. Exigir evidência e critérios de aceitação específicos do playbook.

## Contrato operacional e exemplos
Aplicar [contrato dos agentes](../CONTRATO-EXECUCAO-AGENTES.md) e [exemplos e contraindicações](references/EXEMPLOS-E-DECISOES.md). Exemplos didáticos: validar versão, imports, testes, segurança, rollback e evidências antes de recomendar adoção.
