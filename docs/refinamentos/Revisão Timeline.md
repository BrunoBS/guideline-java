# Revisão Timeline — Refinamento de Auditoria

## Objetivo
Exibir em uma única página o detalhe cronológico de uma revisão de uma chave, com resumo, timeline, tabela de intervalos sob demanda e histórico completo. A promoção DEV → HOM pode sobrescrever o valor mantendo o número R1. Criações independentes com o mesmo número de revisão não devem ser confundidas com uma identidade de revisão compartilhada.

## Protótipo funcional
1. Cabeçalho: identificação da chave, revisão e quantidade de eventos.
2. Indicadores: início (data/hora do primeiro evento), último evento (data/hora) e duração total (diferença entre ambos).
3. Timeline horizontal simples: pontos em ordem cronológica, cada qual com ambiente e data/hora; permitir HOM → DEV → HOM. Não exibir todas as durações sobre a linha.
4. Ação **Detalhar timeline**: expande tabela com evento, ambiente, início, término e intervalo. O término de cada linha é o instante do próximo evento. Última linha sem término/duração.
5. Histórico cronológico abaixo: todos os eventos, expansíveis para tipo, origem, valor anterior/resultante quando permitido, operação de promoção e metadados. Sem abas.

### Cenário de referência
| Ordem | Ocorrência | Ambiente | Ação | Revisão | Valor |
|---|---|---|---|---|---|
| 1 | 2026-11-11 10:00 | HOM | Criada manualmente | R1 | ABC |
| 2 | 2026-11-11 11:00 | DEV | Criada manualmente | R1 | XYZ |
| 3 | 2026-11-11 14:00 | HOM | Atualizada por promoção DEV → HOM | R1 | XYZ |

Resumo: início 10:00; último evento 14:00; duração 4h.
Detalhamento: evento 1, 10:00–11:00 = 1h; evento 2, 11:00–14:00 = 3h; evento 3, 14:00–sem próximo evento. **Intervalo não é duração de execução do evento nem vigência do valor no ambiente.**

## Contrato de API (proposta)
`GET /audit/features/{featureId}/revisions/{revisionId}/timeline`

```json
{
  "featureId": "feature-123",
  "revisionId": "revision-xyz",
  "revisionNumber": 1,
  "summary": {
    "firstEventAt": "2026-11-11T10:00:00Z",
    "lastEventAt": "2026-11-11T14:00:00Z",
    "durationSeconds": 14400,
    "eventCount": 3
  },
  "events": [
    {
      "eventId": 1,
      "environmentId": "hom",
      "environmentName": "HOM",
      "type": "CREATED",
      "origin": "MANUAL",
      "occurredAt": "2026-11-11T10:00:00Z",
      "nextEventAt": "2026-11-11T11:00:00Z",
      "intervalSeconds": 3600,
      "operationId": null,
      "description": "Criação manual"
    },
    {
      "eventId": 2,
      "environmentId": "dev",
      "environmentName": "DEV",
      "type": "CREATED",
      "origin": "MANUAL",
      "occurredAt": "2026-11-11T11:00:00Z",
      "nextEventAt": "2026-11-11T14:00:00Z",
      "intervalSeconds": 10800,
      "operationId": null,
      "description": "Criação independente"
    },
    {
      "eventId": 3,
      "environmentId": "hom",
      "environmentName": "HOM",
      "type": "UPDATED",
      "origin": "PROMOTION",
      "occurredAt": "2026-11-11T14:00:00Z",
      "nextEventAt": null,
      "intervalSeconds": null,
      "operationId": "promotion-456",
      "description": "Sobrescrita por promoção DEV → HOM"
    }
  ]
}
```

**Nota:** timestamps UTC acima são apenas ilustrativos; a interface converte para o fuso do usuário. A API deve transmitir instantes com offset explícito. Para evitar duplicação, timeline, tabela e histórico podem ser derivados do mesmo array `events`. Valores sensíveis devem ser mascarados ou omitidos conforme autorização.

## DTOs Java (proposta)
```java
public record RevisionTimelineResponse(
    String featureId,
    String revisionId,
    long revisionNumber,
    RevisionSummary summary,
    List<RevisionEvent> events
) {}

public record RevisionSummary(
    Instant firstEventAt,
    Instant lastEventAt,
    Long durationSeconds,
    long eventCount
) {}

public record RevisionEvent(
    long eventId,
    String environmentId,
    String environmentName,
    String type,
    String origin,
    Instant occurredAt,
    Instant nextEventAt,
    Long intervalSeconds,
    String operationId,
    String description
) {}
```
Usar enums/tipos próprios onde existirem contratos consolidados. O `revisionId` representa a identidade funcional; `revisionNumber` é o número exibido. **Questão de domínio a validar:** se criações independentes HOM R1 e DEV R1 possuem identidades diferentes, a consulta de uma única identidade não pode reunir ambas automaticamente. Para reproduzir a trajetória ilustrativa, definir explicitamente uma identidade de linhagem/correlação ou critério de agrupamento auditável, sem agrupar apenas por número R1.

## MySQL 8 — consulta base de uma ida ao banco
SQL ilustrativo; adaptar nomes, chaves e vínculos ao esquema real. A CTE `scoped_events` deve selecionar somente eventos pertencentes à linhagem definida pela regra de negócio.

```sql
WITH scoped_events AS (
    SELECT e.id, e.environment_id, e.event_type, e.origin,
           e.occurred_at, e.operation_id, e.description
    FROM audit_event e
    WHERE e.feature_id = :featureId
      AND e.revision_lineage_id = :revisionLineageId
),
ordered_events AS (
    SELECT e.*,
           LEAD(e.occurred_at) OVER (
               ORDER BY e.occurred_at, e.id
           ) AS next_event_at
    FROM scoped_events e
)
SELECT id, environment_id, event_type, origin,
       occurred_at, next_event_at,
       TIMESTAMPDIFF(SECOND, occurred_at, next_event_at) AS interval_seconds,
       operation_id, description
FROM ordered_events
ORDER BY occurred_at, id;
```

Java consome uma única consulta ordenada, constrói lista tipada e resumo em uma passagem O(n), com primeiro e último evento. Não é necessário gerar JSON no MySQL nem executar consulta por evento. `LEAD` usa desempate por `id`; para eventos no mesmo instante, o intervalo é zero. Em eventos com timestamps nulos, definir política de rejeição/correção. Quando houver histórico muito grande, considerar paginação do histórico e estratégia específica para o resumo; não prometer carregamento ilimitado.

## Performance
- Índice candidato: `(feature_id, revision_lineage_id, occurred_at, id)`; validar com `EXPLAIN ANALYZE`, cardinalidade e filtros reais.
- Uma consulta para os eventos, uma chamada HTTP para a tela; evitar N+1 para ambiente e operação (join controlado ou dados denormalizados no evento).
- Projeção de colunas necessárias; não carregar payloads grandes/S3/Blob na listagem.
- Resumo calculado durante o mapeamento; `O(n)` de CPU e memória para retorno completo. Para volumes elevados, limitar e paginar conscientemente.
- Comparar desempenho de cálculo SQL com `LEAD` versus cálculo linear no Java após `ORDER BY`; ambas preservam uma única ida ao banco. Priorizar legibilidade e medir.
- Datas em UTC no armazenamento, offset explícito no contrato; usar tipos temporais apropriados.
- Estabilidade de ordenação por `occurred_at, id`, inclusive na presença de eventos simultâneos.
- Segurança: filtrar por conta/workspace e autorizações; não expor valores secretos no audit trail.

## Critérios de aceite
1. Uma única página sem abas, com resumo, timeline, detalhamento sob demanda e histórico.
2. HOM → DEV → HOM aparece nessa ordem, inclusive retorno ao mesmo ambiente.
3. Promoção sobrescreve valor em HOM mantendo R1 e produz evento UPDATED com vínculo à operação.
4. Intervalos 1h e 3h no cenário, último evento sem término.
5. Todos os horários exibem data e hora completas; intervalos atravessando dias são corretos.
6. Eventos repetidos no mesmo ambiente continuam no histórico e podem compor intervalos por evento.
7. Não confundir número de revisão com identidade/linhagem; regra de correlação documentada e testada.
8. Consulta determinística, sem N+1, com plano e volume validados.
9. Testes de integração para ordenação, timestamps iguais, mudança de dia, retorno ao ambiente, promoção e controle de acesso.

## Pendências para implementação
Confirmar nomes e relacionamentos reais do esquema de auditoria, identidade de linhagem para criações independentes, política de exposição de valores e limite de eventos por resposta antes de integrar a query ao serviço.
