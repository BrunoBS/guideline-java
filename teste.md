flowchart TD
    %% Cadastro da Conta
    A[Cadastrar Conta (básico)] --> B[Configurar Conta DEV ✅ Obrigatório]
    B --> C[Configurar Conta HML ⬜ Opcional]
    B --> D[Configurar Conta PROD ⬜ Opcional]

    %% Cadastro da Aplicação
    C --> E[Cadastrar Aplicação (básico)]
    E --> F[Configurar Aplicação DEV ✅ Obrigatório] 
    F --> G{Conta HML configurada?}
    G -- Sim --> H[Configurar Aplicação HML ⬜ Opcional]
    G -- Não --> I[Botão HML bloqueado 🔒]
    F --> J{Conta PROD configurada?}
    J -- Sim --> K[Configurar Aplicação PROD ⬜ Opcional]
    J -- Não --> L[Botão PROD bloqueado 🔒]

    %% Final
    H --> M[Acesso liberado à Aplicação]
    K --> M
    I --> M
    L --> M
