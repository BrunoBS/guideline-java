# Documentação Completa da Feature de Compartilhamento de Aplicações

## Visão Geral

A feature de **Compartilhamento de Aplicações** permite que uma
aplicação (TARGET) exponha funcionalidades (features) que podem ser
utilizadas por outras aplicações (ORIGINS).

Esse modelo foi projetado para:

-   Permitir integração controlada entre aplicações
-   Garantir governança de acesso
-   Manter auditoria completa através de eventos
-   Manter rastreabilidade de decisões de aprovação e rejeição

O compartilhamento ocorre **sempre entre aplicações**.

------------------------------------------------------------------------

# Conceitos Principais

## Target

A aplicação **Target** é a aplicação que **disponibiliza um
compartilhamento**.

Ela define:

-   Nome do compartilhamento
-   Descrição
-   Lista de features disponíveis

## Origin

A aplicação **Origin** é a aplicação que **solicita utilizar o
compartilhamento**.

Ela precisa:

-   Solicitar acesso
-   Aguardar aprovação do Target
-   Aprovar atualizações de features feitas pelo Target

------------------------------------------------------------------------

# Modelo de Domínio

    Application (Target)
            │
            ▼
    SharingTarget
            │
            ▼
    SharingOrigin
            │
            ▼
    Application (Origin)

------------------------------------------------------------------------

# Entidades

## SharingTarget

Representa um compartilhamento criado por uma aplicação Target.

Campos:

-   id
-   identifier (UUID)
-   name
-   description
-   application_id
-   featureIds

Características:

-   Não possui lista de origins mapeada
-   Representa apenas a configuração do compartilhamento

------------------------------------------------------------------------

## SharingOrigin

Representa o vínculo entre uma aplicação Origin e um SharingTarget.

Campos:

-   id
-   sharing_target_id
-   application_id (origin)
-   shareStatusType

Restrição recomendada:

    UNIQUE (sharing_target_id, application_id)

------------------------------------------------------------------------

# Enum de Status

    PENDING_APPROVAL
    APPROVED
    REJECTED
    FEATURE_UPDATE_PENDING

------------------------------------------------------------------------

# Controllers

A API é dividida em **dois controllers**:

-   SharingTargetController
-   SharingOriginController

------------------------------------------------------------------------

# SharingTargetController

Responsável pelas operações do **dono do compartilhamento**.

Base path:

    /accounts/{accountId}/applications/{applicationId}/sharing-targets

------------------------------------------------------------------------

## Criar compartilhamento

POST

    /

Request:

    {
      "name": "Integração Financeira",
      "description": "Compartilhamento de dados financeiros",
      "features": ["PAYMENTS", "INVOICES"]
    }

Service:

    sharingTargetService.createSharingTarget()

Evento gerado:

    TARGET_SHARING_CREATED

------------------------------------------------------------------------

## Atualizar compartilhamento

PUT

    /{sharingIdentifier}

Service:

    sharingTargetService.updateSharingTarget()

Evento:

    TARGET_SHARING_UPDATED

Origens passam para:

    FEATURE_UPDATE_PENDING

------------------------------------------------------------------------

## Listar compartilhamentos

GET

    /

Service:

    sharingTargetService.findAll()

------------------------------------------------------------------------

## Buscar compartilhamento

GET

    /{sharingIdentifier}

Service:

    sharingTargetService.findByIdentifier()

------------------------------------------------------------------------

## Aprovar origem

PATCH

    /{sharingIdentifier}/origins/{originId}/status

Request:

    {
      "shareStatusType": "APPROVED"
    }

Service:

    sharingTargetService.updateOriginStatus()

Eventos:

Target:

    TARGET_ORIGIN_APPROVED

Origin:

    ORIGIN_SHARING_APPROVED

------------------------------------------------------------------------

## Rejeitar origem

Eventos:

Target:

    TARGET_ORIGIN_REJECTED

Origin:

    ORIGIN_SHARING_REJECTED

------------------------------------------------------------------------

## Remover compartilhamento

DELETE

    /{sharingIdentifier}

Service:

    sharingTargetService.deleteSharingTarget()

Fluxo:

1.  Gerar eventos para cada origem
2.  Deletar SharingOrigin
3.  Deletar SharingTarget

Eventos:

    TARGET_SHARING_DELETED
    TARGET_SHARING_REVOKED_FROM_ORIGIN
    ORIGIN_SHARING_REVOKED_BY_TARGET

------------------------------------------------------------------------

# SharingOriginController

Responsável pelas operações da **aplicação que consome o
compartilhamento**.

Base path:

    /accounts/{accountId}/applications/{applicationId}/sharing-origins

------------------------------------------------------------------------

## Buscar compartilhamentos disponíveis

GET

    /search

Parâmetros:

  Parâmetro             Obrigatório   Descrição
  --------------------- ------------- ---------------------
  idAccountTarget       sim           Conta do target
  idApplicationTarget   sim           Aplicação do target
  shareStatusType       não           Status do vínculo

Service:

    sharingOriginService.searchSharings()

------------------------------------------------------------------------

## Solicitar compartilhamento

POST

    /

Request:

    {
      "sharingIdentifier": "uuid-do-sharing"
    }

Service:

    sharingOriginService.requestSharing()

Evento:

    ORIGIN_SHARING_REQUESTED

------------------------------------------------------------------------

## Aprovar atualização de features

PATCH

    /{originId}/features

Request:

    {
      "approved": true
    }

Service:

    sharingOriginService.approveFeatureUpdate()

Eventos:

    ORIGIN_FEATURE_UPDATE_APPROVED
    TARGET_FEATURE_UPDATE_APPROVED

------------------------------------------------------------------------

## Rejeitar atualização de features

Eventos:

    ORIGIN_FEATURE_UPDATE_REJECTED
    TARGET_FEATURE_UPDATE_REJECTED

------------------------------------------------------------------------

## Remover compartilhamento

DELETE

    /{originId}

Service:

    sharingOriginService.removeSharing()

Eventos:

Target:

    TARGET_SHARING_REVOKED_FROM_ORIGIN

Origin:

    ORIGIN_SHARING_REMOVED

------------------------------------------------------------------------

# Eventos do Target

  Evento                               Descrição
  ------------------------------------ -----------------------------
  TARGET_SHARING_CREATED               Compartilhamento criado
  TARGET_SHARING_UPDATED               Compartilhamento atualizado
  TARGET_ORIGIN_APPROVED               Origem aprovada
  TARGET_ORIGIN_REJECTED               Origem rejeitada
  TARGET_SHARING_DELETED               Compartilhamento removido
  TARGET_SHARING_REVOKED_FROM_ORIGIN   Origem removida

------------------------------------------------------------------------

# Eventos da Origin

  Evento                             Descrição
  ---------------------------------- -----------------------------------
  ORIGIN_SHARING_REQUESTED           Solicitação enviada
  ORIGIN_SHARING_APPROVED            Acesso aprovado
  ORIGIN_SHARING_REJECTED            Acesso rejeitado
  ORIGIN_FEATURE_UPDATE_APPROVED     Atualização de features aprovada
  ORIGIN_FEATURE_UPDATE_REJECTED     Atualização rejeitada
  ORIGIN_SHARING_REMOVED             Origem removeu o compartilhamento
  ORIGIN_SHARING_REVOKED_BY_TARGET   Target removeu o compartilhamento

------------------------------------------------------------------------

# Regras de Logs Cruzados

Algumas ações geram eventos em **duas aplicações**.

## Origem remove o compartilhamento

Eventos:

Target:

    TARGET_SHARING_REVOKED_FROM_ORIGIN

Origin:

    ORIGIN_SHARING_REMOVED

------------------------------------------------------------------------

## Target remove o compartilhamento

Eventos:

Target:

    TARGET_SHARING_DELETED
    TARGET_SHARING_REVOKED_FROM_ORIGIN

Origin:

    ORIGIN_SHARING_REVOKED_BY_TARGET

------------------------------------------------------------------------

# Estratégia de Delete

O sistema utiliza **delete físico**.

Motivos:

-   Simplifica consultas
-   Evita acúmulo de dados
-   Melhora performance
-   Auditoria é garantida via eventos

------------------------------------------------------------------------

# Cascade Delete

    FOREIGN KEY (sharing_target_id)
    REFERENCES sharing_target(id)
    ON DELETE CASCADE

------------------------------------------------------------------------

# Services

## SharingTargetService

Responsável por:

-   criar compartilhamentos
-   atualizar features
-   aprovar origens
-   rejeitar origens
-   remover compartilhamentos

Principais métodos:

    createSharingTarget()
    updateSharingTarget()
    findAll()
    findByIdentifier()
    updateOriginStatus()
    deleteSharingTarget()

------------------------------------------------------------------------

## SharingOriginService

Responsável por:

-   buscar compartilhamentos
-   solicitar acesso
-   aprovar features
-   rejeitar features
-   remover vínculo

Principais métodos:

    searchSharings()
    requestSharing()
    approveFeatureUpdate()
    removeSharing()

------------------------------------------------------------------------

# Conclusão

Essa arquitetura garante:

-   controle completo sobre integrações
-   rastreabilidade através de eventos
-   modelo simples de dados
-   governança entre aplicações
