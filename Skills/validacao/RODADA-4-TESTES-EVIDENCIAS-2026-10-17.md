# Rodada 4 — evidências executáveis e gates

Data: 2026-10-17.

## Último verde confirmado antes desta rodada
GitHub Actions run 39069621873, commit 942da4c3bc6e17b0eb833cb27658836f07e83472, conclusion success.

## Novos checks (ainda requerem CI)
- `Skills/laboratorio-java/src/VirtualThreadCancellationTests.java`: virtual thread mantém uma permissão; segunda virtual thread aguarda, recebe interrupção, não executa operação, primeira libera e uma chamada subsequente obtém a permissão. Usa latches, joins com timeout e verificação de falhas.
- `Skills/laboratorio-java/src/SmokeTests.java`: chama o novo teste em `java25-smoke`.
- `Skills/validacao/audit_skills.py`: além de frontmatter/links/arquivos, exige contraindicação, verificação, referência e ressalva didática em cada um dos 17 exemplos.

## Limites explícitos
- Este teste não mede throughput ou p99 de virtual threads e não substitui teste de deadline de I/O real.
- O teste não valida automaticamente efeitos de cancelamento de cliente HTTP, JDBC ou lock distribuído.
- O auditor verifica **presença** de seções, não veracidade de fontes nem qualidade semântica.
- A/B Codex continua sem sessões independentes executadas.

## Próximo gate
Confirmar quatro jobs verdes no commit mais recente. Depois, executar testes de autorização HTTP BOLA/IDOR e de falhas externas/ACK em laboratório isolado, com documentação de limites. Não promover nem mesclar sem autorização.
