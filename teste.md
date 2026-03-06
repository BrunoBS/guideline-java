
A lógica que faz mais sentido para um fluxo fluido e consistente é:
Conta:
DEV: obrigatório (precisa para iniciar testes e herança para aplicações)
HML/PROD: opcional (usuário pode configurar agora ou depois)
Aplicação:
DEV: obrigatório (aplicação só funciona se tiver DEV configurado)
HML/PROD: opcional, mas só pode configurar se o mesmo ambiente da conta já estiver configurado
Isso garante:
Sempre há um ambiente DEV funcional para testes.
Usuário não fica travado com HML/PROD se não quiser configurar de início.
Aplicações herdam corretamente a configuração da conta.
Se quiser, posso desenhar um fluxo completo enxuto mostrando obrigatórios e opcionais para conta e aplicação. Quer que eu faça?

No modelo que faz mais sentido para uma experiência fluida, o onboarding termina quando o ambiente DEV estiver configurado, porque:
DEV é obrigatório tanto na conta quanto na aplicação.
Só com DEV configurado o usuário consegue iniciar testes e validar o funcionamento.
HML e PROD são opcionais e podem ser configurados depois, sem travar o fluxo.
Então:
✅ Onboarding concluído = DEV configurado
⬜ HML/PROD podem ser configurados depois → não bloqueiam o uso inicial da conta/aplicação.
Isso garante rapidez e consistência, sem obrigar o usuário a configurar todos os ambientes antes de usar.



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
