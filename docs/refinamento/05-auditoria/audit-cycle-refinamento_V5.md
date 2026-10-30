# Audit Cycle — Refinamento funcional V5 (proposta para discussão)

> Data: 30/10/2026. Escopo: evolução de ciclos por recurso e visões de auditoria.  
> Referência: `docs/refinamento/05-auditoria/audit-service_V4.md`.  
> **Precedência proposta:** este documento revisa especificamente a regra da seção 10 da V4, que limitava o recurso a um único ciclo por toda a vida. A nova regra permite **vários ciclos históricos e no máximo um ciclo OPEN por recurso**. Os demais contratos da V4 permanecem como referência até revisão explícita. **Não considerar esta proposta como implementação existente.**

## 1. Objetivo

Permitir que um recurso auditável tenha sucessivas jornadas de evolução, cada uma iniciada por um evento elegível e encerrada pela publicação no ambiente final configurado. Um ciclo reúne os eventos da mesma entidade lógica independentemente do ambiente, pacote, operação e fluxo de promoção.

O ciclo **não** é a unidade de medição do tempo de uma solicitação do motor. Esse indicador será derivado dos eventos próprios do motor, correlacionados pelo identificador da solicitação, com projeção analítica independente.

## 2. Conceitos e fronteiras

- **Audit Event:** fato imutável, com identidade da origem, feature, recurso, ambiente, horário de ocorrência, correlação e vínculos opcionais com operação/ciclo/snapshot.
- **Audit Operation:** execução agrupadora de eventos de múltiplos recursos, features e aplicações. Uma promoção DEV → HOMO e outra HOMO → PROD são operações distintas, ainda que pertençam à mesma solicitação.
- **Audit Cycle:** intervalo de evolução de **um recurso lógico**, não de uma versão, pacote, operação ou ambiente-valor.
- **Solicitação do motor:** jornada transversal que pode conter múltiplos pacotes e operações; seus indicadores não dependem de Audit Cycle.
- **Ambiente-valor:** entidade dependente da chave em um ambiente específico. Seu histórico é apresentado como eventos, sem ciclo próprio.

A identidade lógica do recurso segue a V4: conta + microserviço + feature + identificador estável do recurso. Preservar aplicação e contexto pertinentes para isolamento, mas não substituir a identidade da entidade principal pela do valor de ambiente.

## 3. Regras funcionais de ciclo

**RC-01 — Habilitação.** Criar/associar ciclos somente para feature com `settings.audit.cycleEnabled=true`, conforme resolução da view do Workspace prevista na V4. A ausência da flag equivale a false. Eventos continuam auditáveis sem ciclo.

**RC-02 — Multiplicidade.** Um recurso pode ter vários ciclos COMPLETED ao longo de sua existência, mas **no máximo um OPEN**. Ciclos históricos não podem se sobrepor no tempo para a mesma identidade lógica.

**RC-03 — Abertura inicial.** O primeiro `CREATED` elegível no ambiente inicial abre o primeiro ciclo. A criação e a publicação no mesmo ambiente são fatos distintos, quando assim emitidos pelo produtor.

**RC-04 — Abertura subsequente.** Após o encerramento de um ciclo, o próximo evento elegível de evolução abre novo ciclo. Para o cenário de promoção discutido, `PROMOTED`/`PUBLISHED` no ambiente intermediário pode iniciar novo ciclo quando não houver ciclo OPEN. A lista exata de eventos de abertura, incluindo `UPDATED` em DEV após um encerramento, deverá ser fechada contra os tipos realmente emitidos pela biblioteca/motor. Não inferir abertura a partir de evento técnico genérico.

**RC-05 — Associação.** Com ciclo OPEN, todos os eventos elegíveis da mesma entidade principal pertencem ao ciclo, mesmo que ocorram em outros ambientes, pacotes, solicitações ou operações. Alterações em DEV durante o fluxo **não** abrem ciclo paralelo e **não** reiniciam `started_at`.

**RC-06 — Fechamento.** O ciclo é encerrado somente pelo evento de **publicação efetiva `PUBLISHED` no ambiente final** congelado no ciclo, não por `PROMOTED` isolado, sucesso da operação ou conclusão da solicitação. Se o motor promover e publicar em uma mesma execução, a auditoria deve reconhecer o fato de publicação efetiva, sem inventar evento que o produtor não emite. O fechamento é por recurso: sucesso parcial da operação fecha apenas os ciclos dos recursos efetivamente publicados.

**RC-07 — Tempo.** `duration = completed_at - started_at`, utilizando timestamps do fato (`occurred_at`), e não horário de ingestão. É o tempo da **jornada entre a abertura do ciclo e a próxima publicação final**, não o lead time de cada alteração individual nem a duração de execução do motor.

**RC-08 — Fluxo congelado.** Na abertura, consultar `VW_AUDIT_ACCOUNT_ENVIRONMENT_FLOW` e congelar ambientes inicial/final e referência do fluxo aplicável. Alterações posteriores na configuração não reescrevem ciclos existentes.

**RC-09 — Imutabilidade.** Ciclo COMPLETED não reabre, não altera `started_at`/`completed_at` nem muda de status. Eventos tardios podem ser associados historicamente ao intervalo correto sem alterar esses marcos, respeitando política de aceitação de atraso vigente.

**RC-10 — Identidade e idempotência.** Eventos duplicados não abrem ciclos, não duplicam associações e não encerram duas vezes. Proteger a unicidade de ciclo OPEN por identidade lógica com constraint/índice ou mecanismo transacional equivalente adequado ao MySQL.

**RC-11 — Evento fora de ordem.** O consumidor não deve associar cegamente ao ciclo OPEN atual. Resolver pela identidade, `occurred_at`, fronteiras de ciclos e correlação de negócio. Um evento ocorrido antes de um fechamento, mas recebido depois, pode pertencer ao ciclo histórico. Eventos sem contexto suficiente devem ser diagnosticados e reconciliados, não vinculados por aproximação.

**RC-12 — Ausência de origem.** Se faltar o evento que justificaria a abertura, não inventar timestamp de criação. Registrar pendência de correlação e aplicar a política de reconciliação explicitamente aprovada.

**RC-13 — Mudança da flag.** Desabilitar `cycleEnabled` não apaga histórico nem reescreve ciclos. A política para fechar um ciclo já OPEN após desabilitação e para reabilitação posterior exige definição explícita antes da implementação; não adotar encerramento automático.

## 4. Jornada de referência

Recurso: chave `payment.timeout` da aplicação. Os valores são entidades distintas em DEV, HOMO e PROD.

| Horário | Fato | Operação | Ciclo |
| --- | --- | --- | --- |
| 10h00 | Chave/valor criado em DEV | — | Abre C1 |
| 11h00 | Promovido e publicado em HOMO | O100 | C1 continua OPEN |
| 11h10 | Valor alterado em DEV | — | C1 continua OPEN |
| 11h15 | Promovido e publicado em PROD, usando o valor já presente em HOMO | O200 | Fecha C1 (75 min) |
| 11h30 | Novo pacote publica a alteração pendente em HOMO | O300 | Abre C2 |
| 11h35 | Publica em PROD | O400 | Fecha C2 (5 min) |

**Interpretação intencional:** a alteração das 11h10 faz parte do histórico de C1, embora seu conteúdo só chegue a PROD em C2. Portanto, o tempo de C2 **não mede** o tempo decorrido desde a alteração das 11h10. O modelo mede jornadas do recurso, não entrega por revisão. Caso seja exigida rastreabilidade de revisões, será uma capacidade adicional, sem alterar silenciosamente o significado de ciclo.

## 5. Duas visões de auditoria

### 5.1 Visão da entidade principal — chave por aplicação

Entrada: identidade estável da chave no contexto da aplicação. Exibir ciclos históricos e OPEN, `started_at`, `completed_at`, duração, ambiente final, evento de encerramento e linha do tempo dos eventos associados. Permitir navegar do evento para operação, ambiente e snapshot quando existentes. Paginar ciclos e eventos.

### 5.2 Visão da entidade ambiente-valor

Entrada: identidade estável do registro de valor em um ambiente. Exibir **somente os eventos dessa entidade e desse ambiente**, cronologicamente, sem criar ciclo próprio. Um evento do ambiente-valor precisa permitir correlacionar sua **chave principal** para integrar a visão do ciclo; a correlação deve vir do contrato de evento/metadados confiáveis, sem exigir leitura transacional do serviço de origem a cada consulta.

**Não duplicar eventos** entre as visões. São projeções/consultas diferentes sobre fatos persistidos.

## 6. Operações e motor de promoção

Uma operação pode agrupar eventos de muitas features e aplicações. Um ciclo pode conter eventos de várias operações; uma operação pode participar de muitos ciclos. O vínculo é feito por `AUDIT_EVENT.operation_id?` e `AUDIT_EVENT.cycle_id?`, sem exigir relação direta operação↔ciclo.

Para o motor, a solicitação é a unidade do lead time: início no evento de criação da solicitação e término no evento explícito de conclusão do fluxo, identificados por uma chave estável de solicitação. A duração não depende da quantidade de recursos, features, aplicações ou operações.

Projeção analítica recomendada, reconstruível a partir dos eventos do motor: identificador da solicitação, status, início/fim, duração, quantidades distintas de operações, features, aplicações e recursos. Atualização incremental com reconciliação periódica de inconsistências. **Não criar Audit Cycle por solicitação.** Os nomes concretos dos eventos do motor e o contrato de correlação devem ser confirmados antes da implementação.

## 7. Consistência assíncrona e concorrência

- Persistir evento de forma idempotente antes de consolidar a associação com o ciclo.
- Conciliar recebimentos fora de ordem por `occurred_at` e correlação, inclusive após o encerramento.
- Manter datas/status de ciclo encerrado imutáveis; vinculação histórica tardia não pode alterar duração.
- Aplicar a política de tolerância de atraso de eventos já definida para o serviço (48 horas, se confirmada no contrato operacional vigente), **não** como duração máxima do ciclo nem limite de busca do scheduler.
- Reconciliar ciclos OPEN independentemente de sua idade; uma jornada pode durar dias ou meses.
- Impedir dois ciclos OPEN para o mesmo recurso sob ingestão concorrente.
- Testar fronteiras exatas de timestamp (evento no mesmo instante do fechamento), deduplicação e publicação concorrente.

## 8. Modelo lógico e impactos na V4

Preservar `AUDIT_EVENT`, `AUDIT_OPERATION`, `AUDIT_CYCLE`, `AUDIT_SNAPSHOT` e os catálogos oficiais da V4. **Não criar** `AUDIT_RESOURCE_TYPE` ou `AUDIT_SERVICE_TYPE` administrativos locais.

Mudanças necessárias em relação à V4:
1. Remover a unicidade vitalícia de `AUDIT_CYCLE` por recurso; substituí-la pela garantia de no máximo um ciclo OPEN.
2. Permitir múltiplos ciclos históricos da mesma identidade lógica.
3. Definir e testar a seleção temporal do ciclo de cada evento.
4. Persistir/derivar referência ao evento de fechamento para auditoria da causa do encerramento; validar nomenclatura física antes de migrations.
5. Assegurar vínculo confiável dos eventos de ambiente-valor à identidade da chave principal.
6. Separar consultas por chave (ciclos + eventos) e por ambiente-valor (eventos).

Nenhum nome novo de coluna, endpoint, pacote ou assinatura Java é normativo neste refinamento; confrontar com código, migrations, views e contratos existentes antes de codificar.

## 9. Critérios de aceite

- CA01: primeiro evento de abertura elegível cria C1; duplicata não cria outro.
- CA02: promoção/publicação em HOMO e alteração posterior em DEV permanecem em C1.
- CA03: publicação efetiva no ambiente final fecha C1; `PROMOTED` isolado não fecha.
- CA04: próximo evento elegível após C1 cria C2, preservando C1.
- CA05: recurso participa de pacotes/operações distintos sem perder correlação de ciclo.
- CA06: dois recursos da mesma operação podem encerrar ciclos em operações/dias diferentes.
- CA07: a chave mostra seus ciclos e respectivos eventos; ambiente-valor mostra apenas seus eventos.
- CA08: chegada tardia de evento anterior ao fechamento não reabre nem altera C1.
- CA09: ingestão concorrente não gera dois ciclos OPEN.
- CA10: métricas da solicitação do motor são calculadas sem consultar ciclos dos recursos.
- CA11: desabilitação de feature não apaga trilhas históricas.
- CA12: `clean verify`, testes de integração com MySQL/Testcontainers e regras ArchUnit seguem os padrões Golden, sem declarar sucesso sem execução real.

## 10. Pendências explícitas antes de implementar

1. Fechar a lista de eventos elegíveis para abrir ciclos posteriores (`UPDATED`, `PUBLISHED` intermediário etc.) conforme fatos realmente emitidos.
2. Confirmar como o motor distingue `PROMOTED` de publicação efetiva e qual evento identifica o ambiente de destino.
3. Validar contrato de identidade pai (chave) nos eventos da entidade ambiente-valor.
4. Confirmar comportamento de ciclos OPEN quando `cycleEnabled` muda para false.
5. Validar a política de eventos atrasados, bordas temporais e associação retroativa com a documentação operacional vigente.
6. Confirmar se a V4 será atualizada integralmente após aprovação deste refinamento; até lá, este documento explicita a divergência e não a oculta.

## 11. Limites da entrega

Este arquivo é **refinamento funcional e arquitetural**, não solicitação de implementação. Não altera código, banco, migrations, branches, PRs ou regras de governança além de registrar a proposta para discussão.
