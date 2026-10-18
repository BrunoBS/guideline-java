# Evolução v0.3 — Skills orientadas a desenvolvimento

## Objetivo
Reduzir a distância entre aconselhamento técnico e implementação verificável, sem confundir documentação com validação empírica do Codex.

## Mudanças realizadas
- `CONTRATO-EXECUCAO-AGENTES.md`: gate por tipo de tarefa, contrato funcional, matriz requisito→alteração→teste→resultado, e gate para bibliotecas compartilhadas.
- `spring-boot-4/SKILL.md`: implementação HTTP, validação, segurança, transação, proxy, auto-configuração e consumidor.
- `api-security/SKILL.md`: matriz principal/workspace/application/environment/resource/action, headers não confiáveis, revogação, cache e BOLA.
- `testing-quality/SKILL.md`: testes mínimos por tipo de alteração, migration e compatibilidade de bibliotecas.
- `architecture-review/SKILL.md`: fluxo completo, ADR, contratos e compatibilidade.

## Critérios de aceitação desta evolução
1. Auditoria estrutural das 17 Skills continua verde.
2. Todos os quatro jobs de CI continuam verdes após os commits.
3. Não há alegação de execução A/B sem sessões independentes.
4. Não houve alteração em serviços Golden ou merge de PR.

## Riscos e backlog priorizado
- **P0**: executar casos A/B Codex independentes, avaliação cega e evidências integrais.
- **P1**: acrescentar exemplos executáveis completos por Skill, com falhas e casos negativos; exemplos atuais são majoritariamente didáticos.
- **P1**: criar consumidor sintético para testar API/ABI e auto-configuração de bibliotecas compartilhadas.
- **P1**: revisar as 17 Skills individualmente contra fontes oficiais versionadas; registrar decisões e conflitos.
- **P2**: aprofundar playbooks de observabilidade, capacidade e recuperação operacional.
- **P2**: criar perfis de projeto que combinem Skills genéricas e regras locais sem acoplar a curadoria genérica à Golden.

## Veredito
A evolução torna as orientações mais operacionais, mas não constitui homologação de autonomia de desenvolvimento. Requer CI do novo HEAD e experimento A/B.
