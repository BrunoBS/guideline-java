# Teste de carga confiável — capacidade e coordinated omission

## Cenários
Baseline, ramp-up, steady, spike, stress até saturação, soak, recovery; separar read/write mix, autenticação, cache frio/quente e tamanho da massa.

## Validade
- Registrar offered load, accepted, completed goodput, rejects, errors, timeouts, retries, queueing e percentis.
- Closed-loop pode diminuir a carga oferecida enquanto o servidor degrada, escondendo parte da cauda. Avaliar arrival-rate/open-loop e limitações do gerador.
- Confirmar gerador não saturado e sincronização de relógios.
- Separar warmup, JIT, GC e janelas medidas.
- Medir latência do ponto de vista do cliente, incluindo espera e falhas; não excluir timeout do resultado.
- Tratar histogramas corrigidos para coordinated omission como estimativas dependentes de hipótese de chegada, não como observação direta.
- Comparar workload e ambiente idênticos; repetir medições.

## Critério de aprovação
Definir SLO por operação e tráfego-alvo antes do teste; rejeitar cenários com gerador saturado, dados irreais ou erro omitido. Relatar capacidade segura e ponto de degradação, não somente throughput máximo.
