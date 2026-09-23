# Workspace Lifecycle Orchestration

## 1. Objetivo

Este documento define as regras de negócio, o fluxo de lifecycle e a
arquitetura de referência da feature **Workspace Lifecycle
Orchestration**, pertencente ao domínio **Workspace**.

O objetivo é permitir que qualquer desenvolvedor implemente a feature de
forma consistente, sem precisar redescobrir regras de cascata,
quarentena, restore, purge, participantes, scheduler ou integração entre
serviços.

A regra de negócio pertence ao domínio Workspace. Os mecanismos técnicos
reutilizáveis devem ser fornecidos pela `platform-libraries`.

------------------------------------------------------------------------

## 2. Escopo

A feature coordena mudanças de lifecycle de recursos raiz e seus efeitos
sobre domínios dependentes, incluindo:

-   Workspace;
-   Application;
-   features/configurações dependentes, como Key, Rule, Route e Menu;
-   retirada e retorno de conteúdo operacional de caches/publicadores;
-   quarentena para exclusão;
-   purge físico;
-   acompanhamento dos participantes;
-   consolidação do estado dos participantes;
-   retry e idempotência.

A orquestração conhece somente **raízes de agregados expostas na borda
dos domínios**. Ela não conhece a estrutura interna desses agregados.

------------------------------------------------------------------------

## 3. Princípios

### 3.1. Lifecycle próprio e efeito de cascata são conceitos diferentes

Um recurso pode estar `ACTIVE` por decisão própria e, ao mesmo tempo,
estar operacionalmente indisponível porque um recurso pai foi inativado.

Exemplo:

``` text
Key.lifecycle        = ACTIVE
Key.cascadeLifecycle = INACTIVE
```

Isso significa que a Key continua ativa por decisão própria, mas não
pode operar enquanto a restrição herdada existir.

Essa separação impede a perda da intenção original do usuário.

### 3.2. Cascade lifecycle somente na raiz operacional do agregado

O controle de cascata não deve ser replicado em toda entidade interna.

Exemplo:

``` text
Menu                         <- lifecycle + cascadeLifecycle
 ├── MenuItem A              <- estado interno preservado
 ├── MenuItem B
 └── MenuItem C
```

Ao inativar a Application, o Menu recebe o efeito de cascata. Os itens
internos permanecem como estavam.

### 3.3. Orquestração fala com bordas; domínio cuida dos internos

Exemplo na Navigation API:

``` text
Navigation
 ├── Route                   <- participante
 └── Menu                    <- participante
      └── MenuItem           <- interno
```

O orquestrador pode exigir processamento de `MENU`, mas nunca precisa
conhecer `MenuItem`.

No purge, o core Menu sabe quais registros internos precisam ser
removidos e em qual ordem.

O mesmo vale para estruturas internas do Workspace/Application, como
configurações de ambiente, associações e publishers.

------------------------------------------------------------------------

## 4. Máquina de estados

O fluxo base é:

``` text
ACTIVE
   |
   | INACTIVATE
   v
INACTIVE
   |
   | DELETE
   v
PENDING_DELETION
   |
   | após quarentena e conclusão dos participantes
   v
PURGE
```

### 4.1. Transições obrigatórias

São válidas:

``` text
ACTIVE             -> INACTIVE
INACTIVE           -> ACTIVE
INACTIVE           -> PENDING_DELETION
PENDING_DELETION   -> INACTIVE
PENDING_DELETION   -> PURGE
```

Não são permitidas:

``` text
ACTIVE             -> PENDING_DELETION
PENDING_DELETION   -> ACTIVE
```

`INACTIVE` é obrigatoriamente o estado intermediário entre operação
normal e exclusão.

### 4.2. Cancelamento de exclusão

Se o usuário cancelar uma exclusão durante a quarentena:

``` text
PENDING_DELETION -> INACTIVE
```

O recurso nunca volta diretamente para `ACTIVE`.

Se o usuário quiser colocá-lo novamente em operação, deverá realizar
posteriormente:

``` text
INACTIVE -> ACTIVE
```

------------------------------------------------------------------------

## 5. Inativação

Inativar Workspace ou Application é uma operação com efeito cascata.

A inativação deve:

-   impedir novas publicações;
-   impedir consumo/uso operacional;
-   retirar configurações publicadas de caches e mecanismos de
    distribuição;
-   propagar a suspensão para participantes;
-   preservar o lifecycle próprio dos recursos dependentes.

Exemplo:

``` text
Antes:
Application = ACTIVE
Key A.lifecycle = ACTIVE
Key B.lifecycle = INACTIVE

Após inativar Application:
Application = INACTIVE
Key A.lifecycle = ACTIVE
Key A.cascadeLifecycle = INACTIVE
Key B.lifecycle = INACTIVE
Key B.cascadeLifecycle = INACTIVE
```

Ao reativar:

``` text
Application = ACTIVE
Key A -> volta a operar
Key B -> continua INACTIVE
```

Portanto, **cascata de inativação não deve sobrescrever o lifecycle
próprio dos filhos**.

------------------------------------------------------------------------

## 6. Exclusão e quarentena

### 6.1. Pré-condição

Somente recursos `INACTIVE` podem ser enviados para exclusão.

### 6.2. Entrada em quarentena

A solicitação de exclusão altera o recurso para:

``` text
PENDING_DELETION
```

Nesse momento o recurso já está operacionalmente indisponível, pois
obrigatoriamente passou por `INACTIVE`.

### 6.3. Prazo

A quarentena de exclusão será de **30 dias para todo o recurso**,
independentemente do ambiente.

Não haverá purge antecipado de DEV, HML ou PRD.

Isso evita restore parcial e mantém uma regra única para o usuário.

### 6.4. Durante os 30 dias

O recurso:

-   permanece congelado;
-   não pode ser usado operacionalmente;
-   não é publicado;
-   não aparece como recurso operacional disponível;
-   ainda pode ter a exclusão cancelada;
-   permanece fisicamente persistido.

### 6.5. Após os 30 dias

Ao atingir a data de purge:

-   os participantes começam a excluir fisicamente seus dados;
-   cada domínio apaga somente dados que possui;
-   cada domínio remove também sua árvore interna;
-   o processamento deve ser idempotente;
-   falhas permanecem pendentes para nova tentativa.

O root não deve ser fisicamente finalizado enquanto existirem
participantes obrigatórios pendentes.

Não existe force-delete automático somente porque o prazo expirou.

------------------------------------------------------------------------

## 7. Purge e agregados internos

O orquestrador conhece o agregado raiz, não seus filhos internos.

Exemplo:

``` text
Application
 ├── ApplicationEnvironment
 ├── ApplicationEnvironmentPublisher
 └── outras estruturas internas
```

Ao fazer purge de Application, o domínio Application é responsável por
remover toda a árvore interna.

Outro exemplo:

``` text
Menu
 ├── MenuItem
 └── associações internas
```

Ao fazer purge de Menu, o domínio Menu executa a limpeza dos itens e
associações.

Regra:

> O orquestrador determina quais agregados devem processar a operação.
> Cada agregado determina como limpar seus próprios dados internos.

------------------------------------------------------------------------

## 8. Participantes da orquestração

Participantes representam domínios/agregados que precisam confirmar o
processamento de uma operação.

Exemplos:

``` text
APPLICATION
KEY
RULE
ROUTE
MENU
```

Para exclusão de Workspace, pode existir:

``` text
Workspace operation
 ├── APPLICATION
 ├── KEY
 ├── RULE
 ├── ROUTE
 └── MENU
```

`APPLICATION` representa o domínio Application como um todo, e não uma
linha para cada Application.

O mesmo princípio vale para as demais features.

### 8.1. Descoberta de participantes

O catálogo de Features/Foundation deve informar quais domínios
participam de lifecycle para determinado tipo de recurso.

Ao criar uma operação, a lista de participantes deve ser **materializada
como snapshot**.

Uma feature adicionada posteriormente não deve ser inserida
retroativamente em uma operação iniciada anteriormente.

------------------------------------------------------------------------

## 9. Modelo central de operação

A infraestrutura central deve manter estado durável da operação.

### 9.1. `lifecycle_operation`

Estrutura conceitual mínima:

``` text
identifier
resource_type
resource_identifier
action
created_at
purge_at
```

O nome definitivo da tabela pode ser refinado na implementação, mantendo
o conceito.

### 9.2. `lifecycle_participant`

Estrutura conceitual:

``` text
identifier
operation_identifier
participant_type
status
pending_count
processed_at
```

Estados iniciais:

``` text
PENDING
COMPLETED
```

Um participante somente fica `COMPLETED` quando concluir sua
responsabilidade.

Falha de processamento não exige inicialmente um status `FAILED`: o
participante pode continuar `PENDING` e ser reprocessado.

### 9.3. `pending_count`

`pending_count` é informacional/operacional.

Ele permite apresentar, por exemplo:

``` text
KEY
status       = PENDING
pendingCount = 99
processedAt  = 2026-09-22T23:06:00
```

O contador não substitui o `status` como fonte da conclusão.

------------------------------------------------------------------------

## 10. Retry, falhas e idempotência

Todo processamento deve ser idempotente.

Se um serviço falhar:

-   não marca o participante como `COMPLETED`;
-   permanece `PENDING`;
-   tenta novamente no próximo ciclo;
-   não existe limite rígido inicial de retries.

Se um participante permanecer pendente além do prazo operacional
esperado, deve existir alerta para a equipe de plataforma/operação.

A falha de um participante não autoriza a exclusão forçada do root.

------------------------------------------------------------------------

# 11. Implementação na `platform-libraries`

## 11.1. Responsabilidades

A `platform-libraries` deve fornecer os componentes técnicos
reutilizáveis necessários para participação no lifecycle, evitando que
cada serviço implemente sua própria convenção.

A lib deve encapsular:

-   contrato do participante;
-   representação do snapshot;
-   convenção das chaves Redis;
-   publicação do snapshot;
-   scheduler diário;
-   definição do horário;
-   serialização;
-   validações;
-   idempotência auxiliar;
-   integração com Redis;
-   mecanismos comuns de observabilidade.

A regra de negócio/orquestração permanece no Workspace.

------------------------------------------------------------------------

## 11.2. Redis como canal de snapshot de estado

A arquitetura principal utilizará o Redis central já disponível na
plataforma.

Redis **não será utilizado como event bus** nesse fluxo.

Cada participante publica um **snapshot do seu estado atual**.

Exemplo conceitual:

``` text
lifecycle:participant:key
lifecycle:participant:menu
lifecycle:participant:route
lifecycle:participant:rule
```

O formato final das chaves deve ser definido e encapsulado pela lib.

Payload conceitual:

``` text
operationIdentifier
participantType
status
pendingCount
processedAt
```

A publicação seguinte sobrescreve o snapshot anterior.

Exemplo:

``` text
Dia 1:
KEY.pendingCount = 100

Dia 2:
KEY.pendingCount = 99
```

Não é necessário recuperar o valor intermediário porque o objetivo é
representar **estado atual**, não histórico de eventos.

------------------------------------------------------------------------

## 11.3. TTL

O TTL deve ser superior ao intervalo diário de atualização.

Não utilizar TTL de apenas 24 ou 25 horas com margem mínima.

Valor inicial recomendado:

``` text
48 horas
```

O `processedAt` deve permitir identificar snapshot desatualizado mesmo
que a chave ainda exista.

Se Redis ou Workspace ficarem indisponíveis durante um ciclo, o próximo
snapshot diário reconcilia o estado.

------------------------------------------------------------------------

## 11.4. Consolidação pelo Workspace

Os serviços participantes não escrevem diretamente nas tabelas centrais
de lifecycle.

Fluxo:

``` text
Participantes
    |
    | snapshot diário
    v
Redis central
    |
    | leitura/consolidação
    v
Workspace Lifecycle Orchestration
    |
    v
lifecycle_operation
lifecycle_participant
```

O Workspace é o consolidador/escritor do estado central.

Isso evita:

-   credenciais de escrita compartilhadas entre múltiplos serviços;
-   conhecimento de schema central pelos participantes;
-   acoplamento dos serviços às tabelas de orquestração.

------------------------------------------------------------------------

## 11.5. Alternativa arquitetural não implementada

Existe uma alternativa possível em que cada serviço escreve diretamente
na infraestrutura central de lifecycle por meio de um adapter da
`platform-libraries`.

Essa alternativa deve ser documentada apenas como **opção arquitetural
não implementada**.

Ela:

-   não é fallback de runtime;
-   não será acionada quando Redis estiver indisponível;
-   não deve coexistir automaticamente com o fluxo Redis.

Se futuramente Redis deixar de ser adequado, essa alternativa poderá ser
reavaliada arquiteturalmente.

------------------------------------------------------------------------

## 12. Scheduler

### 12.1. Periodicidade

A periodicidade é uma regra da plataforma:

> Cada participante deve executar obrigatoriamente uma vez por dia.

A periodicidade não pode ser alterada pelo serviço.

Não deve ser exposto um `cron` livre.

### 12.2. Horário

O serviço pode configurar somente o horário da execução diária.

Exemplo:

``` yaml
lifecycle:
  scheduler:
    execution-time: "23:15"
```

A lib transforma esse horário na configuração interna necessária.

### 12.3. Horário default

Se o serviço não configurar um horário, a lib deve calcular
automaticamente um horário estável.

O horário default deve ser:

-   determinístico;
-   baseado em identificador estável do serviço, por exemplo
    `spring.application.name`;
-   distribuído dentro de uma janela operacional;
-   igual após restart;
-   igual entre réplicas do mesmo serviço.

Exemplo conceitual:

``` text
serviceName
   -> hash estável
   -> posição dentro da janela
   -> horário diário
```

Janela inicial sugerida:

``` text
22:00 - 02:00
```

Exemplo:

``` text
keys-service       -> 22:17
navigation-service -> 23:06
rules-service      -> 00:41
menu-service       -> 01:12
```

O algoritmo definitivo deve ser estável e controlado pela lib.

------------------------------------------------------------------------

## 13. Concorrência entre réplicas

Múltiplas réplicas do mesmo serviço calcularão o mesmo horário.

Somente uma delas deve executar o ciclo diário.

Como Redis central já é infraestrutura padrão, ele pode fornecer o
**distributed lock** do scheduler.

Exemplo conceitual:

``` text
lifecycle:scheduler:lock:keys-service
```

O lock deve:

-   ser adquirido atomicamente;
-   possuir TTL/lease;
-   impedir execução concorrente;
-   ser liberado naturalmente em caso de expiração;
-   não substituir idempotência.

Regra:

> Lock reduz concorrência. Idempotência garante segurança contra
> processamento repetido.

------------------------------------------------------------------------

## 14. Schema centralizado

O estado durável da orquestração deve permanecer em schema técnico
centralizado e governado pela plataforma.

Os nomes de schema/tabelas não devem ser customizáveis por serviço.

Os participantes não devem conhecer nem acessar diretamente as tabelas
centrais na arquitetura principal.

Redis é a interface assíncrona de snapshot; Workspace é o consolidador;
o banco central é a fonte durável do progresso da orquestração.

------------------------------------------------------------------------

## 15. Fluxo completo --- inativação de Application

``` text
1. Usuário solicita INACTIVATE da Application.
2. Application muda seu lifecycle próprio para INACTIVE.
3. Operação de lifecycle é criada.
4. Participantes aplicáveis recebem/processam o efeito.
5. KEY remove conteúdo da Application do runtime/cache.
6. MENU deixa de disponibilizar/publicar o agregado afetado.
7. ROUTE deixa de disponibilizar/publicar as rotas afetadas.
8. Lifecycle próprio dos recursos dependentes é preservado.
9. Cada participante atualiza seu estado/snapshot.
10. Workspace consolida o progresso.
```

Ao reativar:

``` text
1. Usuário solicita ACTIVATE.
2. Application volta para ACTIVE.
3. Efeito de cascata é removido.
4. Recursos cujo lifecycle próprio era ACTIVE podem voltar a operar.
5. Recursos cujo lifecycle próprio era INACTIVE permanecem INACTIVE.
```

------------------------------------------------------------------------

## 16. Fluxo completo --- exclusão

``` text
ACTIVE
  |
  | usuário inativa
  v
INACTIVE
  |
  | cascata operacional concluída
  v
usuário solicita delete
  |
  v
PENDING_DELETION
  |
  | 30 dias congelado
  |
  +---- cancelamento ----> INACTIVE
  |
  | prazo atingido
  v
PURGE ELIGIBLE
  |
  | participantes processam
  v
todos COMPLETED
  |
  v
purge/finalização do root
```

------------------------------------------------------------------------

## 17. Regras obrigatórias da Golden

1.  Não existe `ACTIVE -> PENDING_DELETION`.
2.  Não existe `PENDING_DELETION -> ACTIVE`.
3.  Exclusão somente parte de `INACTIVE`.
4.  Cancelar exclusão retorna para `INACTIVE`.
5.  Quarentena de deleção é de 30 dias.
6.  Não existe purge parcial por ambiente durante a quarentena.
7.  Inativação propaga efeito operacional sem destruir lifecycle próprio
    dos dependentes.
8.  `cascadeLifecycle` pertence somente às raízes operacionais que
    participam da cascata.
9.  Entidades internas não participam diretamente da orquestração.
10. Cada domínio é responsável pela exclusão física de sua árvore
    interna.
11. Participantes são descobertos pelo catálogo e congelados como
    snapshot na criação da operação.
12. Processamento é idempotente.
13. Participante pendente é reprocessado.
14. Root não é finalizado enquanto participante obrigatório permanecer
    pendente.
15. Scheduler de participante executa obrigatoriamente uma vez por dia.
16. Serviço pode escolher horário, mas não periodicidade.
17. Sem horário configurado, a lib determina horário default estável e
    distribuído.
18. Redis é utilizado para snapshots de estado dos participantes.
19. Redis não é event bus nesse fluxo.
20. Workspace consolida os snapshots no estado central.
21. Participantes não escrevem diretamente nas tabelas centrais na
    arquitetura principal.
22. Redis pode ser usado para distributed lock entre réplicas.
23. Lock não substitui idempotência.

------------------------------------------------------------------------

## 18. Decisões de implementação ainda a fechar

Os seguintes pontos podem ser definidos durante o detalhamento técnico
sem alterar as regras deste documento:

-   nome definitivo do módulo da `platform-libraries`;
-   nomes físicos definitivos das tabelas;
-   nome físico do schema central;
-   nomenclatura definitiva de `cascadeLifecycle`;
-   algoritmo/hash específico usado para distribuir horários;
-   janela operacional default definitiva;
-   TTL definitivo do snapshot, mantendo margem superior a 24h;
-   formato exato do payload Redis;
-   convenção final das chaves Redis;
-   estratégia concreta de distributed lock no Redis;
-   métricas, logs e alertas;
-   política/SLA para participante pendente por tempo excessivo.

------------------------------------------------------------------------

## 19. Responsabilidades resumidas

``` text
Foundation
  -> catálogo de features/participantes

Workspace
  -> regra da orquestração
  -> criação e controle das operações
  -> consolidação dos snapshots
  -> estado central

platform-libraries
  -> contrato técnico
  -> scheduler
  -> Redis
  -> snapshot
  -> lock
  -> convenções e validações

Feature/Core participante
  -> processa sua borda
  -> preserva estados internos quando aplicável
  -> remove runtime/cache
  -> executa purge de sua própria árvore
  -> publica snapshot de progresso

Redis
  -> snapshots temporários
  -> coordenação/lock

MySQL central
  -> estado durável da operação e participantes
```

------------------------------------------------------------------------

## 20. Resultado esperado

Com esse modelo, uma nova feature deve conseguir participar do lifecycle
sem conhecer internamente Workspace, sem acessar suas tabelas e sem
exigir que Workspace conheça a estrutura interna da feature.

A integração ocorre por contratos de borda e infraestrutura padronizada.

A regra fundamental é:

> **Workspace orquestra o lifecycle. A plataforma fornece o mecanismo.
> Cada domínio preserva sua autonomia e cuida da própria árvore.**