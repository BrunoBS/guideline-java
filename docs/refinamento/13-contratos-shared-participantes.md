# Refinamento funcional — Contratos SHARED e participantes

**Data:** 2026-10-10  
**Estado:** Regras funcionais acordadas; pontos pendentes explicitados  
**Escopo:** Solicitação, aprovação, rejeição, revogação, reenvio e encerramento de participação em contratos de compartilhamento.

## 1. Contexto e atores

- **Proprietário do contrato (SHARED):** a conta e a aplicação receptora, que administra o contrato e decide sobre solicitações de participação.
- **Aplicação receptora (destino):** aplicação vinculada ao contrato, na conta que receberá os dados.
- **Aplicação participante/publicadora (origem):** aplicação que envia os dados ou configurações e solicita participação no contrato.
- O fluxo é da aplicação participante/publicadora para a aplicação receptora; a participação é aprovada por aplicação.
- **Contrato:** recurso de compartilhamento, com ciclo de vida próprio, independente do status dos participantes.
- **Vínculo de participação:** associação entre uma aplicação solicitante e um contrato.

## 2. Estados da participação

| Estado | Significado |
| --- | --- |
| `PENDING` | Solicitação aguardando decisão do proprietário. |
| `APPROVED` | Participação autorizada; compartilhamento permitido enquanto o contrato estiver apto. |
| `REJECTED` | Solicitação negada antes da aprovação. |
| `REVOKED` | Participação anteriormente aprovada cancelada pelo proprietário. |

`INACTIVE` pertence ao ciclo de vida do **contrato**, não substitui `REJECTED` ou `REVOKED` do participante.

Os estados acima são o contrato funcional novo. Os códigos do enum de compartilhamento anterior não limitam esta máquina de estados e devem ser ajustados para refletir este fluxo.

## 3. Transições e ações

| Origem | Ação | Destino | Responsável |
| --- | --- | --- | --- |
| Sem vínculo | Solicitar participação | PENDING | Solicitante |
| PENDING | Aprovar | APPROVED | Proprietário |
| PENDING | Rejeitar | REJECTED | Proprietário |
| APPROVED | Revogar | REVOKED | Proprietário |
| REJECTED | Reencaminhar | PENDING | Solicitante |
| REVOKED | Reencaminhar | PENDING | Solicitante |
| REJECTED ou REVOKED | Excluir participação | Vínculo removido | Solicitante |
| APPROVED | Desistir / encerrar participação | Vínculo removido | Solicitante |

O reencaminhamento **reutiliza o mesmo vínculo**, reinicia a análise e exige nova aprovação; não restabelece autorização automaticamente. A remoção voluntária é física no armazenamento operacional, com registro de auditoria. Se o solicitante desejar voltar depois da exclusão, inicia nova solicitação.

## 4. Visibilidade nas telas

### 4.1 Proprietário — participantes do contrato

Exibir vínculos operacionais `PENDING` e `APPROVED`. Solicitações `REJECTED` e participações `REVOKED` deixam a lista operacional do proprietário, **sem exclusão física automática**: precisam continuar disponíveis para o solicitante. Quando reencaminhadas, reaparecem na fila de aprovação como `PENDING`.

Filtros definidos: **nome**, **aplicação** e **status**. A lista deve indicar, no mínimo, participante, aplicação e status.

### 4.2 Solicitante — Meus compartilhamentos / Meus contratos

Exibir todos os vínculos existentes, inclusive `PENDING`, `APPROVED`, `REJECTED` e `REVOKED`. Para `REJECTED` e `REVOKED`, oferecer **Excluir** ou **Reencaminhar**. Para `APPROVED`, permitir encerramento voluntário com exclusão do vínculo. Após exclusão física, o vínculo deixa a listagem operacional; o evento permanece na auditoria.

## 5. Contrato e exclusão em cascata

- Contrato inativo não deve autorizar novos compartilhamentos, novas solicitações ou aprovações enquanto estiver inativo.
- Na exclusão do contrato, remover em cascata os vínculos de participantes associados, com auditoria e consistência transacional.
- A conversa considerou exclusão do contrato **inativo**. Regras para tornar o contrato inativo e outras pré-condições de exclusão devem ser confirmadas na especificação técnica.
- A cascata se refere aos **vínculos operacionais**; não implica decisão sobre remoção de dados já publicados em destinos externos ou caches.

## 5.1 Mapeamento de ambientes por participante

A solicitação da aplicação publicadora é criada no nível da aplicação e já inclui os mapeamentos de ambiente propostos. O proprietário da aplicação receptora analisa esses mapeamentos junto com o pedido e aprova ou rejeita o vínculo com essa configuração. Enquanto o pedido estiver `PENDING`, não há publicação.

- Cada mapeamento associa explicitamente um ambiente de origem da aplicação participante/publicadora a um ambiente de destino existente da aplicação receptora. O pedido pode trazer vários mapeamentos, mas cada origem pode apontar para no máximo um destino e cada destino pode receber no máximo uma origem dentro da mesma participação.
- A associação usa os identificadores dos ambientes, nunca apenas nomes ou aliases.
- Os ambientes devem estar ativos e pertencer às aplicações correspondentes: origem na aplicação participante/publicadora e destino na aplicação receptora.
- A base do ambiente de origem deve ser igual à base do destino. Para ambiente padrão, considera-se o próprio tipo como base; para ambiente customizado, considera-se a referência de base configurada. Assim, `HOMOLOG` pode mapear para ambiente customizado baseado em `HOMOLOG`, mas não para `PROD`.
- A origem `DEFAULT` pode ser associada explicitamente a um destino literal `DEFAULT` ou a um ambiente customizado baseado em `DEFAULT`. Isso não cria fallback nem associação automática.
- Se não houver mapeamento para um ambiente de origem da aplicação participante/publicadora, esse ambiente não é elegível para publicação no contrato. A reação operacional da API de publicação será definida em refinamento posterior; os outros mapeamentos não são invalidados.
- Não criar ambiente automaticamente e não redirecionar conteúdo sem mapeamento para `DEFAULT`.
- A cardinalidade é um-para-um dentro de cada participação; ela evita tanto fan-out de uma origem para vários destinos quanto mistura de várias origens no mesmo destino.
- A mesma origem pode ter outro mapeamento em outra participação; as unicidades são sempre limitadas ao vínculo de participação.
- Novos ambientes de origem criados depois da aprovação exigem mapeamento compatível e aprovação do proprietário receptor antes de publicar. Alterações propostas não substituem o mapeamento aprovado até serem aprovadas.

## 6. Autorização e consistência

- Somente o proprietário autorizado pode aprovar, rejeitar ou revogar.
- Somente o solicitante autorizado pode reencaminhar ou excluir sua própria participação.
- O reenvio de `REJECTED` ou `REVOKED` não deve criar vínculo duplicado.
- Transições inválidas e decisões concorrentes devem ser recusadas de modo determinístico.
- Toda transição relevante e exclusão física deve ser auditada. O evento registra o status anterior e o novo, autor e data/hora; o motivo informado fica na tabela de auditoria, disponível na consulta do histórico conforme as permissões de auditoria. Aprovação considera os mapeamentos incluídos no pedido; alterações posteriores exigem nova aprovação, mantendo o mapeamento vigente até a aprovação da alteração.
- A relação do Shared deve permitir que uma futura API consulte a elegibilidade para publicação: participação `APPROVED`, contrato habilitado e mapeamento válido do ambiente. Rejeição, revogação, encerramento ou inativação tornam a relação inelegível. A transmissão dos dados e a ação da API diante de uma relação inelegível ficam fora desta etapa.

## 7. Fluxos de exemplo

**Rejeição:** BACKEND solicita → PENDING → proprietário rejeita → REJECTED. O vínculo desaparece da lista operacional do proprietário, mas continua visível à BACKEND, que pode excluir ou reencaminhar → PENDING.

**Revogação:** BACKEND está APPROVED → proprietário revoga → REVOKED. BACKEND visualiza o status e pode excluir ou reencaminhar → PENDING. O vínculo deixa de ser elegível para futuras publicações; a aplicação dessa regra no envio será tratada em etapa posterior.

**Desistência:** BACKEND está APPROVED → BACKEND encerra voluntariamente → vínculo removido fisicamente, com auditoria. Uma futura participação requer nova solicitação.

**Exclusão do contrato:** proprietário exclui contrato elegível → vínculos associados removidos em cascata e eventos auditados.

## 8. Pendências deliberadas

**Política de dados já publicados e cache:** ainda não foi decidido se, ao revogar participação, encerrar vínculo ou excluir contrato, os dados previamente publicados devem permanecer, ser invalidados automaticamente ou exigir remoção pelo responsável. Essa decisão fica para refinamento específico de ciclo de vida, publicação e cache. **Não presumir limpeza automática nem retenção indefinida.**

Outros detalhes técnicos a especificar antes da implementação: permissões exatas, obrigatoriedade do preenchimento do motivo de rejeição/revogação, contrato de endpoints, idempotência, controle de concorrência, integridade da cascata e comportamento diante de falhas de propagação.

## 9. Critérios de aceite funcionais

1. Nova solicitação cria vínculo `PENDING` e aparece para análise do proprietário.
2. Aprovação altera para `APPROVED` e habilita novos envios somente se o contrato estiver apto.
3. Rejeição altera para `REJECTED`, oculta da lista operacional do proprietário e preserva visibilidade para o solicitante.
4. Revogação de vínculo aprovado altera para `REVOKED`, impede novos envios e preserva visibilidade para o solicitante.
5. Reencaminhar vínculo rejeitado/revogado retorna **o mesmo vínculo** a `PENDING`, sem reativação automática.
6. Solicitante pode excluir vínculo rejeitado/revogado ou encerrar vínculo aprovado; remoção física auditada.
7. Proprietário pode filtrar participantes por nome, aplicação e status.
8. Exclusão de contrato elegível remove os vínculos associados em cascata e registra auditoria.
9. A implementação não define nem executa política de limpeza dos dados históricos/cache sem refinamento posterior.
10. A solicitação de participação inclui os mapeamentos explícitos de ambientes ativos da aplicação participante/publicadora para ambientes ativos da aplicação receptora, respeitando compatibilidade de base e cardinalidade um-para-um.
11. Ambientes de origem da aplicação participante/publicadora sem mapeamento não são elegíveis para publicação no contrato e não recebem associação implícita com `DEFAULT`; a reação da API de publicação será definida em refinamento posterior. A elegibilidade de outros mapeamentos não é afetada.

---
**Origem:** consolidação da discussão funcional de 10/10/2026. Este documento registra decisões e separa explicitamente os assuntos ainda pendentes.
