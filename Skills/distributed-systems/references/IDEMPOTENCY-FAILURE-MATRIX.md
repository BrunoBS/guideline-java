# Mensageria — pontos de falha e idempotência

## Matriz de falhas
| Ponto de falha | Risco | Defesa |
|---|---|---|
| Antes do commit local | Nada persistido; reentrega | Retry idempotente |
| Depois do commit, antes do ACK | Efeito duplicado na reentrega | Chave de evento única/inbox transacional |
| Depois de efeito externo, antes do registro | Efeito externo pode duplicar | Idempotency key no provedor, reconciliação |
| Depois de publicação, antes de marcar outbox | Republicação | Consumidor idempotente |
| Mensagem fora de ordem | Estado antigo sobrescreve novo | Versão/sequence e política de ordering |
| DLQ e replay | Efeito já aplicado | Replay com deduplicação durável |

## Regras
At-least-once não equivale a exactly-once end-to-end. Outbox resolve atomicidade entre **banco local e registro de intenção**, não garante consumo exatamente uma vez. Deduplicação em memória não resiste a restart. Escolher chave de idempotência e janela de retenção com base no domínio.

## Testes
Crash injection em cada ponto, concorrência de consumers, reordenação, atraso, DLQ, replay e expiração da janela de deduplicação.
