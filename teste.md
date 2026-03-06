---
config:
  layout: dagre
  theme: forest
---

erDiagram

TipoAutorizacao {
    BIGINT id
    VARCHAR nome
    VARCHAR descricao
    INT ordem
    VARCHAR situacao
}

TipoAmbiente {
    BIGINT id
    VARCHAR nome
    VARCHAR descricao
    INT ordem
    VARCHAR situacao
}

TipoScopoProvider {
    BIGINT id
    VARCHAR nome
    VARCHAR descricao
    INT ordem
    VARCHAR situacao
}

Conta {
    BIGINT id
    VARCHAR identificador
    VARCHAR nome
    VARCHAR descricao
    VARCHAR sigla
    VARCHAR grupoAutorizador
    VARCHAR solicitante
    VARCHAR emailGrupo
    BOOLEAN integracao 
    BOOLEAN situacao
}

TagConta {
    UUID id
    VARCHAR nome
}

Aplicacao {
    BIGINT id PK
    VARCHAR nome
    BIGINT idConta
}

TagAplicacao {
    UUID id
    VARCHAR nome
}

Configuracao {
    BIGINT id
    BIGINT id_ambiente
    BIGINT id_provedor_primario
    BIGINT id_provedor_secundario
    VARCHAR metadado_primario
    VARCHAR metadado_secundario
    VARCHAR grupo_autorizador
}

Configuracao_Conta {
    BIGINT idConfiguracao
    BIGINT IdConta 
}

Configuracao_Aplicacao {
    BIGINT idConfiguracao
    BIGINT idAplicacao
}

Ambiente {
    BIGINT id
    BIGINT idConta
    VARCHAR nome
    BIGINT idTipoAutorizacao
    BIGINT idTipoAmbiente
    VARCHAR descricao
    INT Ordem
    VARCHAR situacao
}

Aprovador {
    UUID uuid
    BIGINT idConta
    VARCHAR funcional
    VARCHAR email
}

TipoOnbording {
    BIGINT id
    VARCHAR nome
    VARCHAR descricao
    INT ordem
    VARCHAR sigla
    VARCHAR solicitante
    VARCHAR emailGrupo
    VARCHAR situacao
}

OnbordingConcluidoConta {
    BIGINT id
    BIGINT idConta
    BIGINT idTipoOnbording
    DATE dataConclusao
    VARCHAR situacao
}

Provedor {
    BIGINT id
    VARCHAR nome
    VARCHAR label
    VARCHAR descricao
    JSON schema
    BIGINT idTipoScopoProvider
    VARCHAR situacao
    BOOLEAN depreciado
}

%% Relacionamentos
TipoAutorizacao ||--o{ Ambiente : autoriza
TipoAmbiente ||--o{ Ambiente : classifica
Conta ||--o{ Ambiente : possui
Aplicacao ||--o{ TagAplicacao : tem
Conta ||--o{ TagConta : tem
Conta ||--o{ Aprovador : possui

Conta ||--o{ OnbordingConcluidoConta : registra
TipoOnbording ||--o{ OnbordingConcluidoConta : tipo

Ambiente ||--o{ Configuracao_Conta : configuracao
Conta ||--o{ Configuracao_Conta : possui

Provedor ||--o{ Configuracao_Conta : primario
Provedor ||--o{ Configuracao_Conta : secundario

TipoScopoProvider ||--o{ Provedor : escopo

Conta ||--o{ Aplicacao : possui
Conta ||--o{ Configuracao_Conta : possui
Configuracao ||--|| Configuracao_Conta : herança
Configuracao ||--|| Configuracao_Aplicacao : herança
Aplicacao ||--|| Configuracao_Aplicacao : tem

