# Fase 3.3 — execução, evidências e gates

Data: 2026-10-17. Branch: `docs/golden-engineering-skills`. **Não alterar repositórios Golden.**

## Etapa 1 — exemplos
**Executado neste ambiente isolado:** reproduzidos os três arquivos de `Skills/laboratorio-java/src/`, compilados com `javac -d out src/*.java` e executados com `java -cp out SmokeTests`.

- Runtime: `openjdk version "21.0.12.1" 2026-08-18`.
- Compiler: `javac 21.0.12.1`.
- Saída observada: `PASS: key validation, bounded concurrency, release on exception`.
- Cobertura executada: validação de chaves válidas/inválidas, construtor de limite inválido, 20 tarefas, limite 3, liberação após exceção.
- **Limites:** não é JDK 25; teste de concorrência verifica limite sob executor de três workers e não testa saturação real, timeout, interrupção ou virtual threads. Nenhuma cobertura de banco, Spring, Redis ou segurança.

## Etapa 2 — integração isolada
**BLOQUEADA neste ambiente:** `docker --version` retorna `docker: command not found`. Não há evidência de execução de Testcontainers, MySQL 8, Redis ou Spring Boot 4. Não usar bancos/serviços Golden como substitutos.

Protocolos reproduzíveis: `INTEGRACAO-CHECKLIST.md`. Executar somente em runner com JDK 25 e Docker/Testcontainers, após resolver versões exatas e dependências.

## Etapa 3 — comparação com e sem Skills
**PREPARADA, NÃO EXECUTADA COMO EXPERIMENTO INDEPENDENTE.** Esta conversa não fornece duas sessões Codex independentes com controle de contexto. Artefatos de protocolo em `AGENTE-A-B-PROTOCOLO.md`. Não atribuir notas ao Codex nem alegar ganho.

## Gates
| Gate | Estado |
|---|---|
| Compilação Java 21 dos três fontes do laboratório | PASSOU |
| Smoke test Java 21 | PASSOU |
| Compilação Java 25 | NÃO EXECUTADO |
| Testes de integração Boot 4/Hibernate/MySQL | NÃO EXECUTADO |
| Testes Redis/concorrência distribuída | NÃO EXECUTADO |
| Teste A/B Codex independente | NÃO EXECUTADO |
| Segurança multitenant e autorização | NÃO EXECUTADO |
| Benchmark performance e capacidade | NÃO EXECUTADO |

## Resultado
Fase 3.3 **iniciada**, não concluída. É proibido promover as Skills como base normativa das APIs até que os gates críticos estejam verdes com logs, versões e execução reproduzível.
