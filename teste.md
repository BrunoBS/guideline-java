# Fluxo de Onboarding – Portal com Botões por Ambiente

## Descrição
- Usuário cadastra conta e aplicação com **DEV obrigatório** e **HML/PROD opcionais**.  
- Aplicação só libera HML/PROD se a **conta já tiver o mesmo ambiente configurado**.  
- Tela do portal exibe **todos os ambientes lado a lado**, com botões indicando **configurado, disponível ou bloqueado**.  

## Fluxo (Mermaid)

```mermaid
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
