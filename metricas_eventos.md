# Documentação da Feature de Ciclos e Histórico de Eventos

## 1. Estrutura de Tabelas

### 1.1 Feature

| Coluna    | Tipo    | Descrição                                                        |
| --------- | ------- | ---------------------------------------------------------------- |
| idFeature | BIGINT  | Identificador da feature                                         |
| nome      | VARCHAR | Nome da feature/chave                                            |
| ciclo     | UUID    | Identificador do ciclo atual                                     |
| status    | VARCHAR | Último status do ciclo (CRIADO, PUBLICADO, DESATIVADO, QUEIMADO) |

### 1.2 EventoFeature

| Coluna     | Tipo     | Descrição                                                     |
| ---------- | -------- | ------------------------------------------------------------- |
| idEvento   | BIGINT   | Identificador do evento                                       |
| idFeature  | BIGINT   | Referência à feature                                          |
| idCiclo    | UUID     | Referência ao ciclo quando o evento ocorreu                   |
| tipoEvento | VARCHAR  | Tipo do evento (CADASTRO, ALTERACAO, PUBLICACAO, DESATIVACAO) |
| dataHora   | DATETIME | Data e hora do evento                                         |

---

## 2. Regras de Ciclo

1. **Novo ciclo:** criado ao gerar uma alteração significativa ou desativação **após a publicação do ciclo anterior**.
2. **Ciclos consecutivos sem publicação:** mantêm o mesmo `idCiclo`. Publicações subsequentes consolida o ciclo.
3. **eventos**: Usuario consegue gerer metricas por chave entre os ambiente


## 3. Exemplos de Ciclos e Eventos

| idFeature | idCiclo | Evento                | dataHora         | status    |
| --------- | ------- | --------------------- | ---------------- | --------- |
| 123       | UUID-1  | CADASTRO_CHAVE_DEV    | 2026-03-01 10:00 | PUBLICADO |
| 123       | UUID-1  | PUBLICACAO_CHAVE_PROD | 2026-03-03 12:00 | PUBLICADO |
| 123       | UUID-2  | ALTERACAO_CHAVE_DEV   | 2026-03-05 09:00 | PUBLICADO |
| 123       | UUID-2  | PUBLICACAO_CHAVE_PROD | 2026-03-06 15:00 | PUBLICADO |
| 123       | UUID-3  | ALTERACAO_CHAVE_DEV   | 2026-03-07 08:00 | CRIADO    |

---

## 4. Diagrama Mermaid - Fluxo de Ciclos

```mermaid
flowchart LR
    %% Ciclo 1
    A1[Criação da Chave] --> A2[Publicação]:::publicado

    %% Ciclo 2
    A2 --> B1[Alteração/Desativação Ciclo 2]:::criado
    B1 --> B2[Publicação Ciclo 2]:::publicado

    %% Ciclo 3
    B2 --> C1[Alteração/Desativação Ciclo 3]:::criado
    C1 --> C2[Alteração sem publicar Ciclo 3]:::criado
    C2 --> C3[Publicação Ciclo 3]:::publicado

    classDef criado fill:#f1c40f,stroke:#b7950b,color:#000000;
    classDef publicado fill:#2ecc71,stroke:#1e8449,color:#ffffff;
    classDef queimado fill:#e74c3c,stroke:#922b21,color:#ffffff;
```

* **Amarelo (CRIADO):** ciclo iniciado, alterações em andamento
* **Verde (PUBLICADO):** ciclo finalizado/publicado
* **Vermelho (QUEIMADO):** ciclo cancelado ou não publicado após alteração

---

## 5. Métricas Semanais

* **Volume de eventos por semana:** por `idCiclo` e `idFeature`
* **Tempo médio DEV → PROD:** `dataFim - dataInicio` por ciclo publicado
* **Ciclos iniciados na semana:** contagem de ciclos que tiveram `dataInicio` dentro da semana
* **Ciclos concluídos na semana:** contagem de ciclos que tiveram `dataFim` dentro da semana
* **Status final por feature:** consultando `Feature.ciclo` e `Feature.status`

---

## 6. Observações

* Cada ciclo é único, identificado por UUID.
* Eventos históricos mantêm o registro completo, permitindo análise retroativa.
* Job semanal pode consolidar métricas e gerar dashboards para análise estratégica de uso e tempo de integração.
* Regras de ciclo garantem que alterações múltiplas antes de publicação não criem ciclos desnecessários.
