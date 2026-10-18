# Rodada 5 — isolamento de recursos e replay após ACK perdido

## Baseline aprovado
Run 39071716671: os quatro jobs do workflow passaram no commit 99ab368a3dfee73a56698e1305c925b857c70865.

## Testes adicionados (CI dos novos commits pendente)
1. `WorkspaceAccessIsolationTest` (MySQL 8.4): dados de workspaces 10 e 20; a query usa **resourceId + workspaceId + grant por subject**. Exercita acesso autorizado, IDOR cross-workspace, tentativa de forjar workspace e usuário sem grant.
2. `LostAckReplayTest` (MySQL 8.4): inbox UNIQUE + efeito local na mesma transação; primeira entrega confirma; reentrega após ACK perdido simulado não reaplica efeito; outros erros SQL não são tratados como duplicidade.

## Limitações importantes
- O primeiro teste **não** é um teste HTTP/JWT/Spring Security. Demonstra o predicado SQL que um endpoint deve preservar, não a autenticação ou autorização real da Golden.
- O segundo teste **não** usa broker real e não provoca crash de processo. Simula redelivery chamando o consumidor duas vezes após commit; prova deduplicação local, não exactly-once end-to-end ou efeitos externos.
- Não foram modificados serviços Golden. Nenhum merge. A/B Codex independente segue pendente.

## Próximos gates
- Confirmar `mysql-redis-testcontainers` e os outros jobs verdes para o novo commit.
- Adicionar endpoint HTTP com autenticação e contexto verificável em laboratório isolado.
- Adicionar integração real com broker e injeção de falha entre commit e ACK, com logs.
