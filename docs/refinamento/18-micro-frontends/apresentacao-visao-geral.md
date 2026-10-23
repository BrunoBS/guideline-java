# Visão geral da arquitetura do Portal Manager

> Proposta greenfield para apresentação e alinhamento. O Shell/chassi e os MFEs ainda serão construídos. A capacidade não foi validada.

A plataforma combina quatro micro frontends, hospedados pelo Shell, com um BFF compartilhado e quatro microserviços de domínio correspondentes. O navegador mantém somente um cookie opaco. O BFF mantém a sessão e os tokens no Redis e encaminha as chamadas às APIs.

## Arquitetura em execução

~~~mermaid
flowchart TB
  subgraph FRONTEND["Frontend"]
    direction TB
    subgraph MFES["Micro frontends"]
      direction LR
      WS["Workspace MFE<br/>contas, ambientes e aplicações"]
      CFG["Configuration MFE<br/>chaves e toggles"]
      NAV["Navigation MFE<br/>menus e rotas"]
      RULES["Rules MFE<br/>regras de negócio"]
    end
    SHELL["Shell<br/>chassi, base e composição dos MFEs"]
  end

  WS -. "hospedado pelo Shell" .-> SHELL
  CFG -. "hospedado pelo Shell" .-> SHELL
  NAV -. "hospedado pelo Shell" .-> SHELL
  RULES -. "hospedado pelo Shell" .-> SHELL

  WS --> BFF["BFF único da plataforma<br/>sessão web e acesso às APIs"]
  CFG --> BFF
  NAV --> BFF
  RULES --> BFF

  BFF <--> ENTRA["Microsoft Entra ID<br/>identidade e autenticação"]
  BFF <--> REDIS[("Redis em alta disponibilidade<br/>sessão e tokens")]

  BFF --> WSAPI["Workspace Service"]
  BFF --> CFGAPI["Configuration Service"]
  BFF --> NAVAPI["Navigation Service"]
  BFF --> RULESAPI["Rules Service"]

  WSAPI --> WS
  CFGAPI --> CFG
  NAVAPI --> NAV
  RULESAPI --> RULES
~~~

**Leitura rápida:** o Shell forma a base visual e hospeda os MFEs. Cada MFE conversa com o BFF da plataforma. O BFF compartilha a sessão no Redis e direciona as operações aos serviços de domínio correspondentes.

## Comunicação entre Shell, BFF e serviços

O Shell roda no navegador. Ele não chama diretamente os microserviços de domínio nem guarda tokens. Sua comunicação com o backend serve para iniciar a experiência autenticada e consultar o estado da sessão. Depois, cada MFE inicia as chamadas de negócio do seu domínio para o mesmo BFF.

~~~mermaid
sequenceDiagram
  participant Browser as Navegador
  participant Shell as Shell e MFEs
  participant BFF as BFF da plataforma
  participant Redis as Redis
  participant Entra as Microsoft Entra ID
  participant API as Serviço de domínio

  Browser->>Shell: Baixa e inicia o Shell
  Shell->>BFF: GET /bff/session, enviando cookie se existir
  BFF->>Redis: Busca a sessão
  Redis-->>BFF: Sessão ou ausência de sessão
  BFF-->>Shell: Estado autenticado e contexto permitido, sem tokens

  opt Usuário ainda não autenticado
    Shell->>BFF: Inicia login
    BFF-->>Browser: Redireciona para autenticação
    Browser->>Entra: Usuário autentica
    Entra-->>Browser: Retorna ao callback do BFF
    Browser->>BFF: Envia o código de autorização
    BFF->>Entra: Troca o código por tokens
    Entra-->>BFF: Tokens
    BFF->>Redis: Salva sessão e tokens
    BFF-->>Browser: Define cookie opaco
  end

  Shell->>BFF: MFE chama endpoint do domínio com cookie
  BFF->>Redis: Recupera sessão e token
  BFF->>API: Chamada autenticada
  API-->>BFF: Resultado
  BFF-->>Shell: Resposta do endpoint
~~~

### Fluxo em poucas etapas

1. O navegador carrega os arquivos estáticos do Shell.
2. Na inicialização, o Shell consulta o BFF para saber se existe uma sessão e obter apenas os dados de usuário e contexto necessários à interface.
3. Se não houver sessão, o Shell inicia o login. O BFF conduz o fluxo com o Entra ID, guarda sessão e tokens no Redis e entrega ao navegador um cookie opaco.
4. Depois do login, o Shell apresenta a navegação e carrega os MFEs. Cada MFE envia suas requisições ao BFF com o cookie. O BFF recupera os tokens no Redis e chama o serviço de domínio correspondente.
5. O BFF devolve ao MFE somente a resposta da operação. Tokens de acesso não são expostos ao JavaScript do Shell nem dos MFEs.

Como proposta, o BFF pode ser publicado sob o mesmo domínio da aplicação, por exemplo em caminhos /bff/*, para simplificar o uso do cookie e reduzir a necessidade de CORS. O caminho e os endpoints mostrados são ilustrativos; os contratos serão definidos no detalhamento. As chamadas com cookie também precisam de proteção contra CSRF, e o cookie deve usar atributos seguros compatíveis com o fluxo de login.

## Responsabilidades principais

- **Shell:** hospeda e compõe os MFEs. Mantém layout, navegação global, contexto, mensagens, idioma, acessibilidade e observabilidade do frontend. Inicia e apresenta os estados de login e expiração da sessão.
- **Workspace MFE e Workspace Service:** experiência e regras de contas, ambientes e aplicações.
- **Configuration MFE e Configuration Service:** experiência e regras de chaves e toggles.
- **Navigation MFE e Navigation Service:** experiência e regras de menus e rotas.
- **Rules MFE e Rules Service:** experiência e regras de negócio.
- **BFF da plataforma:** ponto de entrada backend compartilhado. Integra autenticação com o Microsoft Entra ID, administra sessão e encaminha chamadas às APIs.
- **Redis:** armazena sessão e tokens no backend, fora das instâncias do BFF.
- **Serviços de domínio:** aplicam regras de negócio e autorização efetiva.

## Sessão e segurança

O navegador recebe e envia um cookie opaco. O frontend não lê nem armazena tokens de acesso. O BFF mantém dados de sessão e tokens no Redis e encaminha as chamadas autenticadas. A autorização efetiva permanece nos serviços de domínio. O fluxo com cookies deve incluir proteção contra CSRF.

## Fronteiras de manutenção

Os quatro MFEs e os serviços de domínio devem permitir ciclos próprios de manutenção e publicação, respeitando contratos compatíveis. Uma mudança isolada em um serviço não deve exigir a republicação dos demais.

Shell, BFF e Redis são componentes compartilhados. Mudanças no Shell e no BFF têm alcance maior e exigem compatibilidade, testes de contrato e integração, monitoramento e opção de rollback. O Shell também deve isolar falhas de um MFE para preservar as outras áreas.

## Risco compartilhado e mitigação

Como os MFEs usam o mesmo BFF, sua indisponibilidade ou sobrecarga pode afetar toda a plataforma. A proposta prevê réplicas horizontais do BFF, sessão fora das instâncias, Redis em alta disponibilidade, limites de tempo e isolamento nas chamadas às APIs, além de monitoramento e rollback.

Essas medidas são requisitos a validar, não evidência de capacidade já comprovada. A validação deve começar por uma fatia vertical com Shell, um MFE, BFF, Redis e um serviço de domínio, incluindo testes de carga, falha e recuperação.

## Enquadramento

Esta é uma visão macro de uma arquitetura greenfield para discussão e aprovação. Contratos, topologia de implantação, metas de disponibilidade e detalhes de implementação ficam para o detalhamento das próximas etapas.
