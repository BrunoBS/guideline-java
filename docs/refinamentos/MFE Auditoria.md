# MFE Auditoria — Refinamento funcional e técnico

> Status: proposta de refinamento, não implementação. Complementa [Revisão Timeline.md](./Revis%C3%A3o%20Timeline.md). Nomes de tabelas, colunas e endpoints são candidatos: validar com o esquema real do Audit Service.

## 1. Objetivo e arquitetura

Centralizar no Audit MFE a investigação de recursos, eventos, operações e revisões. O Portal fornece contexto autenticado (workspace/conta, aplicação, ambiente); o MFE de feature e o MFE do motor encaminham para auditoria com filtros. O Audit Service aplica autorização no servidor e entrega projeções leves. O motor executa promoções; a auditoria registra fatos, não os executa.

**Sete telas:** (1) busca de recursos, (2) listagem/timeline de eventos, (3) detalhe de evento, (4) listagem de operações, (5) detalhe de operação, (6) listagem de revisões, (7) detalhe de revisão.

**Regras transversais**
- Timeline de uma feature **exige ambiente**; não misturar DEV/HOM/PROD.
- Detalhe de Operation consulta eventos correlacionados à operação, potencialmente de múltiplos ambientes, recursos e aplicações, mas sempre sob autorização individual e de escopo.
- Evento tem identificador estável, instante de ocorrência, tipo, contexto, recurso, origem, eventual operationId e referência a snapshot/payload; não carregar payloads grandes em listas.
- Eventos do motor (pacote criado/editado/promovido) e eventos internos da feature (criada/atualizada/publicada/desativada/reativada) são perspectivas distintas; não presumir que todo evento de feature tem operationId.
- Paginação por cursor (timestamp + id) para listas extensas; ordenar deterministicamente por occurred_at DESC, id DESC (ou ASC no histórico).
- Valores sensíveis e snapshots somente mediante autorização e mascaramento. Datas persistidas em UTC; API usa ISO-8601 com offset.
- Revisions: número exibido (R1) não garante mesma identidade/linhagem entre ambientes. Correlação entre criações independentes precisa de regra explícita e auditável.

## 2. Navegação e protótipos textuais

```text
Portal / Workspace
 ├─ Audit MFE / Recursos [busca] → Eventos do recurso [timeline] → Detalhe do evento
 │                                                      └→ Operation (quando vinculada)
 ├─ Audit MFE / Operações [busca] → Detalhe da operação → Eventos internos → Detalhe do evento
 └─ Audit MFE / Revisões [busca] → Detalhe da revisão [resumo + timeline + intervalos + histórico]
```

**Cabeçalhos compartilhados:** breadcrumb, workspace, aplicação, ambiente quando aplicável, período e ações de retorno. Estados de carregamento, vazio, erro, acesso negado e paginação em todas as listagens.

## 3. Tela 1 — Busca de recursos

**Objetivo:** encontrar uma feature/recurso para iniciar investigação. **Protótipo:** filtros no topo (workspace, aplicação, tipo de recurso, identificador/nome; ambiente opcional na busca); tabela com tipo, identificador, aplicação, ambientes conhecidos, último evento e ação “Ver eventos”. Selecionar ambiente antes de abrir timeline.

**API proposta:** `GET /audit/resources?workspaceId=&applicationId=&resourceType=&query=&cursor=&limit=`. Resposta `ResourceSearchResponse(items, nextCursor)`, itens `ResourceSummary(resourceType, resourceId, displayName, applicationId, environmentIds, lastEventAt)`. O catálogo de recursos pode vir da feature dona; se a auditoria não for fonte de verdade, nome e existência atual devem ser enriquecidos via catálogo, não inferidos do audit trail.

**SQL candidato (quando busca pelo histórico auditado):**
```sql
SELECT e.resource_type, e.resource_id, e.application_id,
       MAX(e.occurred_at) AS last_event_at
FROM audit_event e
WHERE e.workspace_id = :workspaceId AND e.application_id = :applicationId
  AND e.resource_type = :resourceType
  AND (:resourceId IS NULL OR e.resource_id = :resourceId)
GROUP BY e.resource_type, e.resource_id, e.application_id
ORDER BY last_event_at DESC, e.resource_id
LIMIT :limit;
```
Evitar `LIKE '%texto%'` em grande volume; preferir índice de busca/catálogo dedicado. Paginação por cursor requer reescrever a condição com chave agregada ou materializar índice de recursos. **Índices candidatos:** `(workspace_id, application_id, resource_type, resource_id, occurred_at)`. **Aceite:** filtro isolado por tenant, recurso correto, busca vazia, paginação estável, navegação com ambiente definido.

## 4. Tela 2 — Listagem / timeline de eventos da feature

**Protótipo:** contexto fixo de recurso e ambiente, filtros por período/tipo/origem, lista cronológica com data/hora, tipo, usuário/ator, resumo, origem, vínculo de operação; ação “Ver detalhes”. Pode alternar apresentação visual timeline/lista sem alterar contrato.

**API:** `GET /audit/resources/{resourceType}/{resourceId}/events?workspaceId=&applicationId=&environmentId=&from=&to=&type=&cursor=&limit=`; `environmentId` obrigatório. DTOs: `EventPage(items, nextCursor)`; `EventSummary(id, occurredAt, environmentId, type, origin, actor, description, operationId, revisionId)`.

```sql
SELECT e.id, e.occurred_at, e.environment_id, e.event_type,
       e.origin, e.actor_id, e.description, e.operation_id, e.revision_id
FROM audit_event e
WHERE e.workspace_id = :workspaceId
  AND e.application_id = :applicationId
  AND e.environment_id = :environmentId
  AND e.resource_type = :resourceType AND e.resource_id = :resourceId
  AND e.occurred_at >= :fromAt AND e.occurred_at < :toAt
  AND (:eventType IS NULL OR e.event_type = :eventType)
  AND (:cursorAt IS NULL OR e.occurred_at < :cursorAt
       OR (e.occurred_at = :cursorAt AND e.id < :cursorId))
ORDER BY e.occurred_at DESC, e.id DESC LIMIT :pageSizePlusOne;
```
**Índice:** `(workspace_id, application_id, environment_id, resource_type, resource_id, occurred_at, id)`. **Aceite:** nunca misturar ambientes, cursor sem duplicação, operação clicável quando presente, payload não carregado.

## 5. Tela 3 — Detalhe do evento

**Protótipo:** cabeçalho (tipo, instante, ambiente, ator), metadados/contexto, alterações anterior/resultante quando permitidas, snapshot sob demanda, operação vinculada clicável. Eventos manuais sem operação exibem “Sem operação vinculada”.

**API:** `GET /audit/events/{eventId}` → `EventDetail(id, occurredAt, workspaceId, applicationId, environmentId, resourceType, resourceId, type, origin, actor, correlationId, revisionId, operationId, metadata, snapshotAvailable)`; `GET /audit/events/{eventId}/snapshot` (ou URL temporária mediada por autorização).

```sql
SELECT e.id, e.occurred_at, e.workspace_id, e.application_id,
       e.environment_id, e.resource_type, e.resource_id, e.event_type,
       e.origin, e.actor_id, e.correlation_id, e.revision_id,
       e.operation_id, e.metadata_json, e.snapshot_ref
FROM audit_event e
WHERE e.id = :eventId AND e.workspace_id = :workspaceId;
```
**Índice:** PK `id`, e autorização validada por contexto. Snapshot pode estar em S3/Blob; nunca fazer fetch automaticamente na listagem. **Aceite:** links corretos, mascaramento, sem snapshot e operação nula tratados, usuário sem acesso recebe 403/404 conforme política.

## 6. Tela 4 — Listagem de operações

**Protótipo:** filtros por workspace, aplicação, período, tipo de operação, status, identificador e ator; tabela com início, tipo, origem/destino (quando promoção), status, contagem de eventos (se disponível), ação “Detalhar”.

**API:** `GET /audit/operations?workspaceId=&applicationId=&from=&to=&type=&status=&cursor=&limit=` → `OperationPage(items, nextCursor)`, `OperationSummary(id, type, status, startedAt, finishedAt, actor, sourceEnvironmentId, targetEnvironmentId, eventCount)`.

```sql
SELECT o.id, o.operation_type, o.status, o.started_at, o.finished_at,
       o.actor_id, o.source_environment_id, o.target_environment_id,
       o.event_count
FROM audit_operation o
WHERE o.workspace_id = :workspaceId
  AND (:applicationId IS NULL OR o.application_id = :applicationId)
  AND o.started_at >= :fromAt AND o.started_at < :toAt
  AND (:type IS NULL OR o.operation_type = :type)
  AND (:status IS NULL OR o.status = :status)
  AND (:cursorAt IS NULL OR o.started_at < :cursorAt
       OR (o.started_at = :cursorAt AND o.id < :cursorId))
ORDER BY o.started_at DESC, o.id DESC LIMIT :pageSizePlusOne;
```
**Índices:** `(workspace_id, started_at, id)`, avaliar `(workspace_id, application_id, started_at, id)` e índices seletivos por status/tipo com EXPLAIN ANALYZE. `event_count` pode ser contador mantido no write-side ou obtido sob demanda; evitar COUNT por linha. **Aceite:** paginação, filtros, status, operação sem eventos, ausência de N+1.

## 7. Tela 5 — Detalhe da operação

**Protótipo:** cabeçalho com identificador, tipo, status, início/fim, ator, pacote/origem/destino quando aplicáveis; timeline dos eventos do motor; tabela paginada dos eventos internos de features, com ambiente, recurso, ação, instante e link ao evento; ação “Exportar CSV”. Mostrar erros/resultado da execução se persistidos.

**API:** `GET /audit/operations/{operationId}` → `OperationDetail(id, type, status, startedAt, finishedAt, actor, sourceEnvironmentId, targetEnvironmentId, metadata, eventCount)`; `GET /audit/operations/{operationId}/events?cursor=&limit=` → `OperationEventPage(items, nextCursor)`; `GET /audit/operations/{operationId}/events/export?format=csv` (exportação assíncrona para grandes volumes).

```sql
SELECT o.* FROM audit_operation o
WHERE o.id = :operationId AND o.workspace_id = :workspaceId;

SELECT e.id, e.occurred_at, e.application_id, e.environment_id,
       e.resource_type, e.resource_id, e.event_type, e.description
FROM audit_event e
WHERE e.operation_id = :operationId AND e.workspace_id = :workspaceId
  AND (:cursorAt IS NULL OR e.occurred_at > :cursorAt
       OR (e.occurred_at = :cursorAt AND e.id > :cursorId))
ORDER BY e.occurred_at ASC, e.id ASC LIMIT :pageSizePlusOne;
```
**Índice:** `(workspace_id, operation_id, occurred_at, id)`. A consulta por operação atravessa ambientes, mas a autorização deve filtrar eventos não visíveis; se filtrados, não expor contagem confidencial. CSV deve respeitar exatamente o mesmo escopo autorizado, usar streaming e não incluir snapshots/segredos. **Aceite:** múltiplos ambientes e recursos, operação sem eventos, navegação bidirecional, exportação consistente, sem N+1.

## 8. Tela 6 — Listagem de revisões

**Protótipo:** recurso selecionado, filtro de período (10/30/60/90 dias), listagem das revisões mais recentes (padrão 10 por página), número exibido, identidade, primeiro/último evento, ambientes envolvidos, vínculo com promoção quando houver, ação “Detalhar revisão”. Identidades diferentes com mesmo número R1 não devem ser fundidas automaticamente.

**API:** `GET /audit/resources/{resourceType}/{resourceId}/revisions?workspaceId=&applicationId=&days=30&cursor=&limit=10` → `RevisionPage(items, nextCursor)`, `RevisionSummaryItem(revisionId, revisionNumber, firstEventAt, lastEventAt, environmentIds, hasPromotion)`.

```sql
SELECT r.id, r.revision_number, r.first_event_at, r.last_event_at,
       r.has_promotion
FROM audit_revision_index r
WHERE r.workspace_id = :workspaceId
  AND r.application_id = :applicationId
  AND r.resource_type = :resourceType AND r.resource_id = :resourceId
  AND r.last_event_at >= :fromAt
  AND (:cursorAt IS NULL OR r.last_event_at < :cursorAt
       OR (r.last_event_at = :cursorAt AND r.id < :cursorId))
ORDER BY r.last_event_at DESC, r.id DESC LIMIT :pageSizePlusOne;
```
`audit_revision_index` é **proposta de read model**, não tabela confirmada. Alternativa: agrupar audit_event por identidade/linhagem, com custo medido. **Índice:** `(workspace_id, application_id, resource_type, resource_id, last_event_at, id)`. **Aceite:** filtros e paginação, revisões independentes não misturadas, acesso ao detalhe, performance sem GROUP BY amplo por requisição.

## 9. Tela 7 — Detalhe de revisão

**Protótipo aprovado:** uma página sem abas: título/revisão e total de eventos; indicadores de início, último evento e duração total; timeline horizontal limpa com ambiente e data/hora; botão **Detalhar timeline** que expande tabela com evento, início, término e duração; histórico cronológico completo com detalhes expansíveis. HOM → DEV → HOM é válido, inclusive promoção que sobrescreve HOM mantendo R1. Último evento tem término/duração nulos; término de um evento é instante do próximo, **não duração de execução nem vigência do valor**.

**API:** `GET /audit/features/{featureId}/revisions/{revisionId}/timeline`. DTO `RevisionTimelineResponse(featureId, revisionId, revisionNumber, summary, events)`; `RevisionSummary(firstEventAt, lastEventAt, durationSeconds, eventCount)`; `RevisionEvent(eventId, environmentId, environmentName, type, origin, occurredAt, nextEventAt, intervalSeconds, operationId, description)`. JSON completo, SQL com `LEAD()`, índices, critérios e ressalva sobre identidade de revisão constam em **[Revisão Timeline.md](./Revis%C3%A3o%20Timeline.md)**, documento canônico para esta tela.

```sql
WITH scoped AS (
  SELECT e.id, e.environment_id, e.event_type, e.origin,
         e.occurred_at, e.operation_id, e.description
  FROM audit_event e
  WHERE e.workspace_id = :workspaceId
    AND e.feature_id = :featureId
    AND e.revision_lineage_id = :revisionLineageId
), sequenced AS (
  SELECT s.*, LEAD(s.occurred_at) OVER (
    ORDER BY s.occurred_at, s.id
  ) AS next_event_at FROM scoped s
)
SELECT *, TIMESTAMPDIFF(SECOND, occurred_at, next_event_at) AS interval_seconds
FROM sequenced ORDER BY occurred_at, id;
```
**Índice:** `(workspace_id, feature_id, revision_lineage_id, occurred_at, id)`; Java pode calcular intervalos em uma passagem após consulta ordenada, evitando complexidade SQL, mantendo uma ida ao banco. **Aceite:** cronologia, intervalos atravessando dias, retornos a HOM, promoção R1, último evento aberto, segurança e desempenho.

## 10. DTOs Java — contratos de referência

Os tipos abaixo são **esboços tipados**; adotar enums e IDs do domínio real. Paginação por cursor em listas; `Instant` em datas; `Long` nullable para intervalo aberto.

```java
public record CursorPage<T>(List<T> items, String nextCursor) {}
public record ResourceSummary(String resourceType, String resourceId,
    String displayName, String applicationId, List<String> environmentIds,
    Instant lastEventAt) {}
public record EventSummary(String id, Instant occurredAt, String environmentId,
    String type, String origin, String actor, String description,
    String operationId, String revisionId) {}
public record EventDetail(String id, Instant occurredAt, String workspaceId,
    String applicationId, String environmentId, String resourceType,
    String resourceId, String type, String origin, String actor,
    String correlationId, String revisionId, String operationId,
    Map<String, Object> metadata, boolean snapshotAvailable) {}
public record OperationSummary(String id, String type, String status,
    Instant startedAt, Instant finishedAt, String actor,
    String sourceEnvironmentId, String targetEnvironmentId, Long eventCount) {}
public record OperationDetail(OperationSummary summary,
    Map<String, Object> metadata) {}
public record OperationEventSummary(String id, Instant occurredAt,
    String applicationId, String environmentId, String resourceType,
    String resourceId, String type, String description) {}
public record RevisionSummaryItem(String revisionId, long revisionNumber,
    Instant firstEventAt, Instant lastEventAt,
    List<String> environmentIds, boolean hasPromotion) {}
public record RevisionTimelineResponse(String featureId, String revisionId,
    long revisionNumber, RevisionSummary summary, List<RevisionEvent> events) {}
public record RevisionSummary(Instant firstEventAt, Instant lastEventAt,
    Long durationSeconds, long eventCount) {}
public record RevisionEvent(String eventId, String environmentId,
    String environmentName, String type, String origin, Instant occurredAt,
    Instant nextEventAt, Long intervalSeconds, String operationId,
    String description) {}
```

## 11. Estratégia de performance e implementação

1. **Listas são leves e paginadas**; detalhes e snapshots sob demanda. `limit` validado e máximo configurável; `pageSize+1` para detectar próximo cursor.
2. **Uma chamada HTTP por visão principal quando útil**, mas não forçar um SQL gigante; detalhe da operação pode consultar cabeçalho e página de eventos separadamente, evitando agregações e payloads caros.
3. **Não fazer N+1** para ambientes, aplicações, atores ou operações; joins seletivos ou nomes já capturados em projeções. Avaliar read model para recursos e revisões.
4. **Índices baseados em filtro + ordenação**; testar com `EXPLAIN ANALYZE`, volume realista, diferentes cardinalidades e datas. Índices listados são candidatos, não DDL aprovado.
5. **Autorização antes de expor dados**, inclusive exportações, snapshots e eventos cross-environment. Não confiar no contexto enviado pelo frontend.
6. **Estabilidade:** eventos simultâneos ordenados por id; timestamps UTC; paginação estável sob escrita concorrente (cursor e eventual limite de snapshot temporal).
7. **Métricas:** latência p50/p95/p99, linhas examinadas, memória de resposta, quantidade de queries, tamanho do payload e cache hit se aplicável. Definir SLO antes de otimizar.
8. **Integração:** testes com MySQL 8/Testcontainers, casos de autorização, paginação, cross-environment, N+1, valores mascarados, eventos sem operação, revisões independentes e intervalos entre dias.

## 12. Critérios gerais de aceite

- As sete telas estão acessíveis pela navegação proposta; cada uma possui loading, vazio, erro e acesso negado.
- Timeline de feature respeita ambiente; Operation agrupa eventos de múltiplos ambientes autorizados.
- Evento de feature tem link para operação somente quando há vínculo; operação lista todos os eventos internos visíveis.
- Snapshot apenas no detalhe e exportação CSV no contexto de Operation, com proteção de dados.
- Revisão apresenta resumo, timeline, detalhamento sob demanda e histórico na mesma página.
- Filtros, cursores e ordenação são determinísticos; nenhuma listagem exige carga ilimitada ou consultas por item.
- Testes de integração e análise de planos de execução validam segurança e desempenho.

## 13. Decisões pendentes

1. Confirmar esquema físico real de `audit_event`, `audit_operation`, snapshots e relacionamentos com motor/feature; SQL é ilustrativo.
2. Definir identidade/linhagem de revisão para criações independentes HOM R1 e DEV R1.
3. Definir se a busca de recursos usa catálogo da feature, índice de auditoria ou busca federada.
4. Confirmar eventos de motor que aparecem no detalhe de Operation e distinção dos eventos internos.
5. Fechar autorização cross-application/cross-environment, política de segredos, limites de paginação e estratégia de CSV grande.
6. Validar nomes de rotas e contratos antes da implementação; nenhuma rota deste documento é afirmada como existente.


## Referências visuais verificadas no repositório (12/11/2026)

A branch `feat/workspace-mfe-prototype` contém um **protótipo HTML navegável**, não sete capturas de tela prontas: [protótipo de eventos de auditoria](https://github.com/BrunoBS/guideline-java/blob/feat/workspace-mfe-prototype/prototypes/audit-events/index.html). O protótipo cobre três experiências: **eventos do motor de promoção**, **histórico da feature** e **detalhe da operação**. Usa dados fictícios e não substitui os contratos finais. Também contém [Workspace MFE](https://github.com/BrunoBS/guideline-java/tree/feat/workspace-mfe-prototype/workspace-mfe), cuja [folha de estilos](https://github.com/BrunoBS/guideline-java/blob/feat/workspace-mfe-prototype/workspace-mfe/src/styles.css) é referência para a identidade visual integrada ao Portal: topbar branca, fundo claro, cartões brancos, bordas suaves, azul para ações secundárias e laranja para ação principal.

**Importante:** ainda não existem sete imagens verificadas para incorporar ao Markdown. Não usar links quebrados ou chamar mockup inexistente de captura real. Antes de inserir imagens, renderizar e capturar cada tela a partir do protótipo correspondente, salvar os arquivos em caminho versionado e só então referenciá-los com Markdown `![...](...)`.

### Matriz de reaproveitamento visual por tela

| Tela | Referência existente na branch | O que falta para imagem final |
|---|---|---|
| Busca de recursos | Padrão de filtros e tabelas do Workspace MFE | Compor busca específica de recursos e capturar |
| Listagem de eventos | `prototypes/audit-events/index.html` → Histórico da feature | Incluir filtros obrigatórios de ambiente/período e capturar |
| Detalhe do evento | Cards e links do protótipo de auditoria | Compor detalhe/snapshot e capturar |
| Listagem de operações | Tabelas paginadas do Workspace MFE | Compor filtros, status e tabela e capturar |
| Detalhe da operação | `prototypes/audit-events/index.html` → Detalhes da operação | Ajustar layout para padrão do Portal e capturar |
| Listagem de revisões | Padrão de tabelas do Workspace MFE | Compor períodos 10/30/60/90 dias e capturar |
| Detalhe da revisão | Documento `Revisão Timeline.md` | Compor página única, sem abas, e capturar |

### Regra de consistência para as sete imagens

Cada imagem deve mostrar breadcrumb, contexto de workspace/aplicação, título, filtros visíveis (quando aplicáveis), estado com dados ilustrativos e ação principal. As imagens devem representar as regras aprovadas neste documento; em particular, timeline de feature sempre filtrada por ambiente, operação com eventos entre ambientes e detalhe da revisão sem abas. Identificar visualmente como **protótipo / dados fictícios**. Não reutilizar imagens do protótipo de motor como se fossem imagens de busca de recursos ou de revisões.
