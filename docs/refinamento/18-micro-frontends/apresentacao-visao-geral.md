# Visão geral da arquitetura do Portal Manager

> Proposta greenfield para discussão e alinhamento. O Shell/chassi, os MFEs e os serviços ainda serão construídos. Escala e alta disponibilidade são requisitos a validar, não capacidades já comprovadas.

A plataforma reúne quatro micro frontends hospedados pelo Shell, um BFF compartilhado e quatro microserviços de domínio. O navegador mantém apenas um cookie opaco. O BFF mantém sessão e tokens no Redis e encaminha as chamadas aos serviços.

## Visão da arquitetura

~~~mermaid
flowchart TB
  subgraph FRONTEND["Frontend no navegador"]
    direction TB
    subgraph MFES["Micro frontends"]
      direction LR
      WS["Workspace MFE<br/>workspace, ambiente e aplicação"]
      CFG["Configuration MFE<br/>chaves e toggles"]
      NAV["Navigation MFE<br/>menus e rotas funcionais"]
      RULES["Rules MFE<br/>regras de negócio"]
    end
    SHELL["Shell<br/>chassi, layout e composição dos MFEs"]
  end

  WS -. "hospedado pelo Shell" .-> SHELL
  CFG -. "hospedado pelo Shell" .-> SHELL
  NAV -. "hospedado pelo Shell" .-> SHELL
  RULES -. "hospedado pelo Shell" .-> SHELL

  SHELL -. "consulta de sessão e bootstrap" .-> BFF["BFF único da plataforma"]
  WS -->|"chamadas de domínio"| BFF
  CFG -->|"chamadas de domínio"| BFF
  NAV -->|"chamadas de domínio"| BFF
  RULES -->|"chamadas de domínio"| BFF

  BFF <--> ENTRA["Microsoft Entra ID<br/>autenticação"]
  BFF <--> REDIS[("Redis<br/>sessão e tokens")]

  BFF --> WSAPI["Workspace Service"]
  BFF --> CFGAPI["Configuration Service"]
  BFF --> NAVAPI["Navigation Service"]
  BFF --> RULESAPI["Rules Service"]
~~~

**Como ler:** o Shell hospeda os MFEs e inicia a consulta de sessão. Cada MFE chama o BFF para acessar seu domínio. O BFF mantém a sessão no Redis e encaminha as operações aos serviços. Os serviços aplicam as regras de negócio e a autorização efetiva.

## Jornada de navegação

~~~mermaid
flowchart TB
  START["Pessoa acessa a plataforma"] --> SHELL["Shell carrega e consulta a sessão"]
  SHELL --> AUTH{"Sessão válida?"}
  AUTH -->|"Não"| LOGIN["BFF conduz login pelo Entra ID"]
  AUTH -->|"Sim"| WS["Workspace MFE"]
  LOGIN --> WS
  WS --> CONTEXT["Seleciona workspace, ambiente e aplicação"]
  CONTEXT --> NAV["Navigation MFE apresenta menus e rotas funcionais"]
  NAV --> ROUTE["Pessoa seleciona uma opção"]
  ROUTE --> LOAD["Shell resolve a rota técnica e carrega o MFE de destino"]
  LOAD --> REQUEST["MFE chama o BFF"]
  REQUEST --> API["Serviço de domínio valida acesso e executa a operação"]
  API --> RESULT["BFF devolve a resposta ao MFE"]
~~~

O Shell mantém o roteador técnico e monta o MFE correspondente à rota escolhida. O Navigation MFE mantém os menus e as rotas funcionais. Workspace MFE conduz a seleção de workspace, ambiente e aplicação. A presença de um item no menu ajuda a navegação, mas não concede acesso: os serviços de domínio validam a autorização em cada operação.

## Comunicação com o backend

O Shell e os MFEs executam no navegador. O Shell consulta o BFF para inicializar a experiência e conhecer o estado da sessão. Cada MFE envia as chamadas de negócio do seu domínio ao mesmo BFF. O frontend não chama os microserviços diretamente e não recebe tokens de acesso.

### Login e sessão

~~~mermaid
sequenceDiagram
  participant Browser as Navegador
  participant Shell as Shell
  participant BFF as BFF da plataforma
  participant Redis as Redis
  participant Entra as Microsoft Entra ID

  Browser->>Shell: Carrega arquivos estáticos
  Shell->>BFF: Consulta sessão, enviando cookie se existir
  BFF->>Redis: Busca sessão
  Redis-->>BFF: Sessão ou sessão ausente
  BFF-->>Shell: Estado da sessão e contexto permitido, sem tokens

  opt Não há sessão válida
    Shell->>Browser: Inicia navegação para login
    Browser->>BFF: Abre endpoint de login
    BFF-->>Browser: Redireciona ao Entra ID
    Browser->>Entra: Pessoa autentica
    Entra-->>Browser: Redireciona ao callback do BFF
    Browser->>BFF: Entrega código de autorização
    BFF->>Entra: Troca código por tokens
    Entra-->>BFF: Retorna tokens
    BFF->>Redis: Persiste sessão e tokens
    BFF-->>Browser: Define cookie opaco
  end
~~~

### Chamada de negócio

~~~mermaid
sequenceDiagram
  participant MFE as MFE no navegador
  participant BFF as BFF da plataforma
  participant Redis as Redis
  participant API as Serviço de domínio

  MFE->>BFF: Requisição com cookie e contexto selecionado
  BFF->>Redis: Recupera sessão e token
  BFF->>API: Encaminha chamada autenticada
  API->>API: Valida autorização e regras de domínio
  API-->>BFF: Resultado
  BFF-->>MFE: Resposta da operação
~~~

Os caminhos e nomes de endpoint ainda são ilustrativos. Como proposta, o BFF pode ficar sob o mesmo domínio web, por exemplo em /bff/*, para simplificar cookies e reduzir a necessidade de CORS. O uso de cookies exige proteção contra CSRF e atributos seguros compatíveis com o fluxo de login.

## Responsabilidades e fronteiras

| Componente | Responsabilidade | Limite |
|---|---|---|
| **Shell** | Chassi, layout global, carregamento dos MFEs, roteador técnico, contexto comum, experiência de login/expiração, acessibilidade e observabilidade do frontend | Não implementa regras de domínio nem guarda tokens no navegador |
| **Workspace MFE** | Seleção e experiência de workspace, ambiente e aplicação | Não concede autorização por si só |
| **Navigation MFE** | Menus e catálogo de rotas funcionais | Não substitui o roteador técnico do Shell nem a autorização dos serviços |
| **Configuration MFE** | Experiência de chaves e toggles | Não é dono das regras de autorização |
| **Rules MFE** | Experiência de regras de negócio | Não substitui a validação no serviço |
| **BFF da plataforma** | Login web, sessão, integração com Entra ID e encaminhamento das chamadas aos serviços | Não concentra regras de negócio dos domínios |
| **Redis** | Persistência compartilhada de sessão e tokens para as instâncias do BFF | Não é fonte de regras de negócio |
| **Serviços de domínio** | Donos dos dados, regras de negócio e autorização efetiva | Não dependem de o menu esconder uma opção para proteger uma operação |
| **Microsoft Entra ID** | Autenticação da pessoa usuária | Não decide autorização de domínio no Portal Manager |

## Contexto e autorização das requisições

Após selecionar um workspace, ambiente e aplicação, o frontend envia o contexto necessário junto à chamada ao BFF. O contexto pode incluir os identificadores de workspace, ambiente e aplicação, além do correlation-id para rastrear a operação. Os nomes e o formato exato do contrato serão definidos posteriormente.

O BFF valida a sessão e encaminha a chamada autenticada. O serviço de domínio valida se a pessoa pode executar aquela operação naquele contexto. Selecionar um contexto na interface ou receber uma rota não basta para autorizar acesso.

## Manutenção, falhas e impacto compartilhado

Os quatro MFEs e os serviços de domínio devem ter ciclos próprios de manutenção e publicação, com contratos compatíveis. A forma de publicar e localizar as versões dos MFEs será definida no desenho de implantação.

O Shell, o BFF e o Redis são compartilhados. Mudanças no Shell e no BFF podem alcançar todas as áreas e precisam de testes integrados, compatibilidade, monitoramento e rollback. O Shell deve conter a falha de carregamento de um MFE e manter as outras áreas utilizáveis. O BFF deve isolar falhas e lentidão dos serviços. Indisponibilidade do BFF ou do Redis pode afetar toda a plataforma, por isso réplicas, alta disponibilidade, limites de tempo e recuperação devem ser testados.

## Decisões para o detalhamento

- Como os MFEs serão registrados, carregados e versionados em produção.
- Contratos de sessão, login, logout, expiração e renovação de tokens.
- Domínio do BFF, atributos do cookie e proteção CSRF.
- Formato e validação do contexto de workspace, ambiente e aplicação.
- Contratos e compatibilidade entre os MFEs, o BFF e os serviços.
- Metas de disponibilidade, latência e carga, com planos de teste e recuperação.

## Enquadramento

Esta é uma visão macro de uma arquitetura greenfield para discussão e aprovação. A primeira validação deve cobrir uma fatia vertical com Shell, um MFE, BFF, Redis e um serviço de domínio, incluindo navegação, autenticação, chamadas de negócio, falha e recuperação.
