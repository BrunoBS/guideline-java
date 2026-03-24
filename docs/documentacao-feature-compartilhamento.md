# Feature de Compartilhamento de Aplicações

## Visão Geral

A feature de **Compartilhamento de Aplicações** permite que uma
aplicação (**Target**) exponha funcionalidades (**features**) que podem
ser utilizadas por outras aplicações (**Origins**).

O objetivo é permitir **integrações controladas entre aplicações**,
garantindo governança, rastreabilidade e auditoria através de eventos.

Principais objetivos:

-   Permitir integração controlada entre aplicações
-   Garantir governança de acesso
-   Manter auditoria completa através de eventos
-   Permitir rastreabilidade de decisões de aprovação e rejeição

O compartilhamento ocorre **sempre entre aplicações**.

------------------------------------------------------------------------

# Conceitos Principais

## Target

A aplicação **Target** é a aplicação que **cria e gerencia um
compartilhamento**.

Ela define:

-   Nome do compartilhamento
-   Descrição
-   Features disponíveis
-   Aprovação ou rejeição das origens

## Origin

A aplicação **Origin** é a aplicação que **consome o compartilhamento**.

Responsabilidades:

-   Descobrir compartilhamentos disponíveis
-   Solicitar acesso
-   Aguardar aprovação do Target
-   Aprovar alterações de features feitas pelo Target

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
-   origin_application_id
-   status

Restrição recomendada:

    UNIQUE (sharing_target_id, origin_application_id)

------------------------------------------------------------------------

# Status do Compartilhamento

  Status                    Significado
  ------------------------- ---------------------------------------
  PENDING_TARGET_APPROVAL   aguardando aprovação do target
  APPROVED                  compartilhamento ativo
  REJECTED_BY_TARGET        target recusou
  PENDING_ORIGIN_APPROVAL   origin precisa aceitar novas features
  REJECTED_BY_ORIGIN        origin recusou

------------------------------------------------------------------------

# Controllers

A API é dividida em dois controllers:

-   **SharingTargetController**
-   **SharingOriginController**

------------------------------------------------------------------------

# SharingTargetController

Responsável por gerenciar os compartilhamentos criados pela aplicação
**Target**.

Base:

    /accounts/{accountId}/applications/{applicationId}/sharings

## Endpoints

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Método            Endpoint                                                                                             Tabelas                    Descrição
  ----------------- ---------------------------------------------------------------------------------------------------- -------------------------- -------------------
  POST              /accounts/{accountId}/applications/{applicationId}/sharings                                          sharing_target,            Cria um
                                                                                                                         sharing_target_features    compartilhamento

  GET               /accounts/{accountId}/applications/{applicationId}/sharings                                          sharing_target,            Lista
                                                                                                                         sharing_target_features    compartilhamentos

  GET               /accounts/{accountId}/applications/{applicationId}/sharings/{sharingIdentifier}                      sharing_target,            Busca um
                                                                                                                         sharing_target_features    compartilhamento

  PUT               /accounts/{accountId}/applications/{applicationId}/sharings/{sharingIdentifier}                      sharing_target,            Atualiza features e
                                                                                                                         sharing_target_features,   exige nova
                                                                                                                         sharing_origin             aprovação

  DELETE            /accounts/{accountId}/applications/{applicationId}/sharings/{sharingIdentifier}                      sharing_target,            Remove
                                                                                                                         sharing_origin             compartilhamento

  GET               /accounts/{accountId}/applications/{applicationId}/sharings/{sharingIdentifier}/origins              sharing_origin             Lista aplicações de
                                                                                                                                                    origem

  PATCH             /accounts/{accountId}/applications/{applicationId}/sharings/{sharingIdentifier}/origins/{originId}   sharing_origin             Aprova ou rejeita
                                                                                                                                                    origem

  DELETE            /accounts/{accountId}/applications/{applicationId}/sharings/{sharingIdentifier}/origins/{originId}   sharing_origin             Remove origem
                                                                                                                                                    vinculada
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# SharingOriginController

Responsável pelas operações da **aplicação de origem**.

Base:

    /accounts/{accountId}/applications/{applicationId}/origins

## Endpoints

  -------------------------------------------------------------------------------------------------------------------------------
  Método            Endpoint                                                                Tabelas           Descrição
  ----------------- ----------------------------------------------------------------------- ----------------- -------------------
  GET               /accounts/{accountId}/applications/{applicationId}/sharings-origins     sharing_target,   Lista
                                                                                            sharing_origin    compartilhamentos
                                                                                                              disponíveis

  POST              /accounts/{accountId}/applications/{applicationId}/origins              sharing_origin    Solicita acesso

  GET               /accounts/{accountId}/applications/{applicationId}/origins              sharing_origin    Lista vínculos da
                                                                                                              origem

  GET               /accounts/{accountId}/applications/{applicationId}/origins/{originId}   sharing_origin    Busca vínculo
                                                                                                              específico

  PATCH             /accounts/{accountId}/applications/{applicationId}/origins/{originId}   sharing_origin    Aprova novas
                                                                                                              features

  DELETE            /accounts/{accountId}/applications/{applicationId}/origins/{originId}   sharing_origin    Remove
                                                                                                              compartilhamento
  -------------------------------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# Fluxo Completo do Compartilhamento

  --------------------------------------------------------------------------------------
  Passo                   Endpoint                               Tabela principal
  ----------------------- -------------------------------------- -----------------------
  Target cria sharing     POST /sharings                         sharing_target

  Origin descobre         GET /sharings-origins                  sharing_target
  sharings                                                       

  Origin solicita acesso  POST /origins                          sharing_origin

  Target aprova origem    PATCH                                  sharing_origin
                          /sharings/{sharing}/origins/{origin}   

  Target altera features  PUT /sharings/{sharing}                sharing_target

  Sistema atualiza        UPDATE sharing_origin                  sharing_origin
  origins                                                        

  Origin aprova novas     PATCH /origins/{origin}                sharing_origin
  features                                                       

  Target remove sharing   DELETE /sharings/{sharing}             sharing_target
  --------------------------------------------------------------------------------------

------------------------------------------------------------------------

# SQL de Busca de Compartilhamentos

``` sql
SELECT
st.identifier AS sharing_identifier,
st.name AS sharing_name,
st.description AS sharing_description,
st.application_id AS target_application_id,
app.account_id AS target_account_id,
COALESCE(so.status, 'NOT_REQUESTED') AS share_status_type
FROM sharing_target st
JOIN application app
ON app.id = st.application_id
LEFT JOIN sharing_origin so
ON so.sharing_target_id = st.id
AND so.origin_application_id = :applicationId
WHERE app.account_id = :idAccountTarget
AND st.application_id = :idApplicationTarget
AND st.active = true
AND app.active = true
AND (
:shareStatusType IS NULL
OR COALESCE(so.status, 'NOT_REQUESTED') = :shareStatusType
);
```

------------------------------------------------------------------------

# Eventos de Compartilhamento

## Eventos do Target

  ------------------------------------------------------------------------------------
  Evento                               Quando acontece         Descrição
  ------------------------------------ ----------------------- -----------------------
  TARGET_SHARING_CREATED               criação de              Target criou um
                                       compartilhamento        compartilhamento

  TARGET_SHARING_UPDATED               alteração de features   Target alterou features

  TARGET_ORIGIN_APPROVED               origem aprovada         Origem autorizada

  TARGET_ORIGIN_REJECTED               origem rejeitada        Origem recusada

  TARGET_SHARING_DELETED               remoção do sharing      Sharing removido

  TARGET_SHARING_REVOKED_FROM_ORIGIN   origem removida         Origem perdeu acesso
  ------------------------------------------------------------------------------------

------------------------------------------------------------------------

## Eventos da Origin

  ----------------------------------------------------------------------------------
  Evento                             Quando acontece         Descrição
  ---------------------------------- ----------------------- -----------------------
  ORIGIN_SHARING_REQUESTED           solicitação enviada     Origin pediu acesso

  ORIGIN_SHARING_APPROVED            aprovação recebida      Target aprovou

  ORIGIN_SHARING_REJECTED            solicitação rejeitada   Target recusou

  ORIGIN_FEATURE_UPDATE_APPROVED     features aprovadas      Origin aceitou
                                                             atualização

  ORIGIN_FEATURE_UPDATE_REJECTED     features rejeitadas     Origin recusou
                                                             atualização

  ORIGIN_SHARING_REMOVED             origem removeu vínculo  Origin cancelou

  ORIGIN_SHARING_REVOKED_BY_TARGET   target removeu vínculo  Target cancelou
  ----------------------------------------------------------------------------------

------------------------------------------------------------------------

# Logs Cruzados

## Objetivo

Garantir auditoria quando uma ação de uma aplicação impacta outra.

Sempre gerar logs em:

-   aplicação **Target**
-   aplicação **Origin**

------------------------------------------------------------------------

# Cenários de Logs Cruzados

## 1. Origin remove compartilhamento

  Aplicação   Evento
  ----------- ------------------------------------
  Target      TARGET_SHARING_REVOKED_FROM_ORIGIN
  Origin      ORIGIN_SHARING_REMOVED

------------------------------------------------------------------------

## 2. Target remove compartilhamento

Para cada origem vinculada.

  Aplicação   Evento
  ----------- ------------------------------------
  Target      TARGET_SHARING_DELETED
  Target      TARGET_SHARING_REVOKED_FROM_ORIGIN
  Origin      ORIGIN_SHARING_REVOKED_BY_TARGET

------------------------------------------------------------------------

## 3. Target aprova origem

  Aplicação   Evento
  ----------- -------------------------
  Target      TARGET_ORIGIN_APPROVED
  Origin      ORIGIN_SHARING_APPROVED

------------------------------------------------------------------------

## 4. Target rejeita origem

  Aplicação   Evento
  ----------- -------------------------
  Target      TARGET_ORIGIN_REJECTED
  Origin      ORIGIN_SHARING_REJECTED

------------------------------------------------------------------------

## 5. Target altera features

  Aplicação   Evento
  ----------- -------------------------------
  Target      TARGET_SHARING_UPDATED
  Origin      ORIGIN_FEATURE_UPDATE_PENDING

Após decisão da origin:

  Aplicação   Evento
  ----------- --------------------------------
  Origin      ORIGIN_FEATURE_UPDATE_APPROVED
  Origin      ORIGIN_FEATURE_UPDATE_REJECTED

------------------------------------------------------------------------

# Regra Geral de Auditoria

Sempre que uma ação de uma aplicação impactar outra aplicação no
contexto de compartilhamento:

-   Deve ser gerado **evento na aplicação que executou a ação**
-   Deve ser gerado **evento na aplicação impactada**

Essa estratégia garante **rastreabilidade completa do histórico de
integrações entre aplicações**.
