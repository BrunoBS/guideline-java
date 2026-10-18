# Retries, deadlines, bulkheads e falhas em cascata

Fontes: https://github.com/resilience4j/resilience4j e https://docs.spring.io/spring-framework/reference/integration/rest-clients.html

## Amplificação
A chama B e B chama C. Se cada camada permite **3 retries além da tentativa inicial**, e toda tentativa A→B pode disparar quatro chamadas B→C, então **até 4 × 4 = 16** chamadas C por requisição A. O cálculo depende do fluxo real; não multiplicar indiscriminadamente.

## Ordem de análise
1. Definir deadline fim a fim e orçamento por dependência.
2. Classificar erros transitórios versus permanentes; **não retry** em validação/negócio.
3. Garantir idempotência de operação reexecutável; evitar cobrança ou escrita duplicada.
4. Escolher uma camada de retry, backoff exponencial com jitter, limite de tentativas e limite de concorrência.
5. Definir circuit breaker **por dependência**, bulkhead e métricas de rejected/timeout/retry.
6. Fallback somente quando mantém a semântica (stale read aceitável, não confirmação falsa de pagamento).

## Contratos de clientes HTTP
Confirmar implementação subjacente do `RestClient` e seus connect/read/response timeouts. TimeLimiter não substitui necessariamente cancelamento real do I/O. Testar requisições pendentes após timeout.

## Exemplo de decisão
- Erro 400 de validação: não repetir.
- Timeout de leitura após POST não idempotente: resultado remoto incerto; reconciliar ou usar idempotency key.
- 503 transitório em GET idempotente: retry limitado se houver budget e capacidade disponível.
- Saturação de dependência: rejeição rápida pode ser mais segura que aumentar fila.

## Testes
Simular latência, 5xx, timeouts, perda de ACK e recuperação; medir goodput, p99, amplificação e estabilidade do downstream.
