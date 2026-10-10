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


## 2.1 Política de publicação por participação

O modo é um atributo do vínculo `SharedParticipant`, não de cada mapeamento de ambiente. Há dois comportamentos conceituais:

- **Automática:** uma publicação feita pela aplicação de origem deverá ser propagada aos destinos associados, conforme os mapeamentos.
- **Manual:** não há propagação automática; a aplicação receptora pode consultar configurações da origem em modo somente leitura e escolher quais publicar na própria conta.

O Shared define e expõe essa política. A execução de publicação, a integração com o Publisher, a consulta/seleção manual e os endpoints correspondentes permanecem fora desta etapa.

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

**SharedParticipant**: identificador técnico; identificador público UUID; referência ao contrato; referência à aplicação participante/publicadora, que envia os dados; status `PENDING | APPROVED | REJECTED | REVOKED`; referência ao catálogo de modo de publicação da participação (`AUTOMÁTICA` ou `MANUAL`), não obrigatório antes da aprovação e definido ao aprovar; timestamps de criação/alteração. A participação é por aplicação: unicidade por (contrato, aplicação participante), sem incluir ambiente. O modo aplica-se uniformemente a todos os mapeamentos dessa participação, sem configuração por ambiente.

**SharedParticipantEnvironmentMapping**: identificador técnico; referência ao vínculo de participação; identificador do ambiente de origem da aplicação participante/publicadora; identificador do ambiente de destino da aplicação receptora; timestamps de criação/alteração. A associação é uma linha por par (participação, ambiente de origem, ambiente de destino), permitindo que uma origem tenha vários destinos. Impor unicidade por (participação, ambiente de destino), para que o mesmo destino não seja associado a origens diferentes dentro da mesma participação. Os ambientes são recursos das aplicações; usar identificadores, nunca apenas nomes ou aliases.

Rejeição e revogação preservam o registro. Exclusão voluntária remove o registro operacional, mantendo trilha de auditoria. Exclusão de contrato elegível remove vínculos associados em cascata. Cada evento de transição auditado registra status anterior e novo, autor e data/hora. Não coletar nem armazenar motivo para rejeição ou revogação. Definir estratégia de auditoria transacional e ordenação antes da migration.

## 4. Operações funcionais a implementar

- Criar, consultar, atualizar, inativar e excluir contrato conforme lifecycle existente e regras ainda a confirmar.
- Solicitar participação: criar `PENDING` sem duplicidade.
- Aprovar `PENDING → APPROVED` informando o modo de publicação da participação e os mapeamentos de ambiente que o proprietário deseja configurar; origens podem permanecer sem mapeamento.
- Rejeitar `PENDING → REJECTED` sem exigir modo de publicação nem mapeamentos.
- Revogar `APPROVED → REVOKED`.
- Reencaminhar `REJECTED/REVOKED → PENDING` **no mesmo vínculo**.
- Excluir vínculo por iniciativa do solicitante, inclusive quando aprovado; impedir novos envios.
- Listar participantes para proprietário: `PENDING` e `APPROVED`, filtros nome/aplicação/status.
- Listar vínculos para aplicação participante: todos os estados existentes, incluindo rejeitados e revogados.
- Durante a análise da solicitação, o proprietário autorizado da aplicação receptora consulta os ambientes da aplicação participante e configura zero, um ou vários destinos explícitos para cada origem antes de aprovar. A aprovação pode deixar origens sem mapeamento.
- Após a aprovação, o proprietário autorizado da aplicação receptora pode criar, alterar ou remover mapeamentos sem nova aprovação; cada mudança deve ser auditada.
- Persistir e disponibilizar o modo de publicação definido para cada participação; o mesmo modo vale para todos os seus mapeamentos de ambiente.
- Disponibilizar uma consulta/use case do Shared que permita à futura API de publicação verificar a elegibilidade por contrato, aplicação participante e ambiente. A falta de mapeamento torna inelegível somente aquele ambiente/participante; outros mapeamentos permanecem válidos. O envio dos dados e a ação operacional da API diante de inelegibilidade ficam fora desta etapa.

## 5. Regras de autorização e consistência

A conta e a aplicação receptora são proprietárias do contrato; usuário autorizado por esse lado decide sobre aprovação, rejeição e revogação. A aplicação participante/publicadora solicita, reencaminha e encerra o próprio vínculo. A configuração inicial e os ajustes posteriores do mapeamento são feitos por usuário autorizado da aplicação receptora, que administra o contrato. O ajuste pós-aprovação não exige nova aprovação, mas deve ser auditado. A futura consulta de elegibilidade deve exigir contrato habilitado, participação `APPROVED` e pelo menos um mapeamento válido para o ambiente de origem consultado. Reenvio não aprova automaticamente. Usar a infraestrutura Golden de autorização e mensagens já presente, após inspecionar suas assinaturas reais.

Usar validação centralizada e proteção contra transições concorrentes; definir versionamento otimista ou atualização condicional conforme o padrão do repositório. Na análise da solicitação, carregar os ambientes da aplicação participante/publicadora. Para aprovar, exigir que o proprietário da aplicação receptora informe o modo de publicação e permitir que escolha zero, um ou vários destinos por origem. Para rejeitar, não exigir modo nem mapeamentos. Validar que origem e destino pertencem às aplicações corretas, que estão ativos e que a base de cada par é igual (ambiente padrão usa a própria base; customizado usa sua referência de base). Ambiente sem mapeamento não impede a aprovação, mas não é elegível para publicação. Não criar ambientes automaticamente, não inferir associação por nome e não usar `DEFAULT` como fallback. Cada vínculo é explícito; ajustes após aprovação não requerem nova aprovação e geram auditoria. Restrições de banco complementam validações, não as substituem. Validar também a unicidade do destino dentro da participação: um destino não pode estar associado a origens diferentes; cada origem pode ter vários destinos.

## 6. Contratos HTTP para os controllers (proposta)

As rotas abaixo são uma proposta de refinamento para os controllers HTTP. A base contextual acordada é:

`/api/v1/workspaces/{workspaceIdentifier}/applications/{applicationIdentifier}`

O contexto da aplicação na rota deve ser validado com a autorização do usuário. Nas operações do proprietário, `applicationIdentifier` identifica a aplicação Shared receptora. Nas operações de participante, identifica a aplicação publicadora solicitante.

### 6.1 Operações do proprietário do contrato

| Operação | Método e rota conceitual | Input HTTP | Output HTTP |
| --- | --- | --- | --- |
| Criar contrato | `POST /contracts` | `CreateSharedContractRequest` — payload de negócio ainda a definir | `201`, `SharedContractResponse` |
| Listar contratos próprios | `GET /contracts` | filtros/paginação conforme padrão Web do serviço | `200`, página de `SharedContractSummaryResponse` |
| Consultar contrato | `GET /contracts/{contractIdentifier}` | — | `200`, `SharedContractResponse` |
| Editar contrato | `PUT /contracts/{contractIdentifier}` | `UpdateSharedContractRequest` — payload de negócio ainda a definir | `200`, `SharedContractResponse` |
| Inativar contrato | `PATCH /contracts/{contractIdentifier}/inactivation` | sem payload de negócio | `200`, `SharedContractResponse` |
| Excluir contrato inativo | `DELETE /contracts/{contractIdentifier}` | — | `204` |
| Listar participações do contrato | `GET /contracts/{contractIdentifier}/participations` | filtros/paginação conforme padrão Web do serviço | `200`, página de `ParticipationResponse` |
| Aprovar participação | `POST /contracts/{contractIdentifier}/participations/{participationIdentifier}/approval` | `ApproveParticipationRequest` | `200`, `ParticipationResponse` |
| Rejeitar participação | `POST /contracts/{contractIdentifier}/participations/{participationIdentifier}/rejection` | sem payload; não exige modo, ambientes ou motivo | `200`, `ParticipationResponse` |
| Revogar participação aprovada | `POST /contracts/{contractIdentifier}/participations/{participationIdentifier}/revocation` | sem payload; não exige motivo | `200`, `ParticipationResponse` |
| Consultar mapeamentos | `GET /contracts/{contractIdentifier}/participations/{participationIdentifier}/environment-mappings` | — | `200`, lista de `EnvironmentMappingResponse` |
| Ajustar mapeamentos aprovados | `PUT /contracts/{contractIdentifier}/participations/{participationIdentifier}/environment-mappings` | `UpdateEnvironmentMappingsRequest` | `200`, lista de `EnvironmentMappingResponse`; auditar a alteração, sem nova aprovação |

A aprovação exige modo do catálogo. Os mapeamentos podem ser parciais: origem omitida fica sem destino e não é elegível para publicação. Cada origem mapeada pode ter vários destinos de mesma base; dentro da participação, um mesmo destino não pode ser reutilizado por origens diferentes. Rejeição e revogação não recebem motivo.

### 6.2 Operações da aplicação participante

| Operação | Método e rota conceitual | Input HTTP | Output HTTP |
| --- | --- | --- | --- |
| Listar contratos disponíveis | `GET /shared-contracts/available` | filtros/paginação conforme padrão Web do serviço | `200`, página de `SharedContractSummaryResponse` |
| Consultar contrato disponível | `GET /shared-contracts/{contractIdentifier}` | — | `200`, `SharedContractResponse` em modo de consulta |
| Solicitar participação | `POST /shared-contracts/{contractIdentifier}/participations` | sem payload de ambiente ou modo | `201`, `ParticipationResponse` com `PENDING` |
| Listar minhas participações | `GET /participations` | filtros/paginação conforme padrão Web do serviço | `200`, página de `ParticipationResponse` |
| Reencaminhar participação rejeitada/revogada | `POST /participations/{participationIdentifier}/resubmission` | sem payload | `200`, `ParticipationResponse` com `PENDING` |
| Retirar a própria participação | `DELETE /participations/{participationIdentifier}` | — | `204`; remover vínculo operacional e manter auditoria |

A identidade da aplicação participante vem do contexto workspace/application e da autorização, não de um identificador de origem enviado livremente no body. O participante não escolhe modo nem ambientes.

### 6.3 Modelos HTTP iniciais

Os DTOs abaixo são do contrato HTTP dos controllers; não definem os Inputs/Outputs internos dos Use Cases.

**ApproveParticipationRequest**

```json
{
  "publicationModeIdentifier": "uuid-do-modo-no-catalogo",
  "environmentMappings": [
    {
      "sourceEnvironmentIdentifier": "uuid-do-ambiente-de-origem",
      "destinationEnvironmentIdentifiers": [
        "uuid-do-primeiro-destino",
        "uuid-do-segundo-destino"
      ]
    }
  ]
}
```

- `publicationModeIdentifier` é obrigatório ao aprovar e referencia o catálogo de modo de publicação (`AUTOMATIC` ou `MANUAL`).
- `environmentMappings` pode estar vazio ou omitir ambientes de origem; cada item associa uma origem a um ou mais destinos.
- A validação verifica pertencimento às aplicações corretas, ambientes ativos e igualdade de base. Não pode haver destino repetido para origens diferentes na mesma participação.
- A operação aprova e grava o modo e os mapeamentos em conjunto. Rejeitar não requer esse DTO.

**UpdateEnvironmentMappingsRequest**

```json
{
  "environmentMappings": [
    {
      "sourceEnvironmentIdentifier": "uuid-do-ambiente-de-origem",
      "destinationEnvironmentIdentifiers": ["uuid-do-destino"]
    }
  ]
}
```

Este `PUT` substitui o conjunto atual de mapeamentos da participação pelo conjunto enviado. Uma lista vazia remove todos os mapeamentos. A mudança é auditada e não exige nova aprovação.

**ParticipationResponse** — campos iniciais confirmados

```json
{
  "participationIdentifier": "uuid-da-participacao",
  "contractIdentifier": "uuid-do-contrato",
  "participantApplicationIdentifier": "uuid-da-aplicacao-publicadora",
  "status": "PENDING",
  "publicationModeIdentifier": null,
  "environmentMappings": []
}
```

O modo pode estar ausente enquanto ainda não houve aprovação; a resposta aprovada inclui o modo escolhido. Os campos completos do contrato e dos resumos dependem da definição do payload funcional do contrato, que continua pendente. Nomes finais dos DTOs, formato de paginação, códigos de erro e convenção exata de PATCH/PUT devem seguir a Web existente.

O catálogo de modo deve ser consultado pelo padrão de endpoint de catálogos já usado no serviço; não se cria um endpoint de catálogo específico dentro de cada controller Shared.


## 7. Estratégia de implementação e testes

**Onda A — descoberta:** inspecionar classes e migrations de Application, Environment, Publisher, autorização, facades, mensagens, auditoria e endpoints; identificar branch alvo e convenções vigentes.

**Onda B — contratos:** fechar payload do contrato, pré-condições de lifecycle e APIs; revisar esta especificação. A propriedade pela conta/aplicação receptora, a participação pela aplicação publicadora e o mapeamento por ambiente já estão definidos funcionalmente.

**Onda C — persistência e domínio:** migration, constraints, validações e transições com testes unitários e integração MySQL.

**Onda D — Web e autorização:** controllers/facades conforme padrão existente, filtros, paginação, mensagens e testes de permissão.

**Onda E — validação do Shared:** validar consulta de elegibilidade para estados do contrato/participação e mapeamento de ambiente, além de auditoria e exclusão em cascata. A integração dessa consulta ao fluxo de publicação do Publisher e a ação da API diante de inelegibilidade ficam para etapa futura. Executar build, testes e pipeline na branch aprovada.

Critérios de teste mínimos: matriz completa de transições; duplicidade; reenvio preservando vínculo; visibilidade diferente para proprietário e participante; controle de concorrência; autorização cruzada; cascata; auditoria; validação de pertencimento e lifecycle dos ambientes; modo AUTOMÁTICO/MANUAL uniforme por participação (sem variação por ambiente); cardinalidade um-para-muitos por ambiente de origem; validação de igualdade de base em cada par; aprovação com modo obrigatório e ambientes de origem sem mapeamento; rejeição sem modo/mapeamentos; consulta de elegibilidade negativa para ambiente sem mapeamento e inexistência de fallback implícito; alterações posteriores sem nova aprovação e com auditoria; mapeamentos válidos dos demais ambientes permanecem elegíveis.

## 8. Decisões pendentes

1. A decisão funcional está fechada: o contrato pertence à conta e à aplicação receptora; cada participante é uma aplicação publicadora. Na descoberta técnica, confirmar os identificadores e a forma de validar o vínculo entre conta, aplicação receptora e aplicação participante.
2. Conteúdo completo e semântica do contrato SHARED, inclusive quais dados/configurações ele autoriza compartilhar.
3. Conteúdo e contrato de consulta de elegibilidade que a futura API de publicação consumirá; o envio e a ação da API diante de inelegibilidade ficam fora desta etapa.
4. Convenções reais de facades, endpoints, autorização e migrations na branch de implementação.
5. Contrato inativo: transições permitidas e pré-condições de exclusão.
6. Política de dados já publicados e invalidação de cache: **fora desta etapa**, conforme decisão funcional.
7. Permissões e regras para alterar o modo de publicação após aprovação.

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
- Rejeitar a associação do mesmo destino a ambientes de origem diferentes dentro da mesma participação; permitir vários destinos para uma mesma origem.
- Exclusão em cascata deve registrar as remoções para auditoria, sem prometer exclusão de dados já publicados.

### 9.2 Critério para encerrar o refinamento

A especificação só passa de DRAFT a pronta para desenvolvimento após: (a) confirmação dos pacotes reais e facades da branch-alvo; (b) confirmação dos identificadores e da validação de conta/aplicação receptora e aplicação participante/publicadora; (c) fechamento do payload do contrato; (d) definição de rotas e DTOs consistentes com a Web existente; (e) definição da consulta de elegibilidade que o Shared expõe para consumo futuro; (f) fechamento das demais decisões ainda abertas. A integração dessa consulta ao Publisher, o envio de dados e a ação operacional da API ficam fora desta etapa. O escopo por aplicação e o mapeamento explícito de ambientes por participante estão definidos neste complemento. A limpeza de cache e dados históricos permanece em refinamento separado.
