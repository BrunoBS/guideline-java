# Audit Service — Especificação consolidada V4

> **Referência única para implementação — 28/10/2026.**
> Documento reescrito integralmente. V1, V2 e V3 foram usadas somente como contexto histórico. As regras abaixo são a definição vigente; não existem seções históricas com precedência, cadastros duplicados ou regras alternativas.
> **Limite de implementação:** nomes exatos das colunas das views do Workspace e atributos da anotação `@Audit` devem ser verificados no código existente, não presumidos.

## 1. Objetivo e fronteiras

O `audit-service` recebe, registra, correlaciona, reconcilia e disponibiliza histórico de eventos de recursos da plataforma. Permite identificar o fato, o recurso, a conta, a origem, o ambiente, a operação, o ciclo e o snapshot associado, quando aplicável. Não executa operações de negócio, não substitui os serviços de domínio, não é motor de workflow e não administra o cadastro de microserviços ou features.

A **Platform Audit Library** e o **Audit Service** são produtos distintos: a biblioteca captura fatos nos use cases e entrega mensagens por outbox; o serviço consome, valida, persiste, reconcilia e consulta auditorias.

## 2. Identidades e origem oficial dos cadastros

O **Workspace Service** é a fonte oficial do cadastro de **microserviços** e **features** e da associação entre eles. Exemplos: `ACCOUNT_SERVICE` com `WORKSPACE`, `APPLICATION`, `ENVIRONMENT`; outros microserviços e suas features são os que estiverem efetivamente cadastrados no Workspace.

- Uma feature pertence a um microserviço; o par **microserviço + feature** identifica o tipo funcional auditável. Não presumir unicidade global do código da feature.
- **Não criar** `AUDIT_SERVICE_TYPE` ou `AUDIT_RESOURCE_TYPE` como tabelas administrativas, nem seus CRUDs, seeds ou tabelas espelho. Esses nomes são históricos e **não integram o modelo V4**.
- Persistir nos eventos os identificadores estáveis de origem de microserviço e feature e o identificador estável do recurso. O formato físico (UUID/código e nomes das colunas) será alinhado à view real. Não criar FK entre bancos do Audit e Workspace.
- A identidade de origem do microserviço deve ser confiável (configuração/credencial do produtor), não um campo arbitrário aceito de cliente externo.
- Preservar contexto de conta, aplicação e ambiente, quando pertinente, com isolamento por conta nas consultas e operações.

## 3. Catálogos internos — conjunto definitivo

Os catálogos administrados pelo Audit Service são **somente**:

| Catálogo | Responsabilidade |
| --- | --- |
| `AUDIT_EVENT_TYPE` | Tipos de fatos e suas relações de intenção/desfecho. |
| `AUDIT_OPERATION_TYPE` | Tipos de operação agrupadora. |
| `AUDIT_OPERATION_STATUS` | `STARTED`, `COMPLETED`, `FAILED`. |
| `AUDIT_FAILURE_REASON_TYPE` | Motivos estruturados de falha, incluindo `TIMEOUT`. |
| `AUDIT_CYCLE_STATUS` | `OPEN`, `COMPLETED`. |

Não existe `AUDIT_FILE_VERSION_TYPE` nem `AUDIT_FILES_VERSION_TYPE`. O catálogo de motivos de falha é `AUDIT_FAILURE_REASON_TYPE`. Catálogos internos possuem referências locais e mensagens/códigos estáveis; não confundir com cadastro de microserviço/feature.

## 4. Eventos e catálogo de tipos

`AUDIT_EVENT` é o registro imutável de um fato. Deve conter identificador único/idempotente do evento, origem (microserviço/feature), identificador estável do recurso, tipo de evento, conta e contexto aplicável, timestamp do fato, timestamp de ingestão, correlação/causação, referência opcional à operação, ao ciclo e ao snapshot, e metadados necessários. Não armazenar snapshots grandes diretamente no evento.

Tipos essenciais: `CREATED`, `UPDATED`, `ACTIVE`, `INACTIVE`, `DELETED`, `PURGED`, `PUBLISH_REQUESTED`, `PUBLISHED`, `PUBLISH_FAILED`, `PROMOTION_REQUESTED`, `PROMOTED`, `PROMOTION_FAILED`, `ROLLBACK_REQUESTED`, `ROLLBACK`, `ROLLBACK_FAILED` e `UNHANDLED_FAILURE`. Outros tipos exigem cadastro explícito em `AUDIT_EVENT_TYPE`, não enum de domínio rigidamente acoplado.

`PUBLISH_REQUESTED → PUBLISHED | PUBLISH_FAILED`, `PROMOTION_REQUESTED → PROMOTED | PROMOTION_FAILED` e `ROLLBACK_REQUESTED → ROLLBACK | ROLLBACK_FAILED` representam intenção e desfecho. `UNHANDLED_FAILURE` é o desfecho de reconciliação quando uma intenção fica sem resultado. Eventos diretos não precisam de operação.

O serviço não altera fatos recebidos para simular resultados; registra falhas e diagnósticos de forma rastreável. Eventos duplicados não podem gerar linhas, ciclos, snapshots ou tombstones duplicados.

## 5. Captura e entrega ponta a ponta

1. Um use case de domínio anotado com `@Audit` executa a ação e grava `AUDIT_OUTBOX` na **mesma transação** da mudança de negócio.
2. O worker da Platform Audit Library processa a outbox de modo concorrente seguro e envia o snapshot bruto para storage quando aplicável.
3. O storage S3 gera notificação para SQS; a mensagem transporta identificadores e referência ao objeto, evitando payloads grandes na fila.
4. O Audit Service consome, valida origem, feature, tipo e contexto, deduplica e persiste o fato e suas associações.
5. Falhas transitórias seguem retentativas limitadas/backoff e DLQ; não se confirma processamento antes da persistência consistente.

Os atributos exatos de `@Audit`, envelopes e chaves de idempotência devem ser confirmados na implementação da biblioteca; esta especificação não inventa uma assinatura de anotação.

## 6. Integração com Workspace e Redis

Há **duas views distintas**:

- **View de microserviços/features:** leitura do cadastro, associação, habilitação e dos valores `settings.audit.snapshotEnabled`/`settings.audit.cycleEnabled` da feature, projetados obrigatoriamente como duas colunas booleanas `snapshot_enabled` e `cycle_enabled` na view; o nome físico da view deve ser confirmado no Workspace.
- **`VW_AUDIT_ACCOUNT_ENVIRONMENT_FLOW`:** fornece o fluxo de ambientes por conta para criação de ciclos.

O Audit Service tem acesso **somente SELECT** às views do Workspace. Trata-se de dependência de leitura deliberada, com privilégios mínimos, versionamento de contrato e testes de integração.

O Redis é infraestrutura centralizada compartilhada, com **namespace exclusivo `audit:`**. Para cada evento, validar o par microserviço/feature por cache-aside: consultar Redis; em miss, consultar view read-only, validar associação/status e preencher cache com TTL configurável. Não criar scheduler de aquecimento. Configurações de TTL devem ter fallback local; não bloquear a auditoria por indisponibilidade do serviço de parâmetros.

Redis indisponível: tentar a view diretamente. View indisponível: falha transitória, retentativa e DLQ, **nunca** classificar como cadastro inexistente. Cadastro comprovadamente inexistente ou inativo: rejeição de negócio rastreável, não ingestão válida. Evitar cache negativo duradouro; documentar defasagem de desativação até o TTL e proteção contra misses concorrentes.

## 7. Configurações de auditoria no settings da feature

O **Workspace é a fonte oficial** do cadastro de microserviços, features e das configurações de auditoria da feature.

Padronizar no `settings` de cada feature:

```json
{
  "settings": {
    "audit": {
      "snapshotEnabled": true,
      "cycleEnabled": true
    }
  }
}
```

Os atributos `settings.audit.snapshotEnabled` e `settings.audit.cycleEnabled` são booleanos e independentes. **Ausência de `audit` ou de um atributo equivale a `false`**. Valores de tipos inválidos devem ser rejeitados na validação do Workspace, e não interpretados silenciosamente como `true`. O contrato de settings deve ser incorporado ao schema/validação de feature do Workspace.

A **view read-only de microserviços/features do Workspace** deve expor o par estável `microservice_code`/`feature_code`, status de associação e ambos os atributos, como colunas booleanas `snapshot_enabled` e `cycle_enabled` derivadas de `settings`, com valor `false` quando ausentes. A view e a validação do JSON são implementadas no Workspace; o Audit Service consome as colunas e não interpreta o JSON. O nome físico da view depende do contrato do Workspace. A view **não é uma nova fonte de persistência**. O Audit Service consulta essa view via Redis cache-aside com namespace `audit:`, TTL configurável e fallback direto para a view se o Redis falhar. Alterações de settings seguem a mesma política de invalidação/TTL dos dados da feature; uma decisão antiga em cache não deve ser tratada como configuração permanente.

O Audit Service decide pela captura de snapshot e pela criação de ciclo a partir dos valores resolvidos da feature, **não de atributos adicionais da anotação `@Audit`**. A regra de ciclo continua fixa nesta versão: início em `CREATED` no ambiente inicial e término em `PUBLISHED` no ambiente final, somente se `cycleEnabled=true`. Não abrir ciclos retroativamente quando a flag for habilitada depois da criação, nem apagar ou reiniciar ciclos existentes quando desabilitada. Eventos continuam auditáveis independentemente dessas flags.

## 8. Operações: agrupamento e criação

`AUDIT_OPERATION` representa uma execução agrupadora, com UUID, tipo, status, contexto, início, fim e motivo/observação de falha quando aplicável. Não possui `resource_id`: uma operação pode envolver múltiplos recursos e features; eventos simples têm `operation_id=null`.

A criação síncrona de uma operação registra **`STARTED` e todas as intenções `*_REQUESTED` em uma transação**, em batch, antes de devolver o `operationUuid`. A execução do negócio acontece fora do Audit Service, normalmente de forma assíncrona. Não confundir sucesso na criação da operação com sucesso da execução.

Cada intenção possui chave estável de correlação e exige **exatamente um desfecho terminal**. Desfechos duplicados não alteram a operação; desfechos contraditórios devem ser diagnosticados, não sobrescritos silenciosamente.

## 9. Reconciliação e fechamento de operações

`STARTED → COMPLETED | FAILED` é transição terminal, única e concorrente segura. **Não existe `PARTIAL`.**

- `COMPLETED` somente se **todas** as intenções tiverem desfecho de sucesso.
- Qualquer desfecho de falha torna a operação `FAILED`.
- Intenções sem desfecho ao fechar geram `UNHANDLED_FAILURE` idempotente, e a operação termina `FAILED`.
- O scheduler de timeout localiza operações abandonadas, materializa ausências como `UNHANDLED_FAILURE`, marca motivo `TIMEOUT` e fecha como `FAILED`.
- Intervalo e timeout são configuráveis com defaults locais. O scheduler não executa retentativa de negócio.
- Locks/atualização condicional e índices devem impedir corrida entre consumidor, fechamento normal e scheduler. Operações fechadas **nunca reabrem**.

Falha conhecida usa `AUDIT_FAILURE_REASON_TYPE`, mensagem e solução/observação quando disponíveis. Não inventar desfecho de sucesso por ausência de erro.

## 10. Ciclo: um por recurso durante toda a vida

`AUDIT_CYCLE` mede **lead time do recurso até a primeira publicação no ambiente final**. Há **no máximo um ciclo por recurso em toda sua existência**, não um ciclo por versão, operação ou publicação.

A chave lógica única é **conta + microserviço + feature + identificador estável do recurso**. Criar ciclo **somente** no primeiro `CREATED` observado no ambiente inicial, com `cycleEnabled=true`. Não criar retroativamente a partir de `UPDATED`, `PROMOTED` ou `PUBLISHED`.

Na criação, consultar `VW_AUDIT_ACCOUNT_ENVIRONMENT_FLOW` e **congelar** `initial_environment_id`, `final_environment_id` e `started_at`. O fluxo posterior da conta não altera um ciclo existente. Status inicial `OPEN`.

Eventos intermediários do mesmo recurso podem apontar para o ciclo. **Encerrar exclusivamente no primeiro `PUBLISHED` no ambiente final congelado**, registrando `completed_at` e `COMPLETED`. `PROMOTED` no ambiente final **não** encerra. O cálculo de lead time é `completed_at - started_at`.

Depois de concluído, **não reabrir nem criar outro ciclo**. Eventos posteriores seguem auditados, sem alterar o marco de conclusão. Eventos fora de ordem e ausência de `CREATED` devem ser diagnosticados; timestamps de origem, idempotência e consistência de ordem precisam ser respeitados.

Exemplo `KEY-001`: `CREATED DEV` abre → `PUBLISHED DEV` mantém aberto → `PROMOTED HOM` mantém aberto → `PUBLISHED HOM` mantém aberto → `PROMOTED PROD` mantém aberto → **`PUBLISHED PROD` conclui**. Novo `UPDATED PROD` não reabre.

## 11. Snapshots e versionamento

`AUDIT_SNAPSHOT` armazena **referências e metadados** do objeto imutável no S3 (bucket, key, versionId quando aplicável, SHA-256, tamanho e correlação). O conteúdo integral não fica em colunas grandes de evento. A captura depende da política `snapshotEnabled` e do contrato da biblioteca. Recuperação ocorre sob demanda, com autorização e tratamento de objeto ausente/retido. Rollback e publicação podem referenciar versões/snapshots existentes; não reescrever snapshots históricos.

## 12. Exclusão física, PURGED e tombstone

`DELETED` é distinto de `PURGED`. O evento `PURGED` sinaliza remoção física do recurso de origem e exige, **na mesma transação da ingestão**, registro de `AUDIT_EVENT` e `AUDIT_DELETED_RESOURCE` (tombstone de rastreabilidade mínima).

`AUDIT_DELETED_RESOURCE` conserva identidade estável do recurso, conta, microserviço, feature, contexto mínimo, data de purge, referência ao evento e informação de retenção. Não guardar payload integral desnecessário. Unicidade lógica e idempotência impedem tombstones duplicados; reentrega não pode alterar a história.

A consulta pós-exclusão deve conseguir localizar a ocorrência e o tombstone mesmo após desaparecimento do recurso do banco de origem. Retenção e eventual expurgo de tombstone seguem política explícita, sem confundir remoção do recurso com remoção imediata da trilha de auditoria.

## 13. Retenção e tarefas agendadas

Existem **dois schedulers funcionais distintos**: (a) timeout/reconciliação de operações; (b) retenção/limpeza de tombstones expirados. Ambos exigem concorrência segura, idempotência, métricas e limites de execução.

**Não existe scheduler de cache** na versão inicial. A limpeza por retenção respeita janela configurada e preserva integridade das referências exigidas. Retenção de objetos S3 e registros de auditoria deve ser coerente; falhas de limpeza são retentáveis e observáveis.

## 14. Modelo de dados lógico — sem duplicações

| Entidade | Conteúdo e vínculos |
| --- | --- |
| `AUDIT_EVENT` | Fato imutável, identidades externas de origem, contexto, `event_type_id`, `operation_id?`, `cycle_id?`, `snapshot_id?`. |
| `AUDIT_OPERATION` | Tipo, status, contexto, timestamps, falha; agrupa eventos, sem `resource_id`. |
| `AUDIT_CYCLE` | Identidade única por recurso, status, ambientes inicial/final congelados, timestamps. |
| `AUDIT_SNAPSHOT` | Metadados e referência S3, sem payload integral. |
| `AUDIT_DELETED_RESOURCE` | Tombstone mínimo do evento `PURGED`. |
| `AUDIT_EVENT_TYPE` | Catálogo interno de tipos de eventos. |
| `AUDIT_OPERATION_TYPE` | Catálogo interno de tipos de operação. |
| `AUDIT_OPERATION_STATUS` | Catálogo interno de status de operação. |
| `AUDIT_FAILURE_REASON_TYPE` | Catálogo interno de motivos de falha. |
| `AUDIT_CYCLE_STATUS` | Catálogo interno de status de ciclo. |
| Configuração da feature (externa) | `settings.audit.snapshotEnabled` e `settings.audit.cycleEnabled` armazenados no Workspace e expostos por sua view. |

**Não existem** tabelas locais `AUDIT_SERVICE_TYPE` e `AUDIT_RESOURCE_TYPE`. Referências externas de microserviço/feature são atributos estáveis, não FKs cruzadas. FKs internas são permitidas para os cinco catálogos e entidades do Audit Service. Índices devem cobrir conta/recurso/tempo, operação/status/timeout, ciclo/chave única e deduplicação de evento.


## 14.1 Convenções físicas do MySQL 8.4

Esta seção integra a V4 e **não cria um modelo alternativo**. Nomes abaixo são o modelo físico proposto para implementação, sujeito apenas à conferência do contrato de identificadores do Workspace e da biblioteca. `id BIGINT UNSIGNED AUTO_INCREMENT` é PK técnica; `identifier BINARY(16)` é UUID público, com conversão consistente na aplicação; timestamps são `DATETIME(6)` UTC; colunas `*_code` de identidade externa são `VARCHAR(100)` com comparação estável e case-sensitive. `account_identifier`, `application_identifier` e `environment_identifier` representam identificadores externos, sem FK entre bancos. Todas as FKs abaixo são **somente internas**.

A identidade externa de microserviço/feature é persistida como `microservice_code` + `feature_code` enquanto o contrato da view não confirmar identificadores imutáveis de origem. **Não executar migração física para UUID sem confirmar o contrato real.** O recurso é identificado por `resource_identifier BINARY(16)`, conforme padrão de identifiers públicos da plataforma.

### 14.2 Catálogos — definição de colunas e seeds

Os **cinco** catálogos usam a estrutura uniforme abaixo, com nome próprio de tabela. `code` é estável, único e não pode ser renomeado após uso; `active=false` impede novos usos, sem invalidar histórico.

| Tabela | Colunas (além de `id BIGINT UNSIGNED PK`) | Chaves e índices |
| --- | --- | --- |
| `AUDIT_EVENT_TYPE` | `code VARCHAR(60) NOT NULL`, `description VARCHAR(255)`, `active BOOLEAN NOT NULL DEFAULT TRUE`, `created_at DATETIME(6) NOT NULL` | `UNIQUE(code)` |
| `AUDIT_OPERATION_TYPE` | `code VARCHAR(60) NOT NULL`, `description VARCHAR(255)`, `active BOOLEAN NOT NULL DEFAULT TRUE`, `created_at DATETIME(6) NOT NULL` | `UNIQUE(code)` |
| `AUDIT_OPERATION_STATUS` | `code VARCHAR(40) NOT NULL`, `description VARCHAR(255)`, `active BOOLEAN NOT NULL DEFAULT TRUE`, `created_at DATETIME(6) NOT NULL` | `UNIQUE(code)` |
| `AUDIT_FAILURE_REASON_TYPE` | `code VARCHAR(60) NOT NULL`, `description VARCHAR(255)`, `active BOOLEAN NOT NULL DEFAULT TRUE`, `created_at DATETIME(6) NOT NULL` | `UNIQUE(code)` |
| `AUDIT_CYCLE_STATUS` | `code VARCHAR(40) NOT NULL`, `description VARCHAR(255)`, `active BOOLEAN NOT NULL DEFAULT TRUE`, `created_at DATETIME(6) NOT NULL` | `UNIQUE(code)` |

**Seeds iniciais** (IDs numéricos não são contratos e não devem ser fixados em código):

| Catálogo | `code` inicial |
| --- | --- |
| `AUDIT_EVENT_TYPE` | `CREATED`, `UPDATED`, `ACTIVATED`, `DEACTIVATED`, `ACTIVE`, `INACTIVE`, `DELETED`, `PURGED`, `PUBLISH_REQUESTED`, `PUBLISHED`, `PUBLISH_FAILED`, `PROMOTION_REQUESTED`, `PROMOTED`, `PROMOTION_FAILED`, `ROLLBACK_REQUESTED`, `ROLLBACK`, `ROLLBACK_FAILED`, `UNHANDLED_FAILURE` |
| `AUDIT_OPERATION_TYPE` | `PUBLISH`, `PROMOTION`, `ROLLBACK` |
| `AUDIT_OPERATION_STATUS` | `STARTED`, `COMPLETED`, `FAILED` |
| `AUDIT_FAILURE_REASON_TYPE` | `PROCESSING_FAILURE`, `TIMEOUT`, `UNHANDLED_FAILURE` |
| `AUDIT_CYCLE_STATUS` | `OPEN`, `COMPLETED` |

`ACTIVE/INACTIVE` e `ACTIVATED/DEACTIVATED` aparecem como nomenclaturas usadas no histórico; antes de popular o banco, conferir quais são efetivamente emitidas pela biblioteca e pelos domínios. Não tratar sinônimos como o mesmo evento silenciosamente.

### 14.3 Tabela `AUDIT_OPERATION`

| Coluna | Tipo / regra |
| --- | --- |
| `id` | `BIGINT UNSIGNED` PK |
| `identifier` | `BINARY(16) NOT NULL UNIQUE` |
| `account_identifier` | `BINARY(16) NOT NULL` |
| `application_identifier`, `environment_identifier` | `BINARY(16) NULL` |
| `operation_type_id` | `BIGINT UNSIGNED NOT NULL`, FK `AUDIT_OPERATION_TYPE(id)` |
| `status_id` | `BIGINT UNSIGNED NOT NULL`, FK `AUDIT_OPERATION_STATUS(id)` |
| `failure_reason_type_id` | `BIGINT UNSIGNED NULL`, FK `AUDIT_FAILURE_REASON_TYPE(id)` |
| `actor_identifier` | `VARCHAR(150) NULL` |
| `correlation_id` | `VARCHAR(100) NULL` |
| `observation` | `TEXT NULL` |
| `started_at`, `created_at` | `DATETIME(6) NOT NULL` |
| `completed_at` | `DATETIME(6) NULL` |
| `version` | `BIGINT NOT NULL DEFAULT 0` (controle otimista) |

Índices: `UNIQUE(identifier)`; `(status_id, started_at)` para timeout; `(account_identifier, started_at)`; `(correlation_id)`. Não existe `resource_id` nesta tabela.

### 14.4 Tabela `AUDIT_CYCLE`

| Coluna | Tipo / regra |
| --- | --- |
| `id` | `BIGINT UNSIGNED` PK |
| `identifier` | `BINARY(16) NOT NULL UNIQUE` |
| `account_identifier` | `BINARY(16) NOT NULL` |
| `microservice_code`, `feature_code` | `VARCHAR(100) NOT NULL` cada |
| `resource_identifier` | `BINARY(16) NOT NULL` |
| `status_id` | `BIGINT UNSIGNED NOT NULL`, FK `AUDIT_CYCLE_STATUS(id)` |
| `initial_environment_identifier` | `BINARY(16) NOT NULL` |
| `final_environment_identifier` | `BINARY(16) NOT NULL` |
| `started_at`, `created_at` | `DATETIME(6) NOT NULL` |
| `completed_at` | `DATETIME(6) NULL` |
| `version` | `BIGINT NOT NULL DEFAULT 0` |

**Restrição central:** `UNIQUE(account_identifier, microservice_code, feature_code, resource_identifier)` impede segundo ciclo, inclusive após conclusão. Índices `(status_id, started_at)` e `(account_identifier, resource_identifier)`. `completed_at` só pode ser preenchido após `PUBLISHED` no ambiente final congelado; a transição é protegida por atualização condicional/lock.

### 14.5 Tabela `AUDIT_SNAPSHOT`

| Coluna | Tipo / regra |
| --- | --- |
| `id` | `BIGINT UNSIGNED` PK |
| `identifier` | `BINARY(16) NOT NULL UNIQUE` |
| `account_identifier` | `BINARY(16) NOT NULL` |
| `microservice_code`, `feature_code` | `VARCHAR(100) NOT NULL` |
| `resource_identifier` | `BINARY(16) NOT NULL` |
| `resource_version` | `BIGINT NULL` (versão de negócio, se houver) |
| `bucket` | `VARCHAR(255) NOT NULL` |
| `object_key` | `VARCHAR(1024) NOT NULL` |
| `object_version_id` | `VARCHAR(255) NULL` |
| `sha256` | `CHAR(64) NOT NULL` |
| `size_bytes` | `BIGINT UNSIGNED NOT NULL` |
| `created_at` | `DATETIME(6) NOT NULL` |

Índices: `UNIQUE(identifier)`; `(account_identifier, microservice_code, feature_code, resource_identifier, created_at)`; `(bucket, object_key(191))`. Deduplicação de snapshot por identificador estável de origem; `resource_version` não é necessariamente único após rollback.

### 14.6 Tabela `AUDIT_EVENT`

| Coluna | Tipo / regra |
| --- | --- |
| `id` | `BIGINT UNSIGNED` PK |
| `identifier` | `BINARY(16) NOT NULL UNIQUE` (idempotência do evento) |
| `account_identifier` | `BINARY(16) NOT NULL` |
| `application_identifier`, `environment_identifier` | `BINARY(16) NULL` |
| `microservice_code`, `feature_code` | `VARCHAR(100) NOT NULL` |
| `resource_identifier` | `BINARY(16) NOT NULL` |
| `event_type_id` | `BIGINT UNSIGNED NOT NULL`, FK `AUDIT_EVENT_TYPE(id)` |
| `operation_id` | `BIGINT UNSIGNED NULL`, FK `AUDIT_OPERATION(id)` |
| `cycle_id` | `BIGINT UNSIGNED NULL`, FK `AUDIT_CYCLE(id)` |
| `snapshot_id` | `BIGINT UNSIGNED NULL`, FK `AUDIT_SNAPSHOT(id)` |
| `intent_identifier` | `BINARY(16) NULL` (mesma correlação da intenção e de seu desfecho) |
| `actor_identifier` | `VARCHAR(150) NULL` |
| `correlation_id`, `causation_id`, `trace_id` | `VARCHAR(100) NULL` |
| `resource_version` | `BIGINT NULL` |
| `metadata` | `JSON NULL` |
| `message`, `solution` | `TEXT NULL` |
| `occurred_at`, `created_at` | `DATETIME(6) NOT NULL` |

Índices: `UNIQUE(identifier)`; `(account_identifier, microservice_code, feature_code, resource_identifier, occurred_at)`; `(operation_id, intent_identifier)`; `(cycle_id, occurred_at)`; `(account_identifier, occurred_at)`; `(correlation_id)`. Eventos são imutáveis; associação técnica de ciclo/snapshot pode ser preenchida de modo idempotente durante a ingestão. A regra de **um desfecho por intenção** deve ser aplicada por transação e constraint adequada ao contrato de eventos, sem `UNIQUE(operation_id, intent_identifier)` indiscriminado (isso bloquearia a própria dupla intenção/desfecho).

### 14.7 Tabela `AUDIT_DELETED_RESOURCE`

| Coluna | Tipo / regra |
| --- | --- |
| `id` | `BIGINT UNSIGNED` PK |
| `identifier` | `BINARY(16) NOT NULL UNIQUE` |
| `account_identifier` | `BINARY(16) NOT NULL` |
| `application_identifier` | `BINARY(16) NULL` |
| `microservice_code`, `feature_code` | `VARCHAR(100) NOT NULL` |
| `resource_identifier` | `BINARY(16) NOT NULL` |
| `resource_name` | `VARCHAR(255) NULL` |
| `purge_event_id` | `BIGINT UNSIGNED NOT NULL`, FK `AUDIT_EVENT(id)` |
| `deleted_at`, `retention_purge_at`, `created_at` | `DATETIME(6) NOT NULL` |

Restrições: `UNIQUE(identifier)`; `UNIQUE(purge_event_id)`; `UNIQUE(account_identifier, microservice_code, feature_code, resource_identifier)`. Índice `(retention_purge_at)` para limpeza em batch. `deleted_at` é a remoção física; `retention_purge_at` é a expiração da retenção, não um segundo evento de negócio.

### 14.8 Origem das configurações de auditoria da feature

Os atributos `snapshotEnabled` e `cycleEnabled` residem em `settings.audit` da feature no Workspace, ambos booleanos com default lógico `false`.

A view de microserviços/features deve fornecer `microservice_code`, `feature_code`, status e as projeções booleanas `snapshot_enabled` e `cycle_enabled`. O Audit Service consulta essas configurações pela view e utiliza cache Redis com namespace `audit:`. A implementação da view e da validação de `settings.audit` é uma alteração no Workspace. A projeção deve extrair os dois booleanos do JSON e aplicar `false` para propriedades ausentes, sem mascarar tipos inválidos; a expressão SQL exata depende do schema real da feature. Sem configuração, os dois valores são `false`. A política não altera os cinco catálogos internos nem as tabelas transacionais descritas acima.

### 14.9 Relacionamentos e integridade

```text
Workspace (views read-only; SEM FK entre bancos)
  microservice + feature + settings.audit (somente Workspace)
                         --> AUDIT_EVENT
                         --> AUDIT_CYCLE (um por recurso)
                         --> AUDIT_SNAPSHOT
                         --> AUDIT_DELETED_RESOURCE

AUDIT_EVENT_TYPE        1 -- N AUDIT_EVENT
AUDIT_OPERATION_TYPE    1 -- N AUDIT_OPERATION
AUDIT_OPERATION_STATUS  1 -- N AUDIT_OPERATION
AUDIT_FAILURE_REASON_TYPE 1 -- N AUDIT_OPERATION
AUDIT_CYCLE_STATUS      1 -- N AUDIT_CYCLE

AUDIT_OPERATION         1 -- N AUDIT_EVENT (opcional)
AUDIT_CYCLE             1 -- N AUDIT_EVENT (opcional)
AUDIT_SNAPSHOT          1 -- N AUDIT_EVENT (opcional)
AUDIT_EVENT             1 -- 0..1 AUDIT_DELETED_RESOURCE (PURGED)
```

**Transações obrigatórias:** evento + criação/conclusão de ciclo; evento `PURGED` + tombstone; operação + intenções; fechamento de operação + `UNHANDLED_FAILURE` necessários. Os identificadores de conta, aplicação, ambiente, microserviço e feature são referências externas sem FK local. Índices e constraints devem ser testados em MySQL real via Testcontainers.

## 15. APIs e consultas

A entrada principal de eventos é **mensageria**, não um CRUD público de fatos. Consultas devem permitir histórico por conta, microserviço/feature, recurso, aplicação/ambiente quando aplicável, operação, ciclo e intervalo temporal; consultar snapshots/tombstones com autorização.

APIs de operação podem criar agrupadores e intenções de forma transacional e consultar seu estado. APIs administrativas limitam-se aos catálogos **internos** e à política de auditoria, conforme autorização; **não** expor CRUD de microserviços ou features. Detalhes de rotas, paginação e DTOs serão padronizados com os contratos existentes antes da implementação HTTP.

## 16. Consistência, falhas e segurança

- Isolamento por conta e autorização de leitura/escrita; validar identidade de origem e contexto.
- Deduplicação transacional por identificador de evento e chave de intenção/desfecho; evitar side effects repetidos.
- Transações atômicas para evento/ciclo e evento/tombstone, com controle de concorrência.
- Mensagens fora de ordem: diagnóstico/reprocessamento, nunca criar início fictício nem concluir ciclo sem origem válida.
- Falha transitória de Workspace/Redis/S3/DB/fila: retentativa e DLQ, não perda silenciosa nem falso cadastro inexistente.
- Logs estruturados, correlationId, métricas de latência, falhas, retries, DLQ, cache, operações e ciclos; não registrar segredos ou snapshots integrais em logs.
- SQL parametrizado, privilégios mínimos, limites de payload, índices e testes de concorrência.

## 17. Critérios de aceite e escopo de implementação

1. O Workspace é o único dono de microserviços/features; não há cadastros duplicados no Audit Service.
2. Os cinco catálogos internos são únicos e coerentes com eventos, operações e ciclos.
3. Cache Redis `audit:` funciona com hit/miss, TTL, fallback à view e falhas corretamente classificadas, sem scheduler de cache.
4. `@Audit` + outbox + storage + SQS + consumidor persistem eventos idempotentes.
5. Operação cria intenções atomicamente, reconcilia desfechos, fecha `COMPLETED` ou `FAILED`, sem `PARTIAL`, com timeout seguro.
6. Ciclo único inicia somente em `CREATED` inicial e termina somente em `PUBLISHED` final; `PROMOTED` não conclui; nunca reabre.
7. Snapshot é imutável e referenciado; `PURGED` cria tombstone atômico; retenção opera com scheduler separado.
8. Testes cobrem duplicidade, concorrência, ordem, isolamento, cache, falhas de infraestrutura, operação, ciclo e purge.
9. **Antes do primeiro DDL**, conferir schema real das duas views, identificadores externos, assinatura `@Audit` e mecanismo de persistência da política de auditoria. São contratos de implementação, **não** autorização para reabrir regras de negócio.

## 18. Regra de governança

Esta V4 é a **única referência vigente** para implementação do Audit Service. V1, V2 e V3 são apenas histórico e não devem ser mescladas ao código nem usadas para restaurar tabelas, comportamentos ou exemplos conflitantes. Mudanças futuras exigem decisão explícita e alteração pontual desta especificação, não anexos contraditórios.
