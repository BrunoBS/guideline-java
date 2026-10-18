# Fase 3.3 — gates finais e evidências

Data de atualização: 2026-10-17.

## Evidência verificada antes dos novos commits
- GitHub Actions run 39067364367: success (Java 25, MySQL/Redis, Spring/Hibernate), commit f2f4f76107ddfc063f4f4c5871b6f4b3f09623b9.
- Teste de paginação com coleção e bloqueio de paginação em memória passou nesse commit.

## Implementado depois desse verde — requer nova execução
- `ConcurrentIdempotencyTest`: dois consumidores JDBC iniciados por barreira; a chave única do MySQL deve permitir exatamente um commit de efeito de negócio e rejeitar o segundo insert. O teste exige código de erro MySQL 1062; outros SQL errors reprovam.
- `audit_skills.py`: checagem estrutural das 17 Skills e do contrato comum. Não valida semântica, correção de snippets, fontes, segurança ou qualidade de decisões.
- Pipeline executa `skills-structure-audit` em paralelo aos laboratórios Java 25, MySQL/Redis e Spring/Hibernate.

## Gate A/B com Codex — BLOQUEADO por ausência de sessões independentes executáveis
O protocolo está em `AGENTE-A-B-PROTOCOLO.md` e os oito casos/gabaritos em `CASOS-E-GABARITO.md`.
Não atribuir notas, inventar respostas nem usar o mesmo contexto de conversa como se fossem duas sessões isoladas.
Para liberar: prover duas execuções Codex isoladas com mesma versão/configuração, uma sem Skills e outra com Skills, com logs integrais, artefatos, testes e avaliação cega.

## Gate de aprovação das 17 Skills — NÃO CONCLUÍDO
A aprovação requer, além de CI verde:
1. Revisão técnica individual das 17 Skills contra documentação oficial versionada.
2. Exemplos executáveis ou claramente rotulados como ilustrativos, sem alegações de teste não demonstradas.
3. Resultados A/B reproduzíveis com logs, rubrica, incidentes críticos e limites.
4. Aprovação explícita antes de promover para Golden ou realizar merge.

## Restrições
Não modificar repositórios Golden. Não realizar merge do PR #4 sem autorização explícita.
