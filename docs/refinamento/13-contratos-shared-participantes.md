# Refinamento funcional — Contratos SHARED e participantes

**Data:** 2026-10-10  
**Estado:** Regras funcionais acordadas; pontos pendentes explicitados  
**Escopo:** Solicitação, aprovação, rejeição, revogação, reenvio e encerramento de participação em contratos de compartilhamento.

## 1. Contexto e atores

- **Proprietário do contrato (SHARED):** administra o contrato e decide sobre solicitações de participação.
- **Aplicação publicadora (origem):** aplicação que fornece os dados ou configurações cobertos pelo compartilhamento.
- **Aplicação participante (destino/consumidora):** aplicação que solicita acesso e controla o próprio vínculo de participação.
- A identidade do proprietário do contrato (workspace ou aplicação) continua pendente de decisão técnica; os termos origem/destino descrevem o fluxo dos dados, não essa decisão.
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

A participação é aprovada no nível da aplicação. Como as aplicações podem ter ambientes diferentes, o vínculo aprovado também mantém mapeamentos explícitos entre ambientes da aplicação publicadora e ambientes da aplicação participante.

- Cada mapeamento associa um ambiente de origem a um ambiente de destino existente.
- A associação usa os identificadores dos ambientes, nunca apenas nomes ou aliases.
- Os ambientes devem estar ativos e pertencer aos workspaces das aplicações correspondentes.
- Se não houver mapeamento para um ambiente de origem, aquele ambiente não é elegível para futura publicação para o participante. A reação operacional da API de publicação será definida em refinamento posterior; os outros mapeamentos não são invalidados.
- Não criar ambiente automaticamente e não redirecionar conteúdo sem mapeamento para `DEFAULT`.
- Um ambiente de origem pode apontar para no máximo um ambiente de destino por participante, e um destino não pode receber vários ambientes de origem. Essa regra evita mistura de configurações.
- O ambiente global `DEFAULT` pode ser associado ao `DEFAULT` do destino quando ambos forem confirmados como a mesma capacidade global da plataforma; `DEFAULT` não é fallback para ambientes customizados.
- Novos ambientes de origem criados depois da aprovação também exigem mapeamento antes de publicar dados.

## 6. Autorização e consistência

- Somente o proprietário autorizado pode aprovar, rejeitar ou revogar.
- Somente o solicitante autorizado pode reencaminhar ou excluir sua própria participação.
- O reenvio de `REJECTED` ou `REVOKED` não deve criar vínculo duplicado.
- Transições inválidas e decisões concorrentes devem ser recusadas de modo determinístico.
- Toda transição relevante e exclusão física deve ser auditada.
- A relação do Shared deve permitir que uma futura API consulte a elegibilidade para publicação: participação `APPROVED`, contrato habilitado e mapeamento válido do ambiente. Rejeição, revogação, encerramento ou inativação tornam a relação inelegível. A transmissão dos dados e a ação da API diante de uma relação inelegível ficam fora desta etapa.

## 7. Fluxos de exemplo

**Rejeição:** BACKEND solicita → PENDING → proprietário rejeita → REJECTED. O vínculo desaparece da lista operacional do proprietário, mas continua visível à BACKEND, que pode excluir ou reencaminhar → PENDING.

**Revogação:** BACKEND está APPROVED → proprietário revoga → REVOKED. BACKEND visualiza o status e pode excluir ou reencaminhar → PENDING. O vínculo deixa de ser elegível para futuras publicações; a aplicação dessa regra no envio será tratada em etapa posterior.

**Desistência:** BACKEND está APPROVED → BACKEND encerra voluntariamente → vínculo removido fisicamente, com auditoria. Uma futura participação requer nova solicitação.

**Exclusão do contrato:** proprietário exclui contrato elegível → vínculos associados removidos em cascata e eventos auditados.

## 8. Pendências deliberadas

**Política de dados já publicados e cache:** ainda não foi decidido se, ao revogar participação, encerrar vínculo ou excluir contrato, os dados previamente publicados devem permanecer, ser invalidados automaticamente ou exigir remoção pelo responsável. Essa decisão fica para refinamento específico de ciclo de vida, publicação e cache. **Não presumir limpeza automática nem retenção indefinida.**

Outros detalhes técnicos a especificar antes da implementação: permissões exatas, motivo de rejeição/revogação e sua apresentação, contrato de endpoints, idempotência, controle de concorrência, integridade da cascata e comportamento diante de falhas de propagação.

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
10. A aplicação participante pode mapear explicitamente os ambientes de origem para ambientes ativos já existentes no seu workspace.
11. Ambientes sem mapeamento não são elegíveis para publicação e não recebem associação implícita com `DEFAULT`; a reação da API de publicação será definida em refinamento posterior. A elegibilidade de outros mapeamentos não é afetada.

---
**Origem:** consolidação da discussão funcional de 10/10/2026. Este documento registra decisões e separa explicitamente os assuntos ainda pendentes.
