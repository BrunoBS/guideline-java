# Audit Service --- Especificação Funcional, Catálogos e Modelo de Dados

> Documento consolidado das regras de negócio definidas para a primeira
> versão do `audit-service`, revisado para incorporar o modelo
> administrativo de tipos, serviços e recursos.

------------------------------------------------------------------------

# 1. Objetivo

O `audit-service` será o serviço centralizado responsável por registrar,
correlacionar, reconciliar e consultar fatos relevantes ocorridos sobre
recursos da plataforma.

O serviço deverá permitir reconstruir:

-   o que aconteceu com um recurso;
-   o que foi solicitado em uma operação;
-   quais recursos participaram da operação;
-   qual microserviço e tipo de recurso originaram o evento;
-   quem realizou a ação;
-   quando ela ocorreu;
-   quais recursos tiveram sucesso;
-   quais tiveram falha conhecida;
-   quais não produziram um desfecho esperado;
-   como uma operação foi encerrada;
-   qual era o estado completo do recurso, quando snapshot estiver
    configurado;
-   qual ciclo de ambientes está associado ao recurso, quando ciclo
    estiver configurado.

> **Princípio central:** o Audit Service registra e reconcilia fatos de
> auditoria. Ele não executa publicação, promoção, rollback ou qualquer
> outro processo de negócio.

------------------------------------------------------------------------

# 2. Limites de responsabilidade

## 2.1 Responsabilidades

O Audit Service é responsável por:

-   registrar eventos imutáveis;
-   permitir eventos independentes de operação;
-   criar operações que agrupam eventos quando necessário;
-   criar em batch os eventos de intenção de uma operação;
-   correlacionar eventos com operação, recurso e ciclo;
-   registrar eventos de sucesso e falha;
-   reconciliar eventos antes de fechar uma operação;
-   gerar `UNHANDLED_FAILURE` quando uma operação for encerrada sem
    desfecho para algum recurso;
-   identificar e fechar operações abandonadas por timeout;
-   armazenar snapshots no S3 quando configurado para o tipo de recurso;
-   controlar ciclos internamente quando configurado para o tipo de
    recurso;
-   consultar histórico;
-   utilizar o fluxo de ambientes para resolução de ciclos;
-   fornecer mensagens e possíveis orientações associadas aos fatos
    auditados;
-   administrar os catálogos internos de tipos reconhecidos pelo Audit
    Service.

## 2.2 Fora de responsabilidade

O Audit Service não é responsável por:

-   executar publicação;
-   executar promoção;
-   executar rollback;
-   fazer retry do processo de negócio;
-   reprocessar recursos;
-   controlar fila operacional;
-   controlar execução individual por uma tabela de itens;
-   substituir logs e observabilidade;
-   armazenar stack trace;
-   diagnosticar a causa técnica de uma exceção não tratada;
-   duplicar cadastros de conta, aplicação ou ambiente;
-   funcionar como workflow engine.

------------------------------------------------------------------------

# 3. Conceitos principais

``` text
AUDIT_SERVICE_TYPE
        |
        | 1:N
        v
AUDIT_RESOURCE_TYPE
        |
        +── configuration JSON
        |      ├── snapshotEnabled
        |      └── cycleEnabled
        |
        v
    AUDIT_EVENT
        |
        +── AUDIT_OPERATION (opcional)
        +── AUDIT_CYCLE     (opcional)
        └── AUDIT_SNAPSHOT  (opcional)
```

## 3.1 Service Type

Representa o microserviço/domínio técnico reconhecido pelo Audit
Service.

Exemplos:

``` text
KEY_SERVICE
MENU_SERVICE
ROUTE_SERVICE
```

O `service type` identifica **quem é responsável/origem do recurso**, e
não o recurso em si.

## 3.2 Resource Type

Representa o tipo de recurso auditável pertencente a um serviço.

Um serviço pode possuir vários recursos.

Exemplo:

``` text
KEY_SERVICE
   ├── KEY
   └── TOGGLE
```

O comportamento técnico do recurso é definido no campo `configuration`
do próprio `AUDIT_RESOURCE_TYPE`.

## 3.3 Event

Representa um fato auditável e imutável.

Pode representar:

-   ação direta;
-   intenção;
-   sucesso;
-   falha conhecida;
-   ausência de desfecho detectada pela auditoria.

Um evento pode existir sem operação.

## 3.4 Operation

Agrupa eventos pertencentes à mesma execução quando existe necessidade
de correlação operacional, principalmente em fluxos assíncronos ou em
lote.

A operação não é workflow e não controla estado individual de item.

## 3.5 Cycle

Representa a jornada de alteração de um recurso através do fluxo de
ambientes.

É controlado internamente pelo Audit Service quando o tipo de recurso
possuir `cycleEnabled = true`.

## 3.6 Snapshot

Representa o estado completo e imutável de um recurso em determinado
momento.

É utilizado quando o tipo de recurso possuir `snapshotEnabled = true`.

------------------------------------------------------------------------

# 4. Administração de catálogos

Os tipos reconhecidos pelo Audit Service serão persistidos em tabelas
administrativas.

Catálogos:

``` text
AUDIT_SERVICE_TYPE
AUDIT_RESOURCE_TYPE
AUDIT_EVENT_TYPE
AUDIT_OPERATION_TYPE
AUDIT_OPERATION_STATUS
AUDIT_FAILURE_REASON_TYPE
AUDIT_CYCLE_STATUS
```

Essas tabelas substituem strings livres no modelo transacional.

Os registros transacionais deverão referenciar os respectivos IDs.

------------------------------------------------------------------------

# 5. Associação Service Type → Resource Type

A relação será:

``` text
AUDIT_SERVICE_TYPE 1 ─────── N AUDIT_RESOURCE_TYPE
```

Exemplo:

``` text
KEY_SERVICE
   |
   ├── KEY
   │    configuration:
   │    {
   │      "snapshotEnabled": true,
   │      "cycleEnabled": true
   │    }
   │
   └── TOGGLE
        configuration:
        {
          "snapshotEnabled": true,
          "cycleEnabled": false
        }

MENU_SERVICE
   |
   └── MENU
        configuration:
        {
          "snapshotEnabled": true,
          "cycleEnabled": true
        }

ROUTE_SERVICE
   |
   └── ROUTE
        configuration:
        {
          "snapshotEnabled": true,
          "cycleEnabled": true
        }
```

Não haverá uma tabela `AUDIT_RESOURCE_CONFIG`.

A configuração pertence ao próprio `AUDIT_RESOURCE_TYPE`.

------------------------------------------------------------------------

# 6. Configuração extensível do recurso

`AUDIT_RESOURCE_TYPE.configuration` será um campo `JSON` no MySQL.

Configuração inicial:

``` json
{
  "snapshotEnabled": true,
  "cycleEnabled": true
}
```

A configuração é interna da plataforma e administrada pelo mesmo time
responsável pelo Audit Service.

Na primeira versão:

-   não haverá schema associado ao JSON;
-   não haverá versionamento de schema;
-   não haverá tabela separada de configuração;
-   não haverá `snapshot_enabled` ou `cycle_enabled` como colunas;
-   não haverá `operationEnabled`.

O JSON permite evolução sem alteração estrutural da tabela.

Exemplo futuro:

``` json
{
  "snapshotEnabled": true,
  "cycleEnabled": true,
  "retentionDays": 180,
  "snapshotStrategy": "FULL"
}
```

Na aplicação Java, a configuração deverá ser desserializada para um
objeto tipado, evitando espalhar `Map<String, Object>` pelas regras de
domínio.

------------------------------------------------------------------------

# 7. Catálogo de eventos

## 7.1 Eventos diretos

``` text
CREATED
UPDATED
ACTIVATED
DEACTIVATED
DELETED
```

## 7.2 Publicação

``` text
PUBLISH_REQUESTED
PUBLISHED
PUBLISH_FAILED
```

## 7.3 Promoção

``` text
PROMOTION_REQUESTED
PROMOTED
PROMOTION_FAILED
```

## 7.4 Rollback

``` text
ROLLBACK_REQUESTED
ROLLBACK
ROLLBACK_FAILED
```

## 7.5 Falha sem desfecho tratado

``` text
UNHANDLED_FAILURE
```

`resource_type` e `event_type` continuam conceitos independentes.

Não serão criados tipos como:

``` text
KEY_PUBLISHED
MENU_PUBLISHED
ROUTE_PROMOTED
```

O correto conceitualmente é:

``` text
resource_type = KEY
event_type    = PUBLISHED
```

Fisicamente, as tabelas transacionais armazenarão os IDs dos catálogos.

------------------------------------------------------------------------

# 8. Modelo intenção → desfecho

Ações assíncronas possuem um evento inicial de intenção e posteriormente
exatamente um evento terminal quando a operação é fechada.

## Publicação

``` text
PUBLISH_REQUESTED
        |
        +── PUBLISHED
        +── PUBLISH_FAILED
        └── UNHANDLED_FAILURE
```

## Promoção

``` text
PROMOTION_REQUESTED
        |
        +── PROMOTED
        +── PROMOTION_FAILED
        └── UNHANDLED_FAILURE
```

## Rollback

``` text
ROLLBACK_REQUESTED
        |
        +── ROLLBACK
        +── ROLLBACK_FAILED
        └── UNHANDLED_FAILURE
```

`*_FAILED` significa que o processador encontrou uma falha conhecida e
informou explicitamente o desfecho.

`UNHANDLED_FAILURE` significa que o Audit Service precisou materializar
a ausência de um desfecho durante o fechamento/reconciliação.

------------------------------------------------------------------------

# 9. Eventos independentes de operação

Nem todo evento pertence a uma operação.

Exemplos:

``` text
KEY-123 CREATED
KEY-123 UPDATED
KEY-123 ACTIVATED
KEY-123 DEACTIVATED
```

Nesses casos:

``` text
AUDIT_EVENT.operation_id = null
```

Regra:

> **Evento pode existir sem operação. Operação existe para agrupar
> eventos de uma mesma execução.**

As regras de reconciliação, fechamento e timeout aplicam-se somente aos
eventos vinculados a uma operação.

------------------------------------------------------------------------

# 10. Criação de operação

Exemplo: publicação de 500 chaves.

``` text
1. criar AUDIT_OPERATION com status STARTED
2. criar 500 PUBLISH_REQUESTED em batch
3. confirmar a persistência da operação e das intenções
4. devolver operationUuid
5. iniciar processamento assíncrono fora do Audit Service
```

A criação da operação e das intenções é síncrona.

O processamento do negócio é assíncrono.

``` text
OPERATION + REQUESTED = SÍNCRONO

PUBLICAÇÃO / PROMOÇÃO / ROLLBACK = ASSÍNCRONO
```

O `operationUuid` somente será retornado depois que a operação e todas
as intenções estiverem persistidas.

------------------------------------------------------------------------

# 11. Processamento e desfechos

O processador registra o desfecho de cada recurso.

Exemplo:

``` text
KEY-001 PUBLISH_REQUESTED → PUBLISHED
KEY-002 PUBLISH_REQUESTED → PUBLISHED
KEY-003 PUBLISH_REQUESTED → PUBLISH_FAILED
KEY-004 PUBLISH_REQUESTED → PUBLISHED
```

Não haverá estado intermediário `PROCESSING` no Audit Service.

------------------------------------------------------------------------

# 12. Falha conhecida

Quando o processador identificar uma falha conhecida, deverá registrar o
evento terminal correspondente.

Exemplo:

``` text
KEY-003 PUBLISH_REQUESTED
KEY-003 PUBLISH_FAILED
```

O evento poderá possuir:

``` text
message
solution
```

A causa técnica detalhada permanece nos logs/observabilidade.

------------------------------------------------------------------------

# 13. Ausência temporária de desfecho

Enquanto a operação estiver `STARTED`, uma intenção pode ainda não
possuir desfecho.

Isso não é automaticamente uma falha.

``` text
KEY-001 PUBLISH_REQUESTED → PUBLISHED
KEY-002 PUBLISH_REQUESTED → ainda sem desfecho
```

O Audit Service não gera `UNHANDLED_FAILURE` apenas porque o
processamento ainda está em andamento.

------------------------------------------------------------------------

# 14. Reconciliação no fechamento

Antes de fechar uma operação, o Audit Service deverá reconciliar todas
as intenções.

Exemplo:

``` text
KEY-001 PUBLISH_REQUESTED → PUBLISHED
KEY-002 PUBLISH_REQUESTED → PUBLISHED
KEY-003 PUBLISH_REQUESTED → PUBLISH_FAILED
KEY-004 PUBLISH_REQUESTED → sem desfecho
```

No fechamento:

``` text
KEY-004 UNHANDLED_FAILURE
```

Regra:

> **REQUESTED sem desfecho é permitido somente enquanto a operação
> estiver aberta.**

------------------------------------------------------------------------

# 15. Status da operação

Catálogo inicial:

``` text
STARTED
COMPLETED
FAILED
```

Não haverá `PARTIAL`.

Uma operação é `COMPLETED` somente quando todas as intenções possuem
desfecho de sucesso.

Qualquer falha tratada ou `UNHANDLED_FAILURE` resulta em `FAILED`.

------------------------------------------------------------------------

# 16. Invariante de operação fechada

Uma operação `COMPLETED` ou `FAILED` nunca poderá possuir intenção sem
desfecho terminal correspondente.

Exemplo:

``` text
500 PUBLISH_REQUESTED

493 PUBLISHED
  5 PUBLISH_FAILED
  2 UNHANDLED_FAILURE
─────────────────────
500 desfechos
```

------------------------------------------------------------------------

# 17. Operação abandonada e scheduler

Uma operação pode permanecer `STARTED` caso o processador sofra uma
quebra inesperada e não solicite o fechamento.

O Audit Service possuirá scheduler para operações expiradas.

Conceitualmente:

``` text
status = STARTED
AND started_at < agora - operation_timeout
```

Valores iniciais de referência:

``` text
scheduler = a cada 1 hora
timeout   = 1 hora
```

Ambos serão configuráveis.

O scheduler não faz retry nem reprocessamento.

------------------------------------------------------------------------

# 18. Fechamento por timeout

Quando uma operação expirar:

``` text
1. localizar intenções
2. localizar desfechos
3. identificar intenções sem desfecho
4. gerar UNHANDLED_FAILURE para cada ausência
5. fechar operação como FAILED
6. failure_reason = TIMEOUT
7. registrar message/solution
```

`TIMEOUT` explica por que a operação foi fechada pelo Audit Service.

`UNHANDLED_FAILURE` identifica os recursos que ficaram sem desfecho.

------------------------------------------------------------------------

# 19. Concorrência no fechamento

Uma operação somente poderá ser finalizada uma vez.

Transições permitidas:

``` text
STARTED → COMPLETED
STARTED → FAILED
```

Depois de terminal, a operação não poderá ser reaberta nem ter seu
resultado alterado.

A implementação deverá garantir concorrência segura entre fechamento
solicitado pelo motor e fechamento pelo scheduler.

------------------------------------------------------------------------

# 20. Failure Reason

Catálogo inicial:

``` text
PROCESSING_FAILURE
TIMEOUT
UNHANDLED_FAILURE
```

Semântica:

``` text
PROCESSING_FAILURE
→ motor encerrou explicitamente a operação contendo falha conhecida.

TIMEOUT
→ Audit Service encerrou uma operação que permaneceu aberta além do limite.

UNHANDLED_FAILURE
→ fechamento normal encontrou recurso sem desfecho e materializou UNHANDLED_FAILURE.
```

Em sucesso:

``` text
status = COMPLETED
failure_reason = null
```

------------------------------------------------------------------------

# 21. Message e Solution

`AUDIT_OPERATION` e `AUDIT_EVENT` poderão possuir:

``` text
message
solution
```

`message` explica de forma legível o fato.

`solution` fornece orientação quando houver ação possível e pode ser
nula.

O padrão de mensagens poderá aproveitar o módulo de messaging da
plataforma.

Não serão armazenados como mensagem de auditoria:

``` text
stack trace
classe Java
linha de código
dump de exceção
detalhes internos de infraestrutura
```

------------------------------------------------------------------------

# 22. Operação como agrupador

`AUDIT_OPERATION` não terá `resource_type_id` ou `resource_id`.

Uma operação pode agrupar recursos diferentes:

``` text
OPERATION OP-100
   ├── KEY-001
   ├── KEY-002
   ├── MENU-010
   └── ROUTE-020
```

Os recursos pertencem aos eventos.

A operação poderá manter `request_id` e `package_id` para correlação com
o motor/origem.

------------------------------------------------------------------------

# 23. Rollback e versionamento

Rollback segue o mesmo modelo intenção/desfecho.

``` text
ROLLBACK_REQUESTED
        |
        +── ROLLBACK
        +── ROLLBACK_FAILED
        └── UNHANDLED_FAILURE
```

Uma operação de rollback poderá referenciar outra operação através de
`parent_operation_id`.

Rollback não sobrescreve versões anteriores.

Exemplo:

``` text
v1 CREATED
v2 UPDATED
v3 UPDATED
v4 UPDATED

rollback para conteúdo da v2
        ↓
v5 ROLLBACK
```

------------------------------------------------------------------------

# 24. Ciclo

O ciclo representa a jornada de alteração de um recurso.

O consumidor não cria nem fecha ciclos diretamente.

O Audit Service resolve o ciclo conforme:

-   conta;
-   ambiente;
-   tipo do recurso;
-   identificador do recurso;
-   `AUDIT_RESOURCE_TYPE.configuration`;
-   fluxo de ambientes.

O ciclo somente é aplicado quando:

``` json
{
  "cycleEnabled": true
}
```

Status iniciais:

``` text
OPEN
COMPLETED
```

Não haverá `CANCELLED` na primeira versão.

------------------------------------------------------------------------

# 25. Fluxo de ambientes

O Audit Service não é dono dos ambientes.

Utilizará a view read-only:

``` text
VW_AUDIT_ACCOUNT_ENVIRONMENT_FLOW
```

com:

``` text
account_id
environment_id
position
initial_environment
final_environment
```

Essa informação será utilizada principalmente para resolução de ciclos.

------------------------------------------------------------------------

# 26. Snapshot

O snapshot somente será aplicado quando a configuração do tipo de
recurso possuir:

``` json
{
  "snapshotEnabled": true
}
```

Quando aplicável, o consumidor fornece o estado completo do recurso.

O Audit Service deverá:

``` text
estado completo
      |
      v
serialização/normalização determinística
      |
      +── SHA-256
      +── size_bytes
      |
      v
upload dos mesmos bytes no S3
      |
      v
persistência dos metadados no banco
```

O snapshot é imutável.

------------------------------------------------------------------------

# 27. Consultas

Filtros esperados:

``` text
accountId
applicationId
environmentId
serviceType
resourceType
resourceId
eventType
operationUuid
actorId
período
```

As consultas de eventos serão paginadas.

Também deverá ser possível:

-   consultar uma operação;
-   localizar eventos relacionados;
-   identificar sucessos;
-   identificar falhas tratadas;
-   identificar `UNHANDLED_FAILURE`;
-   identificar motivo de encerramento.

------------------------------------------------------------------------

# 28. APIs conceituais

## Eventos

``` text
registrar evento
consultar eventos
consultar evento específico
```

## Operações

``` text
criar operação + intenções em batch
finalizar operação
consultar operação
```

## Administração

A API administrativa deverá permitir gerenciar os catálogos reconhecidos
pelo Audit Service, respeitando as regras de integridade e uso.

Principais recursos administrativos:

``` text
service types
resource types
event types
operation types
operation statuses
failure reason types
cycle statuses
```

Não haverá API pública de negócio para criação direta de:

``` text
cycle
snapshot
```

Ciclo e snapshot são comportamentos internos.

------------------------------------------------------------------------

# 29. Modelo de dados consolidado

Estruturas:

``` text
CATÁLOGOS / ADMINISTRAÇÃO

AUDIT_SERVICE_TYPE
AUDIT_RESOURCE_TYPE
AUDIT_EVENT_TYPE
AUDIT_OPERATION_TYPE
AUDIT_OPERATION_STATUS
AUDIT_FAILURE_REASON_TYPE
AUDIT_CYCLE_STATUS

TRANSACIONAL

AUDIT_OPERATION
AUDIT_EVENT
AUDIT_CYCLE
AUDIT_SNAPSHOT

INTEGRAÇÃO / LEITURA

VW_AUDIT_ACCOUNT_ENVIRONMENT_FLOW
```

A antiga `AUDIT_RESOURCE_CONFIG` foi removida.

------------------------------------------------------------------------

# 30. Relacionamentos consolidados

``` text
AUDIT_SERVICE_TYPE
        1
        |
        N
AUDIT_RESOURCE_TYPE
        |
        └── configuration JSON


AUDIT_OPERATION_TYPE     1 ───── N AUDIT_OPERATION
AUDIT_OPERATION_STATUS   1 ───── N AUDIT_OPERATION
AUDIT_FAILURE_REASON_TYPE 1 ──── N AUDIT_OPERATION


AUDIT_SERVICE_TYPE       1 ───── N AUDIT_EVENT
AUDIT_RESOURCE_TYPE      1 ───── N AUDIT_EVENT
AUDIT_EVENT_TYPE         1 ───── N AUDIT_EVENT


AUDIT_OPERATION          1 ───── N AUDIT_EVENT
                         evento pode não possuir operação

AUDIT_CYCLE              1 ───── N AUDIT_EVENT
                         evento pode não possuir ciclo

AUDIT_CYCLE_STATUS       1 ───── N AUDIT_CYCLE

AUDIT_EVENT              0 ─── 0..1 AUDIT_SNAPSHOT

AUDIT_RESOURCE_TYPE      1 ───── N AUDIT_CYCLE
AUDIT_RESOURCE_TYPE      1 ───── N AUDIT_SNAPSHOT
```

------------------------------------------------------------------------

# 31. Tabela `AUDIT_SERVICE_TYPE`

  Coluna          Tipo
  --------------- --------------
  `id`            BIGINT