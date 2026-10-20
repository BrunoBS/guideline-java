# Golden Reference — Avaliação para Skills de Engenharia

> Estado: levantamento técnico inicial, não aprovação definitiva das Skills.
> Data: 2026-10-20.
> Fontes: `BrunoBS/account-service` (`main`), `BrunoBS/guideline-java` (`main`) e, para a anotação de visibilidade, `BrunoBS/platform-libraries` (`main`).
> Escopo: somente documentação; nenhuma alteração no Workspace Service.

## Objetivo e processo

Usar o Workspace Service como referência para Skills que orientem agentes de IA a escrever código Java 25/Spring Boot 4 de qualidade, alinhado à Golden Platform Foundation.

Para cada área: (1) examinar código real na `main`; (2) registrar evidências; (3) separar padrões de possíveis problemas; (4) formular regras candidatas com exceções; (5) especificar como validar; (6) só então promover a regra a uma Skill. Não transformar comportamento observado em obrigação sem avaliação.

Status usados: **observado** = código lido; **candidato** = regra proposta; **pendente** = exige mais evidência; **aprovado** = decisão expressa posterior.

## Inventário consolidado

| Área | Evidência | Regra candidata | Status |
| --- | --- | --- | --- |
| Arquitetura | `ContractFacade` delega a Commands/Queries; `WorkspaceCommandService` orquestra domínio e repositório | Controllers/Facades finos; casos de uso orquestram; domínio preserva invariantes | observado/candidato |
| Autorização | `ContractFacade` usa `@AuthorizationRequired` com nível e ação | Verificar autorização na fronteira da operação, inclusive chamadas indiretas | observado/candidato |
| Visibilidade | `ApplicationQueryService` usa `@ResourceVisibility(Application.class)` em consultas comuns; `findActiveScopeForShared` é exceção documentada | Distinguir autorização da operação e visibilidade da entidade; nunca anotar mecanicamente | observado/candidato |
| Compartilhamento | `ContractAccessService`, `ParticipantQueryService` e `ResourceSharingReferenceAdapter` usam escopos e referências cruzadas | Toda exceção de visibilidade requer pré-condição comprovada e testes negativos | observado/candidato |
| Domínio/lifecycle | `Workspace.transition` valida estado; `Contract.activate/inactivate` depende também do Command | Encapsular transições inválidas; não copiar estratégias divergentes sem avaliar | observado/candidato |
| Validação | `ResourceSharingValidator` trata entradas, enumerações, paginação e mappings | Distinguir JSON Schema, validação sintática, invariantes e autorização | observado/candidato |
| Transações | `@Transactional` em Commands; `ParticipantCommandService` usa READ_COMMITTED e refresh com PESSIMISTIC_WRITE | Definir fronteira e isolamento pela necessidade; revisar estado após locks | observado/candidato |
| Persistência | `WorkspaceRepository`, `ApplicationRepository`, `ContractRepository`, `ParticipantRepository` | Filtrar por escopo, justificar locks, ordenar paginação, usar projections/batch quando útil | observado/candidato |
| Integridade | `Contract` tem `@Version` e unique(owner_workspace_id, owner_application_id, feature_id) | Garantir invariantes no banco; checagem prévia não substitui unique constraint | observado/candidato |
| Auditoria | `@Auditable` em Commands de Workspace, Contract e Participant | Aplicar auditoria de acordo com contrato da biblioteca e eventos do domínio | observado/candidato |
| Integração | `PhaseCompletionPort`, `ResourceSharingReferenceAdapter` | Preferir ports/adapters e componentes Foundation existentes | observado/candidato |
| Infraestrutura | `pom.xml`: platform-parent 1.0.0, BOM 1.0.0, módulos platform-testing; `application.yml`: Flyway ativo, Hibernate validate, OSIV desabilitado | Reusar Foundation; migrations como fonte da estrutura física; validar compatibilidade JPA | observado/candidato |
| Testes | Dependências platform-testing-http/database/authorization/redis no POM | Cobrir comportamento, concorrência, segurança e rollback em banco compatível | dependências observadas; execução pendente |
| Qualidade | Domain methods, DTOs, mappers, projections e comandos separados | Coesão, baixo acoplamento, sem lógica de domínio no Controller, sem N+1 | candidato |

## Evidências principais (paths na main do account-service)

- `src/main/java/br/com/portalmanager/platform/workspace/feature/sharing/facade/contract/ContractFacade.java`
- `src/main/java/br/com/portalmanager/platform/workspace/feature/sharing/usecase/operations/contract/ContractCommandService.java`
- `src/main/java/br/com/portalmanager/platform/workspace/feature/sharing/usecase/operations/participant/ParticipantCommandService.java`
- `src/main/java/br/com/portalmanager/platform/workspace/feature/sharing/usecase/validation/ResourceSharingValidator.java`
- `src/main/java/br/com/portalmanager/platform/workspace/feature/sharing/integration/ResourceSharingReferenceAdapter.java`
- `src/main/java/br/com/portalmanager/platform/workspace/core/workspace/domain/Workspace.java`
- `src/main/java/br/com/portalmanager/platform/workspace/feature/sharing/domain/contract/Contract.java`
- `src/main/java/br/com/portalmanager/platform/workspace/core/workspace/usecase/operations/WorkspaceCommandService.java`
- `src/main/java/br/com/portalmanager/platform/workspace/core/application/usecase/operations/ApplicationQueryService.java`
- `src/main/java/br/com/portalmanager/platform/workspace/core/workspace/repository/WorkspaceRepository.java`
- `src/main/java/br/com/portalmanager/platform/workspace/core/application/repository/ApplicationRepository.java`
- `src/main/java/br/com/portalmanager/platform/workspace/feature/sharing/repository/contract/ContractRepository.java`
- `src/main/java/br/com/portalmanager/platform/workspace/feature/sharing/repository/participant/ParticipantRepository.java`
- `pom.xml` e `src/main/resources/application.yml`.
- `platform-libraries/modules/platform-authorization/src/main/java/br/com/portalmanager/platform/library/authorization/annotation/ResourceVisibility.java` documenta filtro Hibernate por entidade e campo `@AuthorizerGroup`.

## Achados técnicos a validar — não são bugs confirmados

| ID | Questão | Validação exigida |
| --- | --- | --- |
| SEC-01 | Métodos de referência sem `@ResourceVisibility` | Rastrear TODOS os chamadores e provar pré-condições de acesso; testes de acesso cruzado negado |
| SEC-02 | Descoberta/listagem e detalhe de contratos disponíveis | Garantir paridade de elegibilidade, feature ativa, owner ativo e exclusão do próprio owner |
| SEC-03 | Exposição de ambientes do participante ao owner | Confirmar regra de negócio e minimização dos dados retornados |
| SEC-04 | Interceptor Hibernate e consultas SQL nativas | Ler implementação real; testar ativação, restauração de filtros, chamadas aninhadas e falha sem grupo |
| DB-01 | Duas criações simultâneas de contrato para mesma feature | Teste de concorrência e tratamento de violação unique; SELECT FOR UPDATE sem linha não garante serialização |
| DB-02 | Lock pessimista + `@Version` | Testar conflitos, deadlocks, timeout e comportamento de rollback |
| DB-03 | Paginação de IDs seguida de batch `findByIdIn` | Verificar preservação da ordem original e consistência da contagem |
| DB-04 | Índices e constraints reais | Comparar Flyway, entidades e queries, inclusive chaves compostas |
| TEST-01 | Existência/qualidade dos testes | Inspecionar testes reais e executar suíte com MySQL/Testcontainers |
| DOMAIN-01 | Transições Workspace vs Contract | Decidir invariantes que precisam ficar no domínio |
| VALID-01 | Validação manual vs JSON Schema | Examinar fluxo `@ResourceSchemaValidator` e evitar validação duplicada ou lacunas |
| GOV-01 | Divergência entre guideline e Golden | README do guideline-java prescreve `controller/service/repository/model` e validator que retorna lista de erros; Workspace usa Facade/Use Case/Domain e `ValidationException`. Resolver qual contrato é canônico antes de publicar Skills |

## Bloqueios e limites de evidência

- Integração GitHub `fetch_file` não lista diretórios. Não foi possível enumerar `src/main/resources/db/migration` nem `src/test/java`; a busca GitHub também não encontrou arquivos nessas pastas. Isso **não** prova ausência de migrations ou testes.
- Nenhum build ou teste foi executado.
- Não foi confirmada a implementação do interceptor de `@ResourceVisibility`.
- As regras deste documento são candidatas, não aprovadas.
- O README do guideline-java foi lido na `main` e requer reconciliação com a arquitetura Golden.

## Skills propostas e critérios de aceite

| Skill candidata | Deve instruir o agente a | Prova mínima |
| --- | --- | --- |
| `golden-architecture` | Identificar camada e responsabilidade; usar parent/BOM e ports | Revisão de dependências e fluxo Controller → Facade → Use Case → Domain/Repository |
| `api-security` | Separar `@AuthorizationRequired`, `@ResourceVisibility` e exceções de sharing | Testes positivos e negativos entre workspaces/apps e chamada não autorizada |
| `domain-modeling` | Preservar invariantes, lifecycle e encapsulamento | Testes de transições válidas e inválidas |
| `schema-validation` | Usar schema para estrutura e domínio para invariantes | Testes de payload inválido, versão e compatibilidade |
| `persistence` | Alinhar JPA/Flyway, constraints, índices, escopo e paginação | Testes MySQL de integridade, ordenação e isolamento |
| `transaction-management` | Escolher isolamento, lock e fronteira transacional com justificativa | Testes de corrida, rollback e lock |
| `error-handling` | Usar exceptions e mensagens da Foundation | Testes de código HTTP, código de mensagem e i18n |
| `integration-patterns` | Reusar adapters/ports e libs Foundation | Testes de integração e revisão de dependências |
| `testing-strategy` | Usar platform-testing e cobrir riscos | Evidência de suíte executada e resultados |
| `architecture-review` | Comparar implementação com regras e registrar exceções | Checklist com evidências e pendências |
| `performance-review` | Detectar N+1, paginação incorreta e consultas custosas | Testes de SQL/índices quando aplicável |
| `code-quality` | Exigir coesão, legibilidade, baixo acoplamento e testes úteis | Revisão de diff e build |

### Formato mínimo de cada Skill

Cada `SKILL.md` deverá conter: propósito e gatilho, contrato obrigatório, práticas recomendadas, antipadrões, exceções justificadas, referências reais, testes mínimos e checklist de conclusão. Skills devem ser curtas e apontar para documentos de referência quando necessário. Não confundir documento de avaliação com Skill já pronta.

## Próxima execução

1. Resolver **GOV-01**: confrontar README atual do guideline-java com o padrão Golden real; não propagar regra contraditória.
2. Resolver **SEC-04** e **SEC-01**: encontrar interceptor real e rastrear exceções de compartilhamento.
3. Obter acesso à árvore de arquivos de migrations e testes por recurso compatível; revisar conteúdo e executar testes, se houver ambiente de execução.
4. Inspecionar schema-validation, lifecycle e mensagens.
5. Promover apenas regras fundamentadas para Skills individuais, com revisão antes de adoção.

## Decisões de governança

- A branch `main` dos repositórios de implementação é a fonte atual de evidência.
- Não alterar código produtivo nesta fase.
- Separar observação, hipótese, regra candidata e decisão aprovada.
- Não transformar divergências do Workspace Service em padrão da plataforma automaticamente.


---

# Auditoria ampliada ponta a ponta — 2026-10-20

## Método e cobertura

Foram enumeradas as árvores Git de quatro repositórios na branch `main`: `account-service` (820 arquivos), `platform-libraries` (619), `guideline-java` (137) e `platform-build` (6). **Enumeração não equivale a leitura integral de todos os arquivos**. A inspeção aprofundada foi feita por amostragem orientada a risco, cruzando fontes de código, testes, migrations, documentação e CI.

No `account-service` foram identificadas **83 migrations** (`V1` a `V83`) e **125 arquivos em `src/test`** (109 arquivos Java; 71 terminam em `IT.java`, 35 em `Test.java`, os demais são suportes/fixtures e outras classes). O impedimento anterior de listagem de diretórios foi resolvido via Git Trees API. **Não foi executado Maven, Testcontainers ou Docker nesta auditoria**; a existência dos testes é confirmada, sua aprovação em execução não.

## Conclusões por eixo

### A. Governança e contrato arquitetural — prioridade CRÍTICA

- `guideline-java/README.md` descreve `config/exception/shared/core/features/infra`, Controller→Service→Repository e validator que retorna lista de erros.
- `account-service/GoldenArchitectureTest.java` **impõe por ArchUnit** as zonas `config/foundation/core/feature/entrypoint`, controllers em `entrypoint`, `foundation` sem dependência de `core/feature/entrypoint`, `core` sem dependência de `feature/entrypoint`, e endpoints recebendo `AuthorizationContext`.
- O serviço usa Facade, Use Case, Domain, Repository, Integration e ValidationResult/ValidationException conforme contexto; a prescrição universal de validators retornando listas é incorreta para o baseline atual.
- **Decisão técnica recomendada (ainda não aprovada):** tratar os testes ArchUnit e o código da Golden como baseline verificável do perfil `golden-workspace`; manter princípios genéricos do README apenas onde compatíveis; não reescrever silenciosamente o README nem generalizar todos os detalhes de Workspace a qualquer projeto.

### B. Segurança e visibilidade — prioridade CRÍTICA

- `platform-libraries/.../visibility/ResourceVisibilityAspect.java`: `@Around`; exige sessão; OWNER bypass; sem grupos de authorizer lança `GROUPS_NOT_FOUND`; ativa filtro para entidade anotada e desativa no `finally` se foi quem ativou.
- `ResourceVisibilityFilterManager.java`: normaliza grupos para maiúsculas, elimina duplicatas, limite 500, usa filtro por classe de entidade; se já ativo, retorna `false` (não o desativa no retorno do escopo interno).
- **Padrão positivo confirmado no código:** fail-closed sem sessão/grupos; escopo aninhado não desmonta filtro externo; limpeza em `finally`.
- **Riscos que dependem de testes específicos:** filtros Hibernate não devem ser presumidos sobre SQL nativo; retorno `OWNER` bypass é intencional e exige política de negócio; acesso compartilhado usa métodos sem anotação de visibilidade e deve demonstrar contrato/participação antes de ler dados de outro escopo.
- `WorkspaceAuthorizationIT.java` usa `@WithMySql` e `@WithMockAuthorization` e cobre negação de criação e ausência de escrita após 403. `ResourceSharingApiIT.java` cobre fluxos extensos de compartilhamento e concorrência, mas ainda requer matriz completa de rastreio dos métodos de referência.

### C. Persistência, migrations e concorrência — prioridade ALTA

- Flyway `V1..V83` existe, inclusive evolução de Resource Sharing (`V38`, `V39`, `V40`, `V41`, `V80`) e rename de Schema Binding (`V83`).
- `PublishedMigrationChecksumTest` compara checksums de migrations publicadas contra `src/test/resources/migration/applied-checksums.csv`; fixture lista V1..V44. **Não presumir** que V45..V83 estejam publicados ou possam ser alterados: verificar histórico de ambientes antes de qualquer consolidação.
- `DatabaseUpgradeMigrationIT` inicia em V2, insere dados legados e migra até o estado atual; `DatabaseMigrationIT` inspeciona tabelas/índices. `WorkspaceNameConcurrencyIT` cobre corrida de nomes; `ResourceSharingApiIT` contém testes de configurações concorrentes e de desativação de feature durante criação de contrato.
- `Contract` possui `@Version` e constraint única `owner_workspace_id/owner_application_id/feature_id`; `ContractRepository` usa `FOR UPDATE`, `FOR SHARE` e queries paginadas com `countQuery`. `ParticipantRepository` pagina IDs e faz batch `findByIdIn` com `@EntityGraph`.
- **Regras candidatas:** nunca substituir UNIQUE por `exists`; usar locks com justificativa; preservar ordenação após fetch em lote; testar concorrência real e rollback; adicionar migration em vez de alterar uma já aplicada.
- **Atenção:** há 83 migrations e um teste explícito de compatibilidade. A sugestão anterior de consolidar todas em V1 seria insegura sem verificar que nenhum ambiente compartilha histórico aplicado.

### D. Schema, validação e lifecycle — prioridade ALTA

- `SchemaDefinitionValidationAdapter` usa `networknt` com `DRAFT_2020_12`, distingue sintaxe da definição e validação de dados; acumula `ValidationResult` com caminhos de erro.
- `SchemaVersionCommandService` separa criação/atualização de draft, publicação e remoção de draft; usa locks de versões e `@Auditable`.
- `Workspace` concentra transições ACTIVE→INACTIVE→QUARANTINED e restauração; `Contract` altera lifecycle em métodos simples, com validação complementar no Command.
- **Regra candidata:** JSON Schema define estrutura/contrato de payload; domínio decide estado e autorização; schema publicado não pode ser tratado como draft mutável. Testar versão, concorrência, schema inválido e resolução do publicado.
- **Pendente:** revisar completamente `SchemaVersionOperationValidator`, `SchemaResolutionAdapter`, anotações de validação na Foundation e testes associados antes de fixar política de publicação e fallback.

### E. Testes, CI e Foundation — prioridade ALTA

- `pom.xml` do `account-service` importa `platform-parent:1.0.0`, BOM `platform-libraries-bom:1.0.0`, e módulos de teste `platform-testing-http/database/authorization/redis`.
- `.github/workflows/verify.yml`: Java 25, MySQL 8.4.11 em Docker, Maven repo isolado, `mvn clean verify` em push/PR da main. Isso comprova **configuração do gate**, não o status de um run específico.
- `GoldenArchitectureTest` e outros quatro testes de arquitetura dão critérios executáveis de zonas e dependências; há testes de API, persistência, migrations, autorização, concorrência, schema, auditoria e Redis.
- `platform-libraries` inclui testes de Aspect/FilterManager e integração Spring JPA da visibilidade; testes de módulos platform-testing também existem.
- **Regra candidata:** skill deve instruir a executar `mvn clean verify`, registrar resultados e nunca alegar testes executados se apenas foram inspecionados. Preferir `platform-testing-*` em vez de recriar fixtures.

### F. Divergência adicional de fonte — prioridade ALTA

- `platform-build/platform-parent/pom.xml` na main usa `com.empresa.platform` e referências `platform-crud`/`platform-test-support`, enquanto `account-service/pom.xml` e `account-service/docs/golden/FOUNDATION-USAGE.md` usam `br.com.portalmanager.platform.library` e descrevem `platform-crud` como removido.
- **Não inferir** que o artefato publicado `platform-parent:1.0.0` tenha o conteúdo do repositório `platform-build` consultado. É divergência de fontes a reconciliar por artefato publicado, release/tag ou POM efetivo. Skill não deve copiar coordenadas do repositório desatualizado.

## Matriz de riscos e encaminhamento

| ID | Severidade | Achado | Ação recomendada | Evidência de aceite |
| --- | --- | --- | --- | --- |
| GOV-01 | Crítica | README guideline conflita com ArchUnit e camadas Golden | Publicar perfil específico de Golden, separar orientação genérica | Skill reproduz invariantes do GoldenArchitectureTest |
| GOV-02 | Alta | `platform-build` main diverge do parent consumido | Conferir POM efetivo e artefato de Packages | Coordenadas e dependências efetivas verificadas |
| SEC-01 | Crítica | Exceções de sharing sem visibilidade Hibernate | Rastrear chamadores e gates de autorização | Testes negativos de acesso cruzado e SQL nativo |
| SEC-04 | Alta | Filtro por entidade e `finally` confirmado; SQL nativo não confirmado | Cobrir SQL nativo, nested scopes, owner e ausência de grupos | Integração Spring/JPA/MySQL com casos negativos |
| DB-01 | Alta | Criação concorrente e UNIQUE | Confirmar tratamento de conflito e códigos HTTP | Teste simultâneo reproduzível |
| DB-03 | Média | Paginação IDs + batch | Reordenar segundo IDs paginados quando necessário | Teste com ordem determinística |
| DB-04 | Alta | Evolução Flyway extensa | Conferir constraints finais e histórico aplicado | Migration IT + schema validate + checksum |
| VALID-01 | Alta | Schema draft/publicação e AOP | Mapear política completa e fallback | Testes de versão, draft e published |
| DOMAIN-01 | Média | Lifecycle guardado em locais diferentes | Estabelecer regra mínima de invariantes | Testes de transição inválida |
| TEST-01 | Alta | Suíte encontrada, não executada nesta auditoria | Rodar `mvn clean verify` em runner apto | Log/CI verde vinculado a commit |
| DOC-01 | Média | Documentos históricos podem divergir | Preferir fonte ativa + teste; marcar histórico | Sem instruções obsoletas nas Skills |

## Contrato operacional para as Skills

Cada Skill deve impor fluxo: **identificar escopo → ler referências canônicas → planejar mudança → implementar mínima alteração → criar/atualizar testes → executar gates disponíveis → revisar segurança, transação, schema, migrations e contratos → reportar evidências e limitações**.

**Obrigatório:** proibir declarações de `BUILD SUCCESS` sem execução; não assumir filtro Hibernate em SQL nativo; não usar `@ResourceVisibility` mecanicamente em compartilhamento; não editar migration aplicada; não duplicar capability da Foundation; não aceitar exceção de segurança sem teste negativo; não reescrever a arquitetura baseada em README histórico.

**Exceções:** devem informar motivo, escopo, evidência e impacto. Regras de aplicação específicas não devem se tornar universais para os 10–15 serviços.

## Plano de materialização das Skills

**Onda 1 (bloqueante):** `golden-architecture`, `api-security`, `testing-strategy`.
**Onda 2:** `persistence`, `transaction-management`, `domain-modeling`, `schema-validation`.
**Onda 3:** `error-handling`, `integration-patterns`, `architecture-review`, `performance-review`, `code-quality`.

Antes de ativar as Skills, reconciliar GOV-01/GOV-02 e validar o texto contra os testes existentes. O presente documento é **avaliação**, não Skill executável.

## Links diretos para evidências

- [GoldenArchitectureTest](https://github.com/BrunoBS/account-service/blob/main/src/test/java/br/com/portalmanager/platform/workspace/GoldenArchitectureTest.java)
- [ResourceVisibilityAspect](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-authorization/src/main/java/br/com/portalmanager/platform/library/authorization/visibility/ResourceVisibilityAspect.java)
- [ResourceVisibilityFilterManager](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-authorization/src/main/java/br/com/portalmanager/platform/library/authorization/visibility/ResourceVisibilityFilterManager.java)
- [ResourceSharingApiIT](https://github.com/BrunoBS/account-service/blob/main/src/test/java/br/com/portalmanager/platform/workspace/entrypoint/sharing/ResourceSharingApiIT.java)
- [DatabaseUpgradeMigrationIT](https://github.com/BrunoBS/account-service/blob/main/src/test/java/br/com/portalmanager/platform/workspace/core/workspace/repository/DatabaseUpgradeMigrationIT.java)
- [PublishedMigrationChecksumTest](https://github.com/BrunoBS/account-service/blob/main/src/test/java/br/com/portalmanager/platform/workspace/core/workspace/repository/PublishedMigrationChecksumTest.java)
- [SchemaDefinitionValidationAdapter](https://github.com/BrunoBS/account-service/blob/main/src/main/java/br/com/portalmanager/platform/workspace/foundation/schema/integration/SchemaDefinitionValidationAdapter.java)
- [verify.yml](https://github.com/BrunoBS/account-service/blob/main/.github/workflows/verify.yml)
- [Foundation Usage](https://github.com/BrunoBS/account-service/blob/main/docs/golden/FOUNDATION-USAGE.md)
- [Guideline README](https://github.com/BrunoBS/guideline-java/blob/main/README.md)
- [platform-build parent](https://github.com/BrunoBS/platform-build/blob/main/platform-parent/pom.xml)
