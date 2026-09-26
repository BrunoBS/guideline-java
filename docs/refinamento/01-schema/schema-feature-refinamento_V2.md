# Feature Schema — Refinamento Técnico V2

## 1. Objetivo

A feature **Schema** será a capacidade transversal responsável por definir, versionar, resolver e validar estruturas dinâmicas de dados no `workspace-service`.

A implementação não deve ser reescrita do zero. A implementação existente em `account-api/feature/schema` deve ser utilizada como referência funcional e estrutural para a migração, preservando os comportamentos maduros e ajustando o desenho para a Golden Reference.

Objetivos da V2:

- migrar a implementação de Schema do `account-api` para o `workspace-service`;
- posicionar Schema em `foundation.schema`;
- preservar versionamento funcional, locking e validação JSON Schema;
- introduzir `SchemaType` como família semântica de schemas;
- separar claramente `SchemaType`, `Schema` e `SchemaVersion`;
- suportar os escopos `PLATFORM` e `WORKSPACE`;
- disponibilizar um use case público de resolução e validação;
- adotar fallback para um schema `default` permissivo;
- permitir que `Workspace`, `Application`, `Environment`, `Service`, `Feature`, Catalogs e outros recursos utilizem `settings` dinâmicos sem novas colunas a cada metadado.

---

## 2. Estratégia oficial de migração

O código existente no `account-api` é a **origem da migração**. Esta V2 é o **design alvo** para o `workspace-service`.

### 2.1 Preservar

Da implementação atual, preservar:

- `SchemaVersion`;
- histórico explícito de versões;
- criação de nova versão somente quando a definição JSON Schema mudar;
- versão funcional separada da versão técnica de persistência;
- optimistic locking no recurso;
- pessimistic locking quando necessário para troca/publicação de versão;
- unicidade de versão por schema;
- conceito de versão corrente/publicada;
- `SchemaValidator` isolando parsing e validação;
- read models/projections quando trouxerem ganho real.

### 2.2 Refatorar

Não copiar mecanicamente:

- duplicação entre Platform e Account;
- services paralelos com o mesmo algoritmo;
- repositories e projections duplicados;
- SQL nativo repetido;
- packages/naming legados;
- dependências incompatíveis com a Golden Reference.

### 2.3 Adaptar

Na migração:

- `ACCOUNT` passa a ser `WORKSPACE`;
- identificadores públicos seguem `identifier` UUID;
- lifecycle segue o padrão atual da Golden;
- controllers ficam em `web`;
- regras ficam em domain/service/usecase;
- persistência fica em infra/repository;
- Schema passa a ser uma capability da Foundation.

---

## 3. Localização arquitetural

Schema deve permanecer na **Foundation**, por ser uma capacidade transversal consumida por vários domínios.

```text
br.com.itau.portalmanager.workspace
└── foundation
    └── schema
        ├── domain
        │   ├── SchemaType
        │   ├── Schema
        │   └── SchemaVersion
        ├── service
        │   ├── SchemaResolver
        │   └── SchemaValidator
        ├── usecase
        │   ├── create
        │   ├── update
        │   ├── version
        │   ├── find
        │   └── validate
        └── infra
            └── repository
```

Os entrypoints REST permanecem em `web`.

A Foundation não pode depender de `core.workspace`, `core.application` ou de outros domínios consumidores.

---

## 4. Modelo conceitual

```text
SchemaType
    1
    │
    N
Schema
    1
    │
    N
SchemaVersion
```

Cada conceito possui responsabilidade própria:

- `SchemaType`: família/finalidade do contrato;
- `Schema`: contrato específico;
- `SchemaVersion`: evolução versionada da definição;
- `SchemaScopeType`: ownership/contexto do schema.

---

## 5. SchemaType

`SchemaType` representa a **categoria/família semântica** de schemas.

Exemplos:

```text
workspace
application
environment
custom-environment
microservice
feature
authorization-type
route
key
menu
default
```

Ele não representa ownership. Ownership pertence ao `SchemaScopeType`.

Campos sugeridos:

```text
SchemaType
- id
- identifier
- code
- name
- description
- lifecycle
```

O `code` deve seguir o padrão da plataforma:

```text
lowercase-kebab-case
```

Exemplos:

```text
workspace
custom-environment
authorization-type
microservice
```

Um `SchemaType` pode possuir N schemas.

---

## 6. SchemaScopeType

O escopo determina **quem possui o schema**.

```text
PLATFORM
WORKSPACE
```

### 6.1 PLATFORM

Schema pertencente à própria plataforma.

```text
scope = PLATFORM
workspaceId = null
```

Exemplos de famílias:

```text
workspace
application
environment
custom-environment
microservice
feature
authorization-type
```

### 6.2 WORKSPACE

Schema criado dentro do contexto de um Workspace.

```text
scope = WORKSPACE
workspaceId = obrigatório
```

Exemplos:

```text
route
key
menu
event-contract
customer-profile
```

O mesmo `SchemaType` pode possuir múltiplos schemas dentro do mesmo Workspace.

---

## 7. Entidade Schema

`Schema` representa um contrato específico.

Modelo conceitual:

```text
Schema
- id
- identifier
- schemaTypeId
- scope
- workspaceId nullable
- code
- name
- description
- lifecycle
- currentVersionId nullable
- persistenceVersion
```

Regras:

- `workspaceId = null` para `PLATFORM`;
- `workspaceId` obrigatório para `WORKSPACE`;
- internamente, `workspaceId` é a PK técnica `BIGINT` de `workspaces.id` e deve possuir integridade referencial;
- externamente, APIs e contratos recebem/devolvem somente `workspaceIdentifier` (UUID/36);
- o use case/resolver converte `workspaceIdentifier -> workspaceId` antes do acesso ao repositório;
- a Foundation Schema não depende diretamente de `core.workspace`; a resolução deve ocorrer por uma porta definida pelo Schema e implementada pelo Core;
- operações administrativas resolvem a existência do Workspace sem acoplar a Foundation ao Core;
- resolução para consumo deve exigir Workspace ativo, separando existência estrutural de disponibilidade operacional;
- `persistenceVersion` é técnico (`@Version`);
- versão funcional não deve compartilhar o mesmo campo do optimistic locking.

### 7.1 Unicidade

Para Platform:

```text
scope + schemaType + code
```

deve identificar unicamente o schema de plataforma aplicável.

Para Workspace:

```text
workspace + schemaType + code
```

deve ser único dentro do owner, permitindo o mesmo code em Workspaces diferentes.

As constraints devem existir também no banco.

---

## 8. SchemaVersion

Toda definição JSON Schema deve ser versionada.

```text
SchemaVersion
- id
- identifier
- schemaId
- version
- definition
- status
- createdAt
```

Status inicial sugerido:

```text
DRAFT
PUBLISHED
```

Regras:

- nova versão somente quando `definition` mudar;
- `version` é única dentro de `schemaId`;
- validação efetiva usa somente versão publicada;
- publicação/troca da versão corrente deve manter proteção contra concorrência;
- preservar o padrão de locking comprovado no `account-api`.

---

## 9. Resolução de schema para PLATFORM

Domínios internos **não devem persistir `schemaId` nem `schemaVersionId`**.

O domínio conhece apenas o `SchemaType.code` que o representa.

Exemplos:

```text
Workspace             → workspace
Application           → application
Environment           → environment
Custom Environment    → custom-environment
Service/Microservice  → microservice
Feature               → feature
```

O domínio pode manter uma constante semântica, por exemplo:

```text
WORKSPACE_SCHEMA_TYPE = "workspace"
APPLICATION_SCHEMA_TYPE = "application"
```

Essa constante não deve acoplar o domínio à entidade `Schema`.

---

## 10. SchemaResolver

O `SchemaResolver` centraliza toda a política de resolução.

Fluxo Platform:

```text
schemaTypeCode
      ↓
SchemaResolver
      ↓
resolve SchemaType
      ↓
resolve Schema(scope=PLATFORM)
      ↓
resolve latest PUBLISHED SchemaVersion
      ↓
SchemaValidator
```

Regra principal:

```text
PLATFORM → latest PUBLISHED
```

O usuário não escolhe a versão.

Quando uma nova versão é publicada:

- dados já persistidos não são alterados retroativamente;
- no próximo create/update, os `settings` são validados contra a versão publicada mais recente;
- se estiverem incompatíveis, a operação é recusada até correção;
- o recurso consumidor não precisa persistir qual versão foi usada.

Se histórico dessa validação for necessário, ele pertence ao Audit.

---

## 11. Fallback default

A plataforma deve possuir um contrato `default` permissivo.

Exemplo:

```json
{
  "type": "object",
  "additionalProperties": true
}
```

Fluxo:

```text
resolve schema específico
        ↓
encontrou?
   ├── sim → latest PUBLISHED
   └── não → default
```

O fallback deve ficar centralizado no `SchemaResolver`, nunca duplicado nos domínios consumidores.

Isso permite que todo recurso tenha `settings` desde o início sem exigir um contrato específico já cadastrado.

---

## 12. Schemas WORKSPACE

No escopo `WORKSPACE`, o usuário pode criar N schemas de uma mesma família.

Exemplo:

```text
SchemaType = route

Workspace A
├── Rotas de pagamento
├── Rotas administrativas
└── Rotas de cadastro
```

Outro Workspace pode possuir:

```text
SchemaType = route

Workspace B
├── Rotas públicas
└── Rotas internas
```

Os contratos são independentes entre owners.

Para schemas de Workspace, a seleção de versão pode ser explícita quando o domínio consumidor precisar fixar um contrato. Essa política deve ser tratada pelo use case/resolver contextual e não pela entidade genérica.

---

## 13. Use case público de validação

A Foundation deve expor uma porta/use case público para que outros domínios validem `settings`.

Conceitualmente:

```text
ValidateSettingsUseCase
- schemaTypeCode
- scope
- workspaceIdentifier optional
- settings
```

Responsabilidades:

1. resolver o SchemaType;
2. resolver o Schema aplicável;
3. resolver a versão;
4. aplicar fallback default quando permitido;
5. validar JSON;
6. validar contra JSON Schema;
7. devolver sucesso ou erro padronizado.

O consumidor não acessa `SchemaRepository`, `SchemaVersionRepository` nem detalhes da biblioteca JSON Schema.

---

## 14. Uso em Workspace

`Workspace` permanece estruturalmente estável e pode possuir:

```text
settings JSON
```

Fluxo:

```text
Create/Update Workspace
        ↓
schemaTypeCode = workspace
        ↓
ValidateSettingsUseCase
        ↓
PLATFORM / latest PUBLISHED
        ↓
settings válido?
   ├── sim → persiste
   └── não → rejeita
```

---

## 15. Uso em Application

`Application` pode manter campos estruturais fixos e transferir metadados técnicos para `settings`.

Exemplo:

```json
{
  "language": "java",
  "infrastructure": "ecs",
  "repositoryUrl": "https://git.example/app",
  "documentationUrl": "https://docs.example/app"
}
```

O JSON Schema pode determinar:

- enums aceitos;
- campos obrigatórios;
- formato URI;
- limites;
- tipos.

---

## 16. Uso em Environment

`Environment` pode utilizar `settings` para metadata de ambiente.

Exemplo:

```json
{
  "region": "sa-east-1",
  "accountId": "123456789012",
  "cluster": "workspace-prd"
}
```

---

## 17. Uso em Service e Feature

`Service` pode utilizar `settings` para metadata administrativa e técnica do microserviço.

Exemplo:

```json
{
  "language": "java",
  "repositoryUrl": "https://git.example/workspace-service",
  "gatewayUrl": "https://gateway.example/workspace-service",
  "documentationUrl": "https://docs.example/workspace-service"
}
```

`Feature` continua utilizando `settings` para política operacional.

---

## 18. Uso em Catalogs

Catálogos com `settings` podem consumir `foundation.schema`.

Regra:

```text
Catalog
   ↓
ValidateSettingsUseCase
   ↓
Schema
```

Não criar um validador genérico herdado por todos os Types para encapsular JSON Schema.

---

## 19. Nova regra para catálogos

A regra antiga “todo enum persistido deve virar catálogo em Foundation” deixa de ser absoluta.

Nova separação:

### Catálogo estrutural

Permanece em Foundation quando governa:

- regra de negócio;
- lifecycle;
- processo;
- relacionamento;
- autorização;
- ownership;
- scope.

Exemplos atuais:

```text
LifecycleType
EnvironmentType
AuthorizationType
ApplicationScopeType
OnboardingPhaseType
ResourceScopeType
SchemaScopeType
TagOriginType
ShareStatusType
```

### Metadata configurável

Preferir JSON Schema quando o dado apenas descreve/configura um recurso.

Exemplos:

```text
language
infrastructure
framework
repositoryUrl
gatewayUrl
documentationUrl
```

Candidatos à remoção da Foundation:

```text
LanguageType
InfrastructureType
```

`VisibilityType` também pode ser removido enquanto não existir uma regra concreta de compartilhamento/descoberta de Schema.

Se futuramente houver Schema Registry compartilhado entre Workspaces, visibilidade pode ser reintroduzida com semântica explícita.

---

## 20. SchemaType não é SchemaScopeType

Não confundir:

```text
SchemaScopeType
    → quem é o owner?
    → PLATFORM | WORKSPACE
```

com:

```text
SchemaType
    → qual família/finalidade do contrato?
    → workspace | application | route | key | ...
```

Exemplo:

```text
scope = PLATFORM
schemaType = application
```

Outro:

```text
scope = WORKSPACE
schemaType = route
```

---

## 21. Default não substitui schemas específicos

O `default` existe para garantir compatibilidade e adoção incremental.

Ele não deve impedir que a plataforma publique contratos específicos.

Exemplo de evolução:

```text
hoje:
application → default

amanhã:
application → schema específico v1

depois:
application → schema específico v2
```

Nenhuma alteração estrutural em `Application` é necessária.

---

## 22. API

A separação de contexto REST pode continuar existindo.

### Platform

```text
/api/v1/schemas
```

### Workspace

```text
/api/v1/workspaces/{workspaceIdentifier}/schemas
```

O cliente não deve enviar ownership contraditório no body.

O contexto vem da URL/entrypoint.

Por exemplo, endpoint de Workspace não deve aceitar:

```json
{
  "scope": "PLATFORM"
}
```

O use case recebe o contexto já resolvido.

---

## 23. Autorização

Schemas `PLATFORM` exigem autorização administrativa da plataforma.

Schemas `WORKSPACE` exigem autorização contextual sobre o Workspace.

O `SchemaResolver` não deve ser responsável por autenticar o usuário.

A autorização ocorre antes do use case de domínio ou via policy apropriada da plataforma.

---

## 24. Lifecycle e exclusão

Schema e SchemaType devem seguir o lifecycle padronizado da Golden.

Não utilizar `active boolean` como substituto quando o recurso adotar `LifecycleType`.

A existência de versões históricas exige cautela em hard delete.

Por padrão, exclusão lógica deve preservar histórico e integridade referencial.

---

## 25. Concorrência

Preservar os mecanismos positivos do `account-api`.

### Optimistic locking

Aplicar em `Schema` para impedir lost update.

### Versionamento funcional

É independente do optimistic locking.

### Publicação de versão

Quando houver troca da versão corrente/publicada:

- utilizar lock transacional adequado;
- impedir duas versões correntes simultâneas;
- garantir constraint de banco;
- traduzir conflito pelo padrão de mensagens da plataforma.

---

## 26. SchemaValidator

O `SchemaValidator` continua sendo o ponto técnico especializado para:

1. validar se a definição é JSON válido;
2. validar se a definição é um JSON Schema válido;
3. validar um payload de `settings` contra a definição.

O validator não resolve ownership, versão ou fallback.

Essas responsabilidades pertencem ao `SchemaResolver`/use cases.

Separação:

```text
SchemaResolver
    → qual schema/version usar?

SchemaValidator
    → a definição/payload é válido?
```

---

## 27. Repositories

Repositories são detalhes de Foundation Schema.

Outros domínios não devem importar:

```text
SchemaRepository
SchemaVersionRepository
SchemaTypeRepository
```

Todo consumo externo acontece por use cases públicos.

---

## 28. Dependências permitidas

```text
core.workspace ───────┐
core.application ─────┤
core.environment ─────┤
foundation.catalog ───┤
foundation.platform ──┼──> foundation.schema public use cases
feature.* ─────────────┘
```

Não permitir:

```text
foundation.schema → core.workspace
foundation.schema → core.application
```

Contexto de Workspace deve ser passado ao Schema por identificadores/ports apropriados, não por dependência reversa da Foundation.

---

## 29. Migration/seed inicial

A migração deve prever ao menos o SchemaType:

```text
default
```

e um Schema PLATFORM default com uma primeira versão publicada permissiva.

Exemplo conceitual:

```text
SchemaType
code = default

Schema
scope = PLATFORM
code = default

SchemaVersion
version = 1
status = PUBLISHED
definition = {"type":"object","additionalProperties":true}
```

Outros SchemaTypes de plataforma podem ser introduzidos progressivamente:

```text
workspace
application
environment
custom-environment
microservice
feature
authorization-type
```

Não é obrigatório possuir um schema específico para todos eles no primeiro momento.

---

## 30. Ordem recomendada de implementação

1. Mapear integralmente `account-api/feature/schema`.
2. Migrar o núcleo para `foundation.schema`.
3. Ajustar `ACCOUNT` para `WORKSPACE`.
4. Introduzir `SchemaType` como entidade/família.
5. Preservar `SchemaVersion` e locking existente.
6. Implementar `SchemaResolver`.
7. Consolidar `SchemaValidator`.
8. Criar `ValidateSettingsUseCase` público.
9. Criar seed/migration do `default`.
10. Migrar APIs Platform.
11. Migrar APIs Workspace.
12. Eliminar duplicações Platform/Workspace.
13. Criar testes de caracterização comparando comportamento com `account-api`.
14. Criar testes de concorrência/versionamento.
15. Integrar validação inicialmente em um consumidor.
16. Integrar Workspace.
17. Integrar Application.
18. Integrar Environment.
19. Integrar Service/Feature.
20. Integrar Catalog settings quando aplicável.
21. Remover `LanguageType` e `InfrastructureType` após seus usos serem migrados.
22. Avaliar/remover `VisibilityType` enquanto não houver feature real de compartilhamento.
23. Atualizar documentação Golden.

---

## 31. Testes mínimos

### SchemaType

- code válido;
- code duplicado;
- lifecycle;
- lookup por code.

### Schema PLATFORM

- workspace ausente;
- resolve latest published;
- ignora draft;
- fallback default;
- erro quando default estiver ausente/inválido.

### Schema WORKSPACE

- owner obrigatório;
- múltiplos schemas do mesmo type;
- unicidade por workspace + type + code;
- mesmo code permitido em Workspaces distintos.

### Versionamento

- primeira versão;
- definition igual não cria versão;
- definition alterada cria versão;
- publicação concorrente;
- apenas uma current/published quando essa for a política adotada.

### Validação

- JSON inválido;
- JSON Schema inválido;
- settings válido;
- required ausente;
- enum inválido;
- URL/formato inválido;
- additional properties conforme definição.

### Consumidores

- Workspace válido;
- Workspace inválido;
- Application validando latest;
- mudança de v1 para v2 sem alteração retroativa;
- update após v2 rejeitado quando settings não satisfazem v2.

---

## 32. Decisões consolidadas

1. Schema permanece na **Foundation**.
2. A implementação existente no `account-api` é a base de migração.
3. `SchemaType` permanece e representa **família/finalidade**, não ownership.
4. `SchemaScopeType` representa `PLATFORM | WORKSPACE`.
5. `SchemaType 1:N Schema`.
6. `Schema 1:N SchemaVersion`.
7. Domínios Platform conhecem somente `SchemaType.code`.
8. Platform sempre resolve a **latest PUBLISHED**.
9. Não persistir versão de schema no recurso consumidor Platform.
10. Ausência de schema específico cai no `default`.
11. `default` é permissivo.
12. A validação é exposta por use case público.
13. Repositories de Schema não vazam para outros domínios.
14. `settings` continuam JSON dinâmico nos recursos.
15. Metadata descritiva deve preferir JSON Schema em vez de catálogos estruturais.
16. `LanguageType` e `InfrastructureType` são candidatos confirmados à remoção.
17. `VisibilityType` não deve ser mantido por antecipação sem regra concreta de compartilhamento.
18. Histórico técnico, se necessário, pertence ao Audit.

---

## 33. Resultado esperado

Ao final da migração:

```text
                    foundation.schema
                           │
            ┌──────────────┼──────────────┐
            │              │              │
       SchemaType        Schema      SchemaVersion
            │              │              │
            └──────────────┴──────────────┘
                           │
                    SchemaResolver
                           │
                    SchemaValidator
                           │
                ValidateSettingsUseCase
                           │
       ┌───────────────────┼────────────────────┐
       │                   │                    │
   Workspace          Application          Environment
       │                   │                    │
   Service/Feature      Catalogs          outras features
```

A plataforma passa a possuir um mecanismo único para metadata dinâmica e contratos JSON Schema, preservando regras estruturais no domínio e evitando migrations de banco para cada novo atributo descritivo.

---

## 34. Nota de implementação

Este documento substitui o refinamento anterior para decisões arquiteturais do `workspace-service`.

O refinamento V1 e o código do `account-api` continuam válidos como **referência histórica e comportamental**, mas qualquer divergência de design deve seguir esta V2 e a Golden Reference vigente.
