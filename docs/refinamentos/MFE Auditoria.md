# Audit MFE — refinamento funcional, navegação e contratos técnicos

> **Status:** proposta funcional e técnica para revisão. Atualizado em 12/11/2026. Este documento descreve comportamento esperado; rotas, DTOs, tabelas e índices são **candidatos**, não implementação confirmada. Validar o esquema físico e contratos existentes do Audit Service antes de codificar. Documento complementar: [Revisão Timeline.md](./Revis%C3%A3o%20Timeline.md).

## 1. Contexto, problema e objetivo

A Golden Platform possui recursos de diferentes domínios (por exemplo, contas e configurações), operações do motor de promoção e eventos produzidos pelas features. Uma investigação precisa responder: **o que mudou, em qual recurso, em qual aplicação/ambiente, quando, por quem, por qual operação e, quando existir versionamento, em qual revisão?** Sem navegação correlacionada, o usuário precisa reconstruir manualmente essas relações.

O **Audit MFE** é uma interface de investigação e rastreabilidade, não de edição, execução de promoção ou administração de recursos. O Portal fornece o contexto autenticado; o Audit Service valida o escopo no servidor, consulta o histórico e retorna projeções apropriadas a cada tela. A UI não deve deduzir autorização de parâmetros de URL.

**Sete telas:** 1. Busca de recursos; 2. Eventos do recurso/feature; 3. Detalhe do evento; 4. Operações; 5. Detalhe da operação; 6. Revisões; 7. Detalhe da revisão.

## 2. Decisões funcionais e semântica do domínio

1. **Aplicação obrigatória na busca de recursos.** O usuário deve saber em qual aplicação investigar; não disponibilizar opção "todas as aplicações" nessa busca. Workspace/conta é obtido do contexto autenticado.
2. **Tipo de recurso** é filtro explícito. Identificador/nome permite refinar; a estratégia de busca por nome depende do catálogo disponível.
3. **Evento é universal; revisão não.** Recursos sem fluxo de promoção/versionamento, como uma conta comum, podem gerar eventos sem `revisionId`. Para recursos versionados/promovíveis, a revisão é criada na criação da feature/recurso e avança nas alterações relevantes; a promoção **transporta a revisão existente** ao destino, sem criar nova revisão só pelo transporte. Definir com o domínio exatamente quais mudanças geram nova revisão (valor, status etc.).
4. **Operação é vínculo opcional do evento.** Uma alteração manual pode não pertencer a operação. Uma promoção pode produzir vários eventos de features, cada qual com seu recurso, ambiente e revisão.
5. **Eventos do motor e eventos das features não são a mesma coisa.** A operação representa a execução/ação do motor (ex.: criar pacote, editar pacote, promover); os eventos internos representam efeitos nos recursos. A UI os distingue claramente, inclusive no detalhe da operação.
6. **Revisão é identificada por ID/linhagem, não pelo rótulo R1/R2.** Mesmo número em ambientes ou criações independentes não implica mesma identidade. Uma promoção deve preservar a referência da revisão que transporta; uma consulta de timeline multiambiente exige correlação auditável.
7. **Histórico de recurso é contextualizado por ambiente.** A tela 2 exige um ambiente escolhido antes de consultar os eventos; não misturar DEV/HOM/PROD no mesmo histórico de feature. O detalhe de operação pode atravessar ambientes autorizados.
8. **Rastreabilidade bidirecional.** Recurso → eventos → evento → revisão (se houver) / operação (se houver); operação → eventos internos → evento → recurso / revisão; revisão → eventos → evento. Links devem preservar contexto e permitir retorno.
9. **Nenhuma listagem carrega payload/snapshot completo.** Snapshots e valores anteriores/novos somente sob demanda, autorizados e mascarados.
10. **Filtros e resultados são paginados.** Datas persistidas em UTC; API usa ISO-8601 com offset; interface exibe fuso do usuário. Ordenação determinística por instante + ID.

### Relações conceituais

```text
Workspace (escopo de autorização)
  └─ Aplicação
      └─ Recurso (tipo + id)
          ├─ Eventos (0..N)
          │   ├─ Revisão (0..1; obrigatória quando o domínio é versionado)
          │   └─ Operação (0..1; opcional)
          └─ Revisões (0..N; apenas recursos versionados)
Operação (0..N eventos internos, possivelmente em vários ambientes)
  └─ Eventos do motor e eventos de recursos, identificados por categoria
```

Os identificadores de recurso precisam ser compostos com workspace, aplicação e tipo, para evitar colisões. Os vínculos são verificados no servidor; não basta receber IDs do frontend.

## 3. Convenções de interface, filtros e API

**Padrão visual:** breadcrumb, título com propósito, contexto visível (workspace, aplicação, recurso, ambiente quando aplicável), filtros identificados, tabela/timeline, ações claras, loading, vazio, erro, acesso negado e paginação. Exibir "dados fictícios" nos protótipos. Contextos já escolhidos na tela anterior aparecem no cabeçalho, sem exigir preenchimento duplicado.

**Filtros:** diferenciar obrigatórios, opcionais e herdados. Período usa `from` inclusivo e `to` exclusivo; validar `from < to` e limites. Tipos/status são enums do domínio. Limites de página validados no backend; cursores opacos codificam ordenação e filtros, e devem ser rejeitados quando incompatíveis.

**Contrato transversal sugerido:**

```java
public record CursorPage<T>(List<T> items, String nextCursor) {}
public record ResourceRef(String applicationId, String resourceType, String resourceId) {}
public record RevisionRef(String revisionId, Long revisionNumber) {}
public record OperationRef(String operationId) {}
```

Os exemplos seguintes usam IDs como `String` por neutralidade; adaptar aos tipos reais. Campos de ator/origem e metadata não devem incluir dados sensíveis.

## 4. Tela 1 — Busca de recursos

**Contexto e justificativa:** ponto de entrada para descobrir o identificador de um recurso a partir de um **nome histórico exato**, mesmo que o recurso tenha sido renomeado. A consulta é feita sobre os dados históricos de auditoria, não apenas sobre o nome atual no serviço de origem.

**Objetivo:** resolver **nome histórico → identificadores distintos**. Esta tela não lista eventos nem consulta revisões ou operações; a investigação do histórico acontece na tela 2.

**Filtros e contexto:** workspace herdado da sessão; **aplicação obrigatória**, selecionada pelo usuário (sem opção "todas"); **tipo de recurso obrigatório** (por exemplo, chave de configuração) e **nome da chave obrigatório para a busca por nome**, com correspondência **exata por igualdade (`=`), nunca `LIKE`**; o tipo selecionado restringe a busca ao domínio correspondente e evita misturar recursos de tipos diferentes que compartilham o mesmo nome. **Ambiente não é filtro nem requisito nesta tela**: pesquisar todos os ambientes autorizados da aplicação. A pesquisa só é habilitada quando aplicação, tipo de recurso e nome estiverem informados.

**Semântica da identidade:** um mesmo `resource_id` pode ter vários nomes ao longo do tempo, mas renomear não cria outro identificador. Se **dois IDs distintos** já tiveram exatamente o nome pesquisado, ambos aparecem. Se um mesmo ID tiver o nome em múltiplos eventos, ambientes ou renomeações, aparece **uma única vez**. O nome exibido é o **nome histórico que correspondeu à pesquisa**, não uma afirmação sobre o nome atual. Uma pesquisa por `minha-chave` deve encontrar o ID `123` mesmo que hoje se chame `sua-chave`; se o ID `789` também já se chamou `minha-chave`, os IDs `123` e `789` aparecem separadamente.

**Resultado mínimo:** identificador do recurso, nome histórico encontrado e data da última ocorrência **desse nome**; ação **Ver eventos**. O workspace e a aplicação não precisam ser repetidos em cada linha. A tela 2 recebe o ID selecionado e solicita a escolha de ambiente antes de consultar eventos.

**DTOs e API candidatos:**

```java
public record ResourceSearchItem(
    String resourceId,
    String matchedName,
    Instant lastOccurrenceAt
) {}
public record ResourceSearchResponse(
    List<ResourceSearchItem> items,
    String nextCursor
) {}
// GET /audit/resources?applicationId=&resourceType=&name=&cursor=&limit=
```

**MySQL 8 — consulta conceitual sobre histórico de nomes (candidata):**

```sql
SELECT
    h.resource_id,
    :searchedName AS matched_name,
    MAX(h.occurred_at) AS last_occurrence_at
FROM audit_resource_name_history h
WHERE h.workspace_id = :workspaceId
  AND h.application_id = :applicationId
  AND h.resource_type = :resourceType
  AND h.resource_name = :searchedName
GROUP BY h.resource_id
ORDER BY last_occurrence_at DESC, h.resource_id DESC
LIMIT :pageSizePlusOne;
```

**Atenção ao esquema físico:** `audit_resource_name_history` é **read model/índice histórico proposto, não tabela existente confirmada**. A origem dos dados são os eventos de auditoria: criação e renomeação devem indexar tanto o **nome anterior** quanto o **novo nome**, associados ao mesmo `resource_id`. Se o nome estiver em colunas ou payloads do `audit_event`, adaptar a consulta para extrair ambos os lados da alteração (por exemplo, `UNION ALL` dos nomes anterior e posterior) e depois agrupar por ID. Não substituir essa regra por busca no cadastro atual da feature. Verificar se a collation do MySQL exige normalização para a igualdade desejada (sensibilidade a maiúsculas/minúsculas e acentos). Índice candidato: `(workspace_id, application_id, resource_type, resource_name, resource_id, occurred_at)`. A ordenação acima **não implementa cursor estável sozinha**; aplicar predicado de cursor na agregação/read model.

**Aceite:** aplicação e tipo de recurso obrigatórios; workspace contextual; nome exato via `=`, sem `LIKE`; sem exigência de ambiente; nomes antigos e novos pesquisáveis; dois IDs diferentes que tiveram o mesmo nome retornam duas linhas; múltiplos eventos/ambientes do mesmo ID retornam uma linha; resultado mostra ID, nome histórico e última ocorrência daquele nome; navegação para eventos solicita ambiente; respeitar autorização e paginação estável.

## 5. Tela 2 — Eventos do recurso / feature

**Contexto e justificativa:** o usuário já escolheu um recurso e quer entender sua sequência de mudanças em um ambiente específico. Repetir aplicação e recurso como filtros seria redundante.

**Objetivo:** visualizar e filtrar eventos de um recurso sem misturar ambientes.

**Contexto fixo:** workspace, aplicação, tipo/ID do recurso no cabeçalho. **Filtro obrigatório:** ambiente. **Filtros opcionais:** período, tipo de evento, origem/ator quando houver suporte. Não reapresentar aplicação/recurso como campos editáveis; usar "Trocar recurso" para retornar à busca.

**Resultado:** instante, tipo, resumo, ator, origem, revisão quando existir, operação quando existir; ações **Detalhes**, **Ver revisão** e **Ver operação** condicionais. Histórico pode ser lista ou timeline sem alterar o contrato.

```java
public record EventSummary(String id, Instant occurredAt, String environmentId,
    String type, String origin, String actor, String description,
    String revisionId, Long revisionNumber, String operationId) {}
// GET /audit/resources/{resourceType}/{resourceId}/events
// ?applicationId=&environmentId=&from=&to=&type=&origin=&cursor=&limit=
```

```sql
SELECT e.id, e.occurred_at, e.environment_id, e.event_type,
       e.origin, e.actor_id, e.description, e.revision_id, e.operation_id
FROM audit_event e
WHERE e.workspace_id = :workspaceId AND e.application_id = :applicationId
  AND e.environment_id = :environmentId
  AND e.resource_type = :resourceType AND e.resource_id = :resourceId
  AND e.occurred_at >= :fromAt AND e.occurred_at < :toAt
  AND (:type IS NULL OR e.event_type = :type)
  AND (:cursorAt IS NULL OR e.occurred_at < :cursorAt
       OR (e.occurred_at = :cursorAt AND e.id < :cursorId))
ORDER BY e.occurred_at DESC, e.id DESC
LIMIT :pageSizePlusOne;
```

**Índice candidato:** `(workspace_id, application_id, environment_id, resource_type, resource_id, occurred_at, id)`. Filtro `origin` precisa ser incluído no SQL real se exposto na UI. **Aceite:** ambiente obrigatório; links só quando houver IDs; cursor sem repetição; nenhum snapshot carregado.

## 6. Tela 3 — Detalhe do evento

**Contexto e justificativa:** explicar um fato específico, sua autoria, contexto e relações; é o nó central de navegação entre recurso, operação e revisão.

**Objetivo:** responder "o que aconteceu, quando, por quem, em qual ambiente e com qual consequência?".

**Filtros:** nenhum; `eventId` identifica o registro. **Cabeçalho:** tipo, data/hora, recurso, aplicação, ambiente, ator. **Seções:** descrição, origem, correlationId, metadata segura, valores anterior/resultante quando autorizados, snapshot sob demanda. **Vínculos:** **Ver recurso**, **Ver revisão** se `revisionId` existir, **Ver operação** se `operationId` existir. Para recursos sem versionamento, não mostrar revisão artificial; para eventos manuais sem operação, indicar "Sem operação vinculada".

```java
public record EventDetail(String id, Instant occurredAt, String applicationId,
    String environmentId, String resourceType, String resourceId,
    String type, String origin, String actor, String correlationId,
    String revisionId, Long revisionNumber, String operationId,
    Map<String,Object> metadata, boolean snapshotAvailable) {}
// GET /audit/events/{eventId}
// GET /audit/events/{eventId}/snapshot (autorizado, sob demanda)
```

```sql
SELECT e.id, e.occurred_at, e.application_id, e.environment_id,
       e.resource_type, e.resource_id, e.event_type, e.origin,
       e.actor_id, e.correlation_id, e.revision_id, e.operation_id,
       e.metadata_json, e.snapshot_ref
FROM audit_event e
WHERE e.id = :eventId AND e.workspace_id = :workspaceId;
```

**Justificativa:** PK de evento para acesso direto; autorização também por aplicação/ambiente/recurso. Snapshot armazenado em S3/Blob não é carregado automaticamente. `revisionNumber` pode exigir join autorizado com read model; evitar N+1. **Aceite:** navegação evento ↔ revisão/operação, ausência legítima de vínculos, mascaramento e acesso negado.

## 7. Tela 4 — Operações

**Contexto e justificativa:** ponto de entrada para investigar execuções do motor sem conhecer previamente um recurso; uma operação pode afetar muitos recursos e ambientes.

**Objetivo:** encontrar operações autorizadas e abrir seus detalhes.

**Filtros:** período, aplicação (se fizer parte do escopo da operação), tipo, status, identificador e ator; workspace herdado. **Não restringir a um recurso**. Exibir resultados paginados, não todas as linhas em uma resposta.

**Resultado:** ID, tipo, status, início/fim, ator, origem/destino quando aplicável, contagem de eventos visíveis (se suportada), ação **Detalhar**.

```java
public record OperationSummary(String id, String type, String status,
    Instant startedAt, Instant finishedAt, String actor,
    String sourceEnvironmentId, String targetEnvironmentId, Long eventCount) {}
// GET /audit/operations?applicationId=&from=&to=&type=&status=&operationId=&actor=&cursor=&limit=
```

```sql
SELECT o.id, o.operation_type, o.status, o.started_at, o.finished_at,
       o.actor_id, o.source_environment_id, o.target_environment_id, o.event_count
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

**Justificativa:** índices candidatos `(workspace_id, started_at, id)` e `(workspace_id, application_id, started_at, id)`; filtros por ID/ator precisam entrar na query final. Não executar `COUNT` por linha; contador materializado ou carregamento específico. **Aceite:** status, filtros, operações sem eventos, paginação, autorização.

## 8. Tela 5 — Detalhe da operação

**Contexto e justificativa:** uma promoção pode modificar muitos recursos; esta tela explica a execução e reúne os efeitos, sem confundir eventos do motor com eventos das features.

**Objetivo:** investigar uma operação inteira e navegar para cada evento afetado.

**Filtros:** nenhum no cabeçalho; **lista de eventos internos paginada**, com filtros opcionais por ambiente, recurso e tipo quando volume justificar. **Cabeçalho:** ID, tipo, status, ator, início/fim, pacote, origem/destino, resultado/erro se persistidos. **Duas seções diferenciadas:** eventos do motor (marcos da execução) e eventos internos das features (recurso, aplicação, ambiente, tipo, instante, revisão quando existir, **Ver evento**). Um evento pode levar a seu detalhe e dali à revisão.

```java
public record OperationDetail(OperationSummary summary, Map<String,Object> metadata) {}
public record OperationEventSummary(String id, Instant occurredAt,
    String applicationId, String environmentId, String resourceType,
    String resourceId, String type, String description,
    String revisionId, Long revisionNumber, String category) {}
// GET /audit/operations/{operationId}
// GET /audit/operations/{operationId}/events?category=&environmentId=&cursor=&limit=
```

```sql
SELECT o.* FROM audit_operation o
WHERE o.id = :operationId AND o.workspace_id = :workspaceId;

SELECT e.id, e.occurred_at, e.application_id, e.environment_id,
       e.resource_type, e.resource_id, e.event_type, e.description,
       e.revision_id
FROM audit_event e
WHERE e.workspace_id = :workspaceId AND e.operation_id = :operationId
  AND (:cursorAt IS NULL OR e.occurred_at > :cursorAt
       OR (e.occurred_at = :cursorAt AND e.id > :cursorId))
ORDER BY e.occurred_at ASC, e.id ASC LIMIT :pageSizePlusOne;
```

**Justificativa:** índice `(workspace_id, operation_id, occurred_at, id)`. Eventos do motor podem ter armazenamento/modelo diferente: **não presumir** que estão em `audit_event` com o mesmo `operation_id`; confirmar esquema. Filtrar eventos por autorização de aplicação/ambiente, inclusive contagens e exportação. Exportação CSV é **proposta opcional**, assíncrona para volumes grandes, sem segredos. **Aceite:** operação → eventos → revisão/recurso; múltiplos ambientes; operação vazia; sem N+1.

## 9. Tela 6 — Revisões

**Contexto e justificativa:** para recursos promovíveis/versionados, o usuário precisa descobrir quais estados/revisões existem e como evoluíram. Recursos não versionados não devem ganhar revisões fictícias.

**Objetivo:** listar revisões reais de um recurso e abrir a timeline de uma revisão.

**Contexto:** recurso, aplicação e workspace herdados. **Filtros:** período (atalhos 10/30/60/90 dias, padrão 30), eventualmente ambiente como refinamento de ocorrência; paginação (padrão sugerido 10). A UI deve explicar quando o recurso não suporta revisões, em vez de exibir uma lista vazia ambígua.

**Resultado:** `revisionId`, rótulo Rn, primeiro/último evento, ambientes associados à mesma linhagem comprovada, origem da revisão e indicação de promoção quando houver.

```java
public record RevisionSummaryItem(String revisionId, long revisionNumber,
    Instant firstEventAt, Instant lastEventAt,
    List<String> environmentIds, boolean hasPromotion) {}
// GET /audit/resources/{resourceType}/{resourceId}/revisions
// ?applicationId=&days=&environmentId=&cursor=&limit=
```

```sql
SELECT r.id, r.revision_number, r.first_event_at, r.last_event_at,
       r.has_promotion
FROM audit_revision_index r
WHERE r.workspace_id = :workspaceId AND r.application_id = :applicationId
  AND r.resource_type = :resourceType AND r.resource_id = :resourceId
  AND r.last_event_at >= :fromAt
  AND (:cursorAt IS NULL OR r.last_event_at < :cursorAt
       OR (r.last_event_at = :cursorAt AND r.id < :cursorId))
ORDER BY r.last_event_at DESC, r.id DESC LIMIT :pageSizePlusOne;
```

**Justificativa:** `audit_revision_index` é **read model proposto, não tabela confirmada**. Alternativa é agrupar eventos por identidade de revisão real, não por número R1. Índice candidato `(workspace_id, application_id, resource_type, resource_id, last_event_at, id)`. **Aceite:** não fundir revisões independentes; navegação por ID; período e cursor corretos.

## 10. Tela 7 — Detalhe da revisão

**Contexto e justificativa:** entender o percurso de uma revisão entre ambientes, seus eventos e a relação com operações de promoção. Uma revisão não é necessariamente uma operação; promoções transportam uma revisão já existente.

**Objetivo:** apresentar numa única página a história da revisão, com rastreabilidade até eventos e operações.

**Layout acordado:** sem abas. Cabeçalho com recurso, revisão e quantidade de eventos; indicadores de primeiro evento, último evento e intervalo total; timeline horizontal por ambiente e data/hora; botão **Detalhar timeline** que expande tabela de evento, início, próximo evento e intervalo; histórico cronológico completo com detalhes expansíveis e links **Ver evento** / **Ver operação** quando houver.

**Semântica temporal:** `nextEventAt` é a ocorrência do evento seguinte na sequência selecionada; `intervalSeconds` é a diferença entre instantes, **não duração de execução nem vigência do valor**. Último evento tem próximo instante/intervalo nulos. Retorno a ambiente anterior (HOM → DEV → HOM) é permitido se os eventos pertencerem à mesma linhagem auditável. Revisões independentes com rótulo R1 não devem ser mescladas.

```java
public record RevisionTimelineResponse(String resourceId, String revisionId,
    long revisionNumber, RevisionTimelineSummary summary,
    List<RevisionTimelineEvent> events) {}
public record RevisionTimelineSummary(Instant firstEventAt,
    Instant lastEventAt, Long durationSeconds, long eventCount) {}
public record RevisionTimelineEvent(String eventId, String environmentId,
    String environmentName, String type, String origin, Instant occurredAt,
    Instant nextEventAt, Long intervalSeconds, String operationId,
    String description) {}
// GET /audit/resources/{resourceType}/{resourceId}/revisions/{revisionId}/timeline
// ?applicationId=
```

```sql
WITH scoped AS (
  SELECT e.id, e.environment_id, e.event_type, e.origin,
         e.occurred_at, e.operation_id, e.description
  FROM audit_event e
  WHERE e.workspace_id = :workspaceId
    AND e.application_id = :applicationId
    AND e.resource_type = :resourceType AND e.resource_id = :resourceId
    AND e.revision_lineage_id = :revisionLineageId
), sequenced AS (
  SELECT s.*, LEAD(s.occurred_at) OVER (
    ORDER BY s.occurred_at ASC, s.id ASC
  ) AS next_event_at
  FROM scoped s
)
SELECT *, TIMESTAMPDIFF(SECOND, occurred_at, next_event_at) AS interval_seconds
FROM sequenced ORDER BY occurred_at ASC, id ASC;
```

**Justificativa:** `revision_lineage_id` é campo **candidato**; mapear identidade real antes de implementar. Índice `(workspace_id, application_id, resource_type, resource_id, revision_lineage_id, occurred_at, id)`. Calcular intervalos em Java numa passagem após consulta ordenada é alternativa mais simples a `LEAD()`. Não retornar histórico ilimitado: para volumes grandes, paginar eventos e obter resumo separado. Ver também [Revisão Timeline.md](./Revis%C3%A3o%20Timeline.md), que contém cenário ilustrativo e regras temporais; alinhar o exemplo de identidade antes de implementá-lo.

## 11. Matriz de navegação e vínculos

| Origem | Destino | Condição | Identificador usado |
|---|---|---|---|
| Busca de recursos | Eventos do recurso | Recurso selecionado + ambiente escolhido | aplicação + tipo + recurso + ambiente |
| Eventos do recurso | Detalhe do evento | Sempre | eventId |
| Detalhe do evento | Busca/histórico do recurso | Sempre | aplicação + tipo + recurso + ambiente |
| Detalhe do evento | Detalhe da operação | Somente se operationId existir | operationId |
| Detalhe do evento | Detalhe da revisão | Somente se revisionId existir | revisionId (não apenas Rn) |
| Operações | Detalhe da operação | Sempre | operationId |
| Detalhe da operação | Detalhe do evento | Evento autorizado | eventId |
| Revisões | Detalhe da revisão | Recurso versionado + revisão existente | revisionId |
| Detalhe da revisão | Detalhe do evento | Evento autorizado | eventId |

Preservar filtros, cursor e breadcrumb ao retornar. IDs não garantem acesso; cada destino revalida permissão.

## 12. Estratégia de MySQL, segurança e desempenho

- **Verificar esquema real primeiro:** `audit_event`, `audit_operation`, referência a snapshots e modelo de revisão/linhagem; exemplos SQL são ilustrativos e podem precisar de joins ou outros nomes.
- **Índices orientados a filtros e ordenação:** testar `EXPLAIN ANALYZE` com cardinalidades reais; não criar todos os índices propostos sem medir escrita e espaço.
- **Cursor estável:** ordenação por instante e ID; `LIMIT pageSize+1`; proteger contra duplicação em eventos simultâneos e mudanças concorrentes. Para busca agregada, usar índice materializado ou paginação adequada.
- **Projeções leves:** listas não carregam JSON pesado nem snapshots de S3/Blob; detalhe carrega metadados autorizados; snapshot separado e protegido.
- **Sem N+1:** buscar nomes de ambiente, ator, revisão e contagens em joins/projeções em lote; não consultar uma vez por linha.
- **Segurança:** escopo de workspace derivado da autenticação; autorização por aplicação/ambiente e recurso, inclusive na operação multiambiente, no snapshot e no CSV; mascarar segredos.
- **Observabilidade:** medir latência p50/p95/p99, queries por requisição, linhas examinadas, bytes de resposta e taxa de erros. SLO e limites devem ser definidos antes da otimização.
- **Testes:** MySQL 8 + Testcontainers, isolamento entre tenants, cursor, ordenação empatada, eventos manuais sem operação, contas sem revisão, recursos versionados com revisão, promoção que preserva revisão, ambientes cruzados autorizados, snapshots e valores sensíveis.

## 13. Critérios de aceite por fluxo

1. Busca exige aplicação, permite tipo e texto, e nunca busca indiscriminadamente todas as aplicações.
2. Recurso → eventos exige ambiente e não repete filtros de aplicação/recurso já escolhidos.
3. Evento detalhado mostra revisão e operação apenas quando realmente vinculadas; recurso não versionado permanece auditável.
4. Operações lista execuções autorizadas independentemente de recurso; detalhe distingue eventos do motor e efeitos nas features.
5. Operação → evento → revisão funciona quando o evento tem revisão; links inversos e retorno preservam contexto.
6. Revisão nasce na criação do recurso versionado, evolui em alterações relevantes e é transportada pela promoção sem incremento automático por transporte.
7. Revisões independentes com mesmo número não se fundem; timeline tem intervalos corretos e último intervalo aberto.
8. Todas as telas tratam carregamento, vazio, erro, 403/404, paginação e dados sensíveis.

## 14. Decisões ainda abertas para revisão do produto/domínio

1. Quais tipos de recurso são promovíveis/versionados, e quais alterações exatamente incrementam revisão?
2. Qual é a identidade física da revisão/linhagem e como o motor propaga esse ID entre ambientes?
3. Qual a fonte da busca textual de recursos (catálogo da feature ou read model auditável)?
4. Como eventos do motor são persistidos e correlacionados com eventos internos?
5. Qual o conjunto exato de filtros por tela, limites de período/página e política de exportação?
6. Qual a política de autorização cross-application/cross-environment e de mascaramento de valores?
7. Quais nomes reais de rotas, tabelas e colunas serão adotados? Nenhuma API acima é afirmada como já existente.

## 15. Protótipo e referências

- [Protótipo conceitual navegável com sete telas](https://github.com/BrunoBS/guideline-java/blob/feat/workspace-mfe-prototype/prototypes/audit-mfe/index.html) — HTML estático com dados fictícios; não é implementação do Audit Service.
- [Protótipo anterior de eventos](https://github.com/BrunoBS/guideline-java/blob/feat/workspace-mfe-prototype/prototypes/audit-events/index.html).
- [Workspace MFE](https://github.com/BrunoBS/guideline-java/tree/feat/workspace-mfe-prototype/workspace-mfe) — referência visual.
- [Revisão Timeline.md](./Revis%C3%A3o%20Timeline.md) — regras de intervalos e exemplo; a identidade de revisão multiambiente ainda precisa de decisão explícita.

**As telas são protótipos, não capturas finais aprovadas.** Não incluir imagens inexistentes. Após validar cada tela, capturar e versionar imagens reais e atualizar os links do documento.
