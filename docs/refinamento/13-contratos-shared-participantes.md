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

## 5.1 Mapeamento de ambientes no vínculo de participação

A solicitação é feita no nível da aplicação participante/publicadora e não informa nem escolhe ambientes. Durante a análise da solicitação, o responsável autorizado pela aplicação receptora consulta os ambientes da aplicação de origem e define os vínculos de destino antes de aprovar a participação.

- A tela de aprovação apresenta os ambientes da aplicação de origem. O responsável da aplicação receptora escolhe, para cada ambiente de origem, zero, um ou mais ambientes de destino existentes.
- A aprovação pode deixar ambientes de origem sem mapeamento. Um ambiente sem vínculo explícito não é elegível para publicação; isso não impede a aprovação nem invalida os demais mapeamentos.
- Um ambiente de origem pode ser associado a vários ambientes de destino. Não há distribuição automática para todos os destinos compatíveis: cada associação precisa ser escolhida explicitamente.
- Cada associação deve respeitar a base do ambiente: ambiente padrão usa sua própria base; ambiente customizado usa a referência de base configurada. Só se permite associar ambientes cuja base seja igual.
- A compatibilidade é validada por identificadores e pela base, nunca apenas por nomes ou aliases. Os ambientes de destino devem existir e estar ativos conforme as regras de ambiente.
- Não criar ambientes automaticamente e não usar `DEFAULT` como fallback. Qualquer vínculo com base `DEFAULT` também deve ser explícito e respeitar a igualdade de base.
- O responsável autorizado da aplicação receptora pode ajustar os mapeamentos depois da aprovação sem nova aprovação. Cada inclusão, alteração ou remoção deve ser registrada na auditoria. Um ambiente sem mapeamento continua inelegível até que um vínculo explícito seja criado.
- A regra sobre permitir que ambientes de origem diferentes apontem para o mesmo ambiente de destino ainda precisa ser definida; não impor exclusividade do destino até essa decisão.

## 6. Autorização e consistência

- Somente o proprietário autorizado pode aprovar, rejeitar ou revogar.
- Somente o solicitante autorizado pode reencaminhar ou excluir sua própria participação.
- O reenvio de `REJECTED` ou `REVOKED` não deve criar vínculo duplicado.
- Transições inválidas e decisões concorrentes devem ser recusadas de modo determinístico.
- Toda transição relevante e exclusão física deve ser auditada. O evento registra o status anterior e o novo, autor e data/hora; o motivo informado fica na tabela de auditoria, disponível na consulta do histórico conforme as permissões de auditoria.
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
10. A solicitação de participação não informa ambientes; na aprovação, o responsável autorizado da aplicação receptora consulta os ambientes da origem e define explicitamente os destinos.
11. Um ambiente de origem pode ser associado a zero, um ou vários ambientes de destino, desde que cada associação respeite igualdade de base; ambientes sem mapeamento podem permanecer assim sem impedir a aprovação e não são elegíveis para publicação.
12. Ajustes de mapeamento após a aprovação podem ser feitos pelo responsável autorizado da aplicação receptora sem nova aprovação, e cada alteração é auditada.
13. Não há fallback para `DEFAULT` nem criação automática de ambientes; exclusividade de um destino entre origens distintas permanece pendente de decisão.

---
**Origem:** consolidação da discussão funcional de 10/10/2026. Este documento registra decisões e separa explicitamente os assuntos ainda pendentes.
