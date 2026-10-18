# Etapa 3 — comparação controlada Codex A/B

**Estado:** protocolo preparado, não executado. Sem inferir pontuações.

## Desenho
Para cada um dos oito casos em `CASOS-E-GABARITO.md`:
1. Criar duas sessões independentes do **mesmo modelo/versão**, mesma instrução do problema e mesmo conjunto de arquivos sintéticos.
2. **Controle A:** sem Skills adicionais; não mencionar regras exclusivas das Skills no prompt.
3. **Tratamento B:** instalar apenas Skills relevantes em `.agents/skills/` do repositório descartável, conforme mecanismo de descoberta da versão do Codex; confirmar que o agente leu os arquivos.
4. Não contaminar sessões com respostas/gabaritos da outra variante. Aleatorizar ordem e mascarar rótulos para avaliador.
5. Capturar prompts, respostas integrais, arquivos produzidos, comandos, testes, timestamps, versões e custo/tempo.
6. Avaliar pela rubrica de 0–12, erros críticos de segurança/consistência, completude, manutenção e regressões. Um erro crítico reprova mesmo com nota alta.
7. Repetir cada caso, se possível, para estimar variabilidade. Reportar resultados por caso e não só média.

## Casos
SQL-01, SQL-02, SQL-03, RES-01, JVM-01, CACHE-01, MSG-01, LOAD-01.

## Modelo de registro
```text
case_id:
model_version:
run_id:
variant: control | skills
skill_paths:
prompt_sha256:
input_snapshot_sha256:
response_file:
patch_file:
test_command:
test_exit_code:
scores: {evidence: null, causality: null, safety: null, tradeoffs: null, verification: null, rollback: null}
critical_error:
evaluator:
notes:
```

**Regra:** nenhuma nota, taxa de acerto ou conclusão de ganho pode ser publicada sem os logs das execuções independentes.
