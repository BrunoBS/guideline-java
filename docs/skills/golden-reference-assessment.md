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
