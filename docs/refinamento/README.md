# Refinamentos

Esta pasta organiza os refinamentos funcionais e técnicos em sequência de desenvolvimento e preserva o histórico de evolução de cada feature.

## Sequência

1. `01-schema/`
   - `schema-feature-refinamento_V1.md`

2. `02-chaves/`
   - `modelo_dados_chaves_V1.md`

3. `03-rotas/`
   - `feature_rotas_cenarios_V1.md`

4. `04-menus/`
   - `menus_V1.md`

5. `05-auditoria/`
   - `audit-service_V1.md`

6. `06-compartilhamento/`
   - `compartilhamento-negocio_V1.md`

7. `07-lifecycle/`
   - `workspace-lifecycle-orchestration_V1.md`

8. `08-transferencia-copia/`
   - `transferencia-copia-configuracoes_V1.md`

## Regra de versionamento

Cada refinamento deve preservar suas versões anteriores.

Exemplo:

```text
03-rotas/
├── feature_rotas_cenarios_V1.md
├── feature_rotas_cenarios_V2.md
├── feature_rotas_cenarios_V3.md
└── ...
```

Uma nova rodada de refinamento gera uma nova versão do MD. As versões anteriores não devem ser sobrescritas ou removidas, mantendo o histórico de decisões do domínio.
