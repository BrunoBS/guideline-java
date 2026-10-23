# Visão macro da arquitetura do Portal Manager

> Proposta greenfield para alinhamento. Os componentes ainda serão construídos. A capacidade para milhões de acessos não foi validada.

A proposta organiza a experiência em quatro micro frontends hospedados pelo Shell. Os MFEs acessam seus domínios por um BFF compartilhado. O BFF integra a autenticação, mantém sessão e tokens no Redis e encaminha operações aos serviços de domínio.

## Arquitetura

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
    SHELL["Shell<br/>chassi e composição da experiência"]
  end

  WS -. "hospedado pelo Shell" .-> SHELL
  CFG -. "hospedado pelo Shell" .-> SHELL
  NAV -. "hospedado pelo Shell" .-> SHELL
  RULES -. "hospedado pelo Shell" .-> SHELL

  SHELL -. "sessão e inicialização" .-> BFF["BFF único da plataforma"]
  WS --> BFF
  CFG --> BFF
  NAV --> BFF
  RULES --> BFF

  BFF <--> ENTRA["Microsoft Entra ID<br/>autenticação"]
  BFF <--> REDIS[("Redis<br/>sessão e tokens")]

  BFF --> WSAPI["Workspace Service"]
  BFF --> CFGAPI["Configuration Service"]
  BFF --> NAVAPI["Navigation Service"]
  BFF --> RULESAPI["Rules Service"]
~~~

**Leitura:** o Shell monta a experiência e hospeda os MFEs. Cada MFE chama o BFF para acessar seu domínio. O BFF gerencia a sessão no backend e encaminha as operações aos serviços, que validam as regras e a autorização.

## Jornada da pessoa usuária

~~~mermaid
flowchart LR
  ENTRY["Acessa o Shell"] --> SESSION["BFF verifica a sessão"]
  SESSION --> CONTEXT["Workspace MFE seleciona workspace, ambiente e aplicação"]
  CONTEXT --> MENU["Navigation MFE apresenta menus e rotas"]
  MENU --> REMOTE["Shell carrega o MFE escolhido"]
  REMOTE --> BFF["MFE envia a chamada ao BFF"]
  BFF --> SERVICE["Serviço de domínio valida e responde"]
~~~

Se não houver sessão, o BFF conduz o login com o Entra ID e devolve o controle ao Shell. O navegador mantém somente um cookie opaco. Os tokens permanecem no backend.

## O que compõe o Shell

O Shell reúne capacidades usadas pelas áreas da plataforma. Os MFEs consomem essas capacidades por interfaces compartilhadas.

| Capacidade | Para que serve |
|---|---|
| **Composição e navegação técnica** | Mantém o layout comum, interpreta a rota da aplicação e carrega o MFE correspondente. O Shell monta a experiência; o Navigation MFE fornece menus e rotas funcionais. |
| **Experiência compartilhada** | Aplica Design System, acessibilidade e idioma de forma consistente. |
| **Sessão e contexto** | Inicia a consulta de sessão no BFF, apresenta login e expiração e mantém o contexto selecionado para a interface. Não guarda tokens nem concede autorização. |
| **Comunicação e resiliência** | Oferece padrões comuns para chamadas ao BFF, erros e observabilidade. Isola falhas no carregamento de um MFE para preservar as outras áreas. |

## Responsabilidades principais

| Parte | Responsabilidade |
|---|---|
| **Shell** | Base visual, composição dos MFEs, navegação técnica e capacidades transversais. |
| **Workspace MFE** | Seleção e experiência de workspace, ambiente e aplicação. |
| **Navigation MFE** | Menus e rotas funcionais que levam à área desejada. |
| **Configuration e Rules MFEs** | Experiências de configuração e regras, cada uma no seu domínio. |
| **BFF da plataforma** | Autenticação web, sessão compartilhada e encaminhamento das chamadas dos MFEs. |
| **Redis e Entra ID** | Redis mantém sessão e tokens no backend. Entra ID autentica a pessoa usuária. |
| **Serviços de domínio** | São donos dos dados, das regras de negócio e da autorização efetiva. |

A visibilidade de uma opção no menu não concede acesso. O serviço de domínio valida a autorização em cada operação. O contexto de workspace, ambiente e aplicação acompanha as chamadas e também deve ser validado no backend.

## Evolução e riscos compartilhados

Os MFEs e os serviços de domínio devem poder evoluir e ser publicados de forma independente, respeitando contratos compatíveis. O Shell e o BFF atendem várias áreas, então mudanças neles têm impacto mais amplo e precisam de validação integrada e rollback.

O BFF é um componente lógico compartilhado, executado com réplicas para escala e disponibilidade. Mesmo assim, falhas no BFF ou no Redis podem afetar toda a plataforma. A arquitetura deve prever isolamento de falhas, monitoramento e recuperação. Essas capacidades precisam ser demonstradas em testes.

## Pontos para detalhar depois do alinhamento

- Como os MFEs serão carregados e publicados independentemente.
- Contratos de sessão, contexto e comunicação com o BFF.
- Proteção do fluxo de autenticação baseado em cookie.
- Metas de disponibilidade, latência e carga, incluindo testes de falha e recuperação.

Esta visão apresenta os componentes, os caminhos principais e seus limites. O detalhamento técnico vem depois do alinhamento da proposta.
