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

- **View de microserviços/features:** leitura do cadastro, associação e habilitação; contrato e nome físico devem ser confirmados no Workspace.
- **`VW_AUDIT_ACCOUNT_ENVIRONMENT_FLOW`:** fornece o fluxo de ambientes por conta para criação de ciclos.

O Audit Service tem acesso **somente SELECT** às views do Workspace. Trata-se de dependência de leitura deliberada, com privilégios mínimos, versionamento de contrato e testes de integração.

O Redis é infraestrutura centralizada compartilhada, com **namespace exclusivo `audit:`**. Para cada evento, validar o par microserviço/feature por cache-aside: consultar Redis; em miss, consultar view read-only, validar associação/status e preencher cache com TTL configurável. Não criar scheduler de aquecimento. Configurações de TTL devem ter fallback local; não bloquear a auditoria por indisponibilidade do serviço de parâmetros.

Redis indisponível: tentar a view diretamente. View indisponível: falha transitória, retentativa e DLQ, **nunca** classificar como cadastro inexistente. Cadastro comprovadamente inexistente ou inativo: rejeição de negócio rastreável, não ingestão válida. Evitar cache negativo duradouro; documentar defasagem de desativação até o TTL e proteção contra misses concorrentes.

## 7. Política de auditoria por feature

A **política de auditoria** é responsabilidade do Audit Service, distinta do cadastro de feature no Workspace. É indexada pelo par microserviço/feature e pode definir `snapshotEnabled` e `cycleEnabled`. Não duplicar dados cadastrais do Workspace nem criar um segundo catálogo de features.

Para a primeira implementação, a regra de ciclo é fixa: início em `CREATED` no ambiente inicial e fim em `PUBLISHED` no ambiente final. Campos `cycleStartEvent` e `cycleEndEvent`, se materializados, devem refletir essa regra, **não** abrir generalização não aprovada.

**Decisão técnica limitada antes do DDL:** escolher persistência/configuração tipada da política (tabela interna de política por par de identidades, ou parametrização existente), com padrão conservador `snapshotEnabled=false`, `cycleEnabled=false` na ausência de política explícita. Isso não autoriza novo cadastro administrativo de features.

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
| Política por feature | Configuração própria de auditoria por identidade externa; forma de armazenamento a fechar antes do DDL. |

**Não existem** tabelas locais `AUDIT_SERVICE_TYPE` e `AUDIT_RESOURCE_TYPE`. Referências externas de microserviço/feature são atributos estáveis, não FKs cruzadas. FKs internas são permitidas para os cinco catálogos e entidades do Audit Service. Índices devem cobrir conta/recurso/tempo, operação/status/timeout, ciclo/chave única e deduplicação de evento.

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
