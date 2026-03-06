Onboarding e Estrutura de Dados – Conta e Aplicação

1. Fluxo de Onboarding – Portal com Botões por Ambiente

Descrição:

Usuário cadastra conta e aplicação com DEV obrigatório e HML/PROD opcionais.

Aplicação só libera HML/PROD se a conta já tiver o mesmo ambiente configurado.

Tela do portal exibe todos os ambientes lado a lado, com botões indicando configurado, disponível ou bloqueado.


flowchart TD
    %% Tela única do portal - Conta
    subgraph Portal_Conta["Portal: Seleção de Conta"]
        A1[Conta: DEV ✅ Configurado] 
        A2[Conta: HML ⬜ Opcional] 
        A3[Conta: PROD ⬜ Opcional]
    end

    %% Tela única do portal - Aplicação
    subgraph Portal_Aplicacao["Portal: Aplicação"]
        B1[Aplicação: DEV ✅ Obrigatório] 
        B2{Conta HML configurada?}
        B3[Aplicação: HML ⬜ Opcional] 
        B4[Aplicação: HML 🔒 Bloqueado] 
        B5{Conta PROD configurada?}
        B6[Aplicação: PROD ⬜ Opcional] 
        B7[Aplicação: PROD 🔒 Bloqueado] 
    end

    %% Conexões
    A3 --> B1
    B1 --> B2
    B2 -- Sim --> B3
    B2 -- Não --> B4
    B1 --> B5
    B5 -- Sim --> B6
    B5 -- Não --> B7

Legenda UX:

✅ → Configurado/Obrigatório concluído

⬜ → Disponível para configuração (opcional)

🔒 → Bloqueado (não configurável porque a conta não está pronta)



---

2. Diagrama ER – Onboarding de Conta e Aplicação

Descrição:
Este diagrama mostra a estrutura de dados do sistema de onboarding, incluindo:

Tipos de autorização e ambiente

Conta e suas configurações

Aplicações e herança de configurações

Tags, provedores e aprovadores


Controle de onboarding concluído por conta


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
    BIGINT
