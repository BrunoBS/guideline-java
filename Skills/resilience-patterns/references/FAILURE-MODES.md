# Matriz de falhas e políticas de resiliência

Status: orientações independentes; parametrização depende de SLO, orçamento de latência e semântica da operação.

| Falha | Proteção candidata | Risco a avaliar |
|---|---|---|
| Serviço remoto lento | deadline, timeout por etapa | timeout duplicado ou maior que o deadline global |
| Falha transitória | retry limitado + backoff + jitter | amplificação de carga, retry storm |
| Serviço indisponível | circuit breaker | abrir circuito com amostra insuficiente |
| Saturação | bulkhead, limites de concorrência, fila limitada | rejeições sem tratamento |
| Duplicidade de entrega | idempotency key, deduplicação, inbox | perda de eventos, semântica at-least-once |
| Mensagem irrecuperável | DLQ + triagem + replay controlado | loop de poison messages |
| Ordem obrigatória | FIFO/SessionId, ordering key | paralelismo quebra ordenação |
| Pico de tráfego | rate limit, backpressure, shedding | starvation de clientes prioritários |
| Falha parcial de gravação/publicação | transactional outbox | inconsistência e duplicidade na publicação |

## Processo de decisão
1. Identificar dependências e falhas possíveis.
2. Definir SLO, error budget e deadline fim a fim.
3. Distinguir operações idempotentes de efeitos irreversíveis.
4. Dimensionar retries por **orçamento total de tentativas** entre camadas.
5. Definir fallback apenas quando mantém semântica e segurança.
6. Testar indisponibilidade, lentidão, duplicidade, saturação e recuperação.
7. Observar taxa de erro, latência, fila, rejeições, tentativas e DLQ.
8. Documentar owner, runbook e estratégia de rollback.

Não combinar todas as proteções por padrão. Não configurar tempos, tentativas ou thresholds sem dados e sem revisar as camadas adjacentes.
