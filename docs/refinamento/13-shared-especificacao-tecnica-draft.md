# Especificação técnica preliminar — SHARED (complemento ao Refinamento 13)

**Data:** 2026-10-10  
**Status:** DRAFT — não autoriza implementação integral antes da verificação dos pontos abertos.  
**Referência funcional:** [13 — Contratos SHARED e participantes](13-contratos-shared-participantes.md).

## 1. Levantamento confirmado

O repositório `BrunoBS/account-service` declara no README que hospeda historicamente o serviço `workspace-service`, com pacote `br.com.portalmanager.platform.workspace`. O POM da branch padrão confirma `platform-parent:1.0.0`, BOM de libraries, Spring Data JPA, Flyway/MySQL, `platform-audit` e `platform-testing`. O README descreve macrozonas `foundation`, `core`, `feature` e `entrypoint/web`, com validação em `usecase/validation`, Requests/Responses na Web e Input/Output nos Use Cases.

**Verificação parcial na branch `main`:** a árvore e os domínios Application, Environment e Publisher, os controllers Web de Application e Publisher e o catálogo `ShareStatusType` foram inspecionados. `Publisher` é um domínio independente, configurado para publicar; a integração do fluxo de publicação com as regras do Shared fica para etapa posterior. Os controllers atuais chamam Use Cases diretamente e usam Request/Response. A implementação completa de autorização e as facades da branch-alvo ainda não foram auditadas. Também falta confirmar a branch de implementação; há branches de feature/refactor abertas. Shared ainda não tem domínio, tabelas ou endpoints na `main`. Não considerar nomes de classes, pacotes ou endpoints abaixo como existentes.

## 2. Fronteiras propostas, sujeitas à inspeção

- **Contrato SHARED:** domínio dono das regras de contrato, seu proprietário, ciclo de vida e exclusão.
- **Participação:** domínio dos vínculos entre contrato e aplicação participante, transições de status, mapeamentos de ambiente e consultas.
- **Publisher:** domínio separado que, em etapa posterior, consulta a elegibilidade definida pelo Shared no momento da publicação. O envio de dados e a decisão operacional da API diante de ausência de compartilhamento não pertencem a esta etapa.
- **Web:** requests/responses e adaptação HTTP, sem regras de negócio.
- **Integrações:** consulta às aplicações/ambientes por contratos públicos existentes; evitar leitura direta de repositórios de outros módulos.
- **Facades:** seguir convenção efetiva da branch alvo; não criar novos pacotes antes de verificar a estrutura atual.

A escolha entre `core/shared` e `feature/shared`, ou uma composição distinta, depende da posição real do recurso no serviço e de suas dependências. Não duplicar Application, Environment nem autorização.

## 3. Modelo lógico mínimo (não é migration pronta)

**Catálogo de status existente:** reutilizar a infraestrutura `ShareStatusType` (`type_sharing_statuses` e `/api/v1/share-status-type`), ajustando o `ShareStatusTypeEnum` ao contrato novo. Os valores antigos (`WAITING_DESTINATION_APPROVAL`, `WAITING_SOURCE_APPROVAL`, `CANCELLED` e `NOT_REQUESTED`) pertencem ao contrato anterior e não fazem parte do novo modelo; não há requisito de compatibilidade com ele nesta feature.

Estados e transições do contrato novo:

| Estado | Próximos estados | Responsável |
| --- | --- | --- |
| `PENDING` | `APPROVED`, `REJECTED` | Proprietário autorizado |
| `APPROVED` | `REVOKED` | Proprietário autorizado |
| `REJECTED` | `PENDING` ou exclusão física | Aplicação participante |
| `REVOKED` | `PENDING` ou exclusão física | Aplicação participante |

O encerramento voluntário de participação `APPROVED` também remove o vínculo operacional fisicamente, com auditoria. Ausência de vínculo não é status persistido; `NOT_REQUESTED` não integra o novo enum.

**SharedContract**: identificador técnico; identificador público UUID; referência à conta receptora e à aplicação receptora; lifecycle; metadados/configuração a definir. A conta e aplicação proprietárias são o destino do compartilhamento.

**SharedParticipant**: identificador técnico; identificador público UUID; referência ao contrato; referência à aplicação participante/publicadora, que envia os dados; status `PENDING | APPROVED | REJECTED | REVOKED`; timestamps de criação/alteração. A participação é por aplicação: unicidade por (contrato, aplicação participante), sem incluir ambiente.

**SharedParticipantEnvironmentMapping**: identificador técnico; referência ao vínculo de participação; identificador do ambiente de origem da aplicação participante/publicadora; identificador do ambiente de destino da aplicação receptora; timestamps de criação/alteração. A associação é uma linha por par (participação, ambiente de origem, ambiente de destino), permitindo que uma origem tenha vários destinos. Não definir unicidade exclusiva do destino enquanto não houver decisão sobre destinos compartilhados entre origens distintas. Os ambientes são recursos das aplicações; usar identificadores, nunca apenas nomes ou aliases.

Rejeição e revogação preservam o registro. Exclusão voluntária remove o registro operacional, mantendo trilha de auditoria. Exclusão de contrato elegível remove vínculos associados em cascata. Cada evento de transição auditado registra status anterior e novo, autor e data/hora; o motivo informado é armazenado na tabela de auditoria e consultado pelo histórico, sem compor o status nem o catálogo. Definir estratégia de auditoria transacional e ordenação antes da migration.

## 4. Operações funcionais a implementar

- Criar, consultar, atualizar, inativar e excluir contrato conforme lifecycle existente e regras ainda a confirmar.
- Solicitar participação: criar `PENDING` sem duplicidade.
- Aprovar `PENDING → APPROVED`; rejeitar `PENDING → REJECTED`.
- Revogar `APPROVED → REVOKED`.
- Reencaminhar `REJECTED/REVOKED → PENDING` **no mesmo vínculo**.
- Excluir vínculo por iniciativa do solicitante, inclusive quando aprovado; impedir novos envios.
- Listar participantes para proprietário: `PENDING` e `APPROVED`, filtros nome/aplicação/status.
- Listar vínculos para aplicação participante: todos os estados existentes, incluindo rejeitados e revogados.
- Durante a análise da solicitação, o proprietário autorizado da aplicação receptora consulta os ambientes da aplicação participante e configura zero, um ou vários destinos explícitos para cada origem antes de aprovar. A aprovação pode deixar origens sem mapeamento.
- Após a aprovação, o proprietário autorizado da aplicação receptora pode criar, alterar ou remover mapeamentos sem nova aprovação; cada mudança deve ser auditada.
- Disponibilizar uma consulta/use case do Shared que permita à futura API de publicação verificar a elegibilidade por contrato, aplicação participante e ambiente. A falta de mapeamento torna inelegível somente aquele ambiente/participante; outros mapeamentos permanecem válidos. O envio dos dados e a ação operacional da API diante de inelegibilidade ficam fora desta etapa.

## 5. Regras de autorização e consistência

A conta e a aplicação receptora são proprietárias do contrato; usuário autorizado por esse lado decide sobre aprovação, rejeição e revogação. A aplicação participante/publicadora solicita, reencaminha e encerra o próprio vínculo. A configuração inicial e os ajustes posteriores do mapeamento são feitos por usuário autorizado da aplicação receptora, que administra o contrato. O ajuste pós-aprovação não exige nova aprovação, mas deve ser auditado. A futura consulta de elegibilidade deve exigir contrato habilitado, participação `APPROVED` e pelo menos um mapeamento válido para o ambiente de origem consultado. Reenvio não aprova automaticamente. Usar a infraestrutura Golden de autorização e mensagens já presente, após inspecionar suas assinaturas reais.

Usar validação centralizada e proteção contra transições concorrentes; definir versionamento otimista ou atualização condicional conforme o padrão do repositório. Na análise da solicitação, carregar os ambientes da aplicação participante/publicadora e permitir que o proprietário da aplicação receptora escolha zero, um ou vários destinos por origem. Validar que origem e destino pertencem às aplicações corretas, que estão ativos e que a base de cada par é igual (ambiente padrão usa a própria base; customizado usa sua referência de base). Ambiente sem mapeamento não impede a aprovação, mas não é elegível para publicação. Não criar ambientes automaticamente, não inferir associação por nome e não usar `DEFAULT` como fallback. Cada vínculo é explícito; ajustes após aprovação não requerem nova aprovação e geram auditoria. Restrições de banco complementam validações, não as substituem. A unicidade de destino entre origens distintas continua pendente.

## 6. Endpoints — contrato conceitual, não rotas finais

| Operação | Consumidor | Resultado |
| --- | --- | --- |
| Solicitar participação | Solicitante | PENDING |
| Aprovar / rejeitar | Proprietário | APPROVED / REJECTED |
| Revogar | Proprietário | REVOKED |
| Reencaminhar | Solicitante | PENDING |
| Excluir participação | Solicitante | vínculo removido |
| Listar participantes | Proprietário | pendentes e aprovados |
| Listar meus compartilhamentos | Aplicação participante | todos os estados persistidos |
| Definir mapeamento durante aprovação | Proprietário da aplicação receptora | cada origem pode ter zero, um ou vários destinos de mesma base |
| Ajustar mapeamento aprovado | Proprietário da aplicação receptora | alteração sem nova aprovação, com auditoria |
| Consultar elegibilidade Shared | API futura de publicação | decisão de elegibilidade por contrato, participante e ambiente |
| Consultar/remover mapeamento | Proprietário autorizado da aplicação receptora | consulta ou remove associação explícita, com auditoria |
| Excluir contrato elegível | Proprietário | contrato e vínculos removidos |

Nomes, métodos, códigos HTTP, paginação, contratos DTO e escopo de autorização dependem da inspeção da Web atual.

## 7. Estratégia de implementação e testes

**Onda A — descoberta:** inspecionar classes e migrations de Application, Environment, Publisher, autorização, facades, mensagens, auditoria e endpoints; identificar branch alvo e convenções vigentes.

**Onda B — contratos:** fechar payload do contrato, pré-condições de lifecycle e APIs; revisar esta especificação. A propriedade pela conta/aplicação receptora, a participação pela aplicação publicadora e o mapeamento por ambiente já estão definidos funcionalmente.

**Onda C — persistência e domínio:** migration, constraints, validações e transições com testes unitários e integração MySQL.

**Onda D — Web e autorização:** controllers/facades conforme padrão existente, filtros, paginação, mensagens e testes de permissão.

**Onda E — validação do Shared:** validar consulta de elegibilidade para estados do contrato/participação e mapeamento de ambiente, além de auditoria e exclusão em cascata. A integração dessa consulta ao fluxo de publicação do Publisher e a ação da API diante de inelegibilidade ficam para etapa futura. Executar build, testes e pipeline na branch aprovada.

Critérios de teste mínimos: matriz completa de transições; duplicidade; reenvio preservando vínculo; visibilidade diferente para proprietário e participante; controle de concorrência; autorização cruzada; cascata; auditoria; validação de pertencimento e lifecycle dos ambientes; cardinalidade um-para-muitos por ambiente de origem; validação de igualdade de base em cada par; aprovação com ambientes de origem sem mapeamento; consulta de elegibilidade negativa para ambiente sem mapeamento e inexistência de fallback implícito; alterações posteriores sem nova aprovação e com auditoria; mapeamentos válidos dos demais ambientes permanecem elegíveis.

## 8. Decisões pendentes

1. A decisão funcional está fechada: o contrato pertence à conta e à aplicação receptora; cada participante é uma aplicação publicadora. Na descoberta técnica, confirmar os identificadores e a forma de validar o vínculo entre conta, aplicação receptora e aplicação participante.
2. Conteúdo completo e semântica do contrato SHARED, inclusive quais dados/configurações ele autoriza compartilhar.
3. Conteúdo e contrato de consulta de elegibilidade que a futura API de publicação consumirá; o envio e a ação da API diante de inelegibilidade ficam fora desta etapa.
4. Convenções reais de facades, endpoints, autorização e migrations na branch de implementação.
5. Contrato inativo: transições permitidas e pré-condições de exclusão.
6. Política de dados já publicados e invalidação de cache: **fora desta etapa**, conforme decisão funcional.
7. Obrigatoriedade do preenchimento do motivo de rejeição/revogação; quando informado, o motivo fica no evento da tabela de auditoria e disponível no histórico conforme as permissões de auditoria.

**Não iniciar mudanças de código baseadas em suposições sobre esses pontos.**

## 9. Matriz de refinamento para implementação futura (sem implementação nesta fase)

| Cenário | Estado inicial | Comando | Estado final | Visibilidade proprietário | Visibilidade solicitante |
| --- | --- | --- | --- | --- | --- |
| Nova solicitação | Sem vínculo | Solicitar | PENDING | Sim | Sim |
| Aprovação | PENDING | Aprovar | APPROVED | Sim | Sim |
| Rejeição | PENDING | Rejeitar | REJECTED | Não na lista operacional | Sim, excluir/reencaminhar |
| Revogação | APPROVED | Revogar | REVOKED | Não na lista operacional | Sim, excluir/reencaminhar |
| Novo envio | REJECTED/REVOKED | Reencaminhar | PENDING, mesmo vínculo | Sim | Sim |
| Desistência | APPROVED | Excluir | Sem vínculo | Não | Não, salvo auditoria |
| Desistência após recusa | REJECTED/REVOKED | Excluir | Sem vínculo | Não | Não, salvo auditoria |

### 9.1 Casos negativos a especificar e testar

- Aprovar vínculo que não esteja PENDING deve falhar sem alterar estado.
- Revogar vínculo que não esteja APPROVED deve falhar sem alterar estado.
- Reencaminhar vínculo PENDING/APPROVED deve falhar sem alterar estado.
- Reenvio concorrente não deve criar outro vínculo.
- Proprietário não pode decidir por contrato de terceiro; solicitante não pode encerrar participação alheia.
- Contrato inativo impede novas solicitações/aprovações e novos envios; política de reencaminhamento durante inatividade precisa de decisão explícita.
- Ambiente sem mapeamento não pode ser considerado elegível nem receber associação implícita a `DEFAULT`; a reação da API futura é fora do escopo atual.
- Ambiente de origem ou destino inativo/inexistente invalida o mapeamento e bloqueia somente a entrega correspondente.
- A unicidade de um destino entre ambientes de origem distintos não está decidida; não impor essa restrição até o fechamento funcional.
- Exclusão em cascata deve registrar as remoções para auditoria, sem prometer exclusão de dados já publicados.

### 9.2 Critério para encerrar o refinamento

A especificação só passa de DRAFT a pronta para desenvolvimento após: (a) confirmação dos pacotes reais e facades da branch-alvo; (b) confirmação dos identificadores e da validação de conta/aplicação receptora e aplicação participante/publicadora; (c) fechamento do payload do contrato; (d) definição de rotas e DTOs consistentes com a Web existente; (e) definição da consulta de elegibilidade que o Shared expõe para consumo futuro; (f) decisão sobre motivos de rejeição/revogação e demais decisões ainda abertas. A integração dessa consulta ao Publisher, o envio de dados e a ação operacional da API ficam fora desta etapa. O escopo por aplicação e o mapeamento explícito de ambientes por participante estão definidos neste complemento. A limpeza de cache e dados históricos permanece em refinamento separado.
