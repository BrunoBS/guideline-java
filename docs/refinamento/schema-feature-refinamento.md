# Feature Schema — Refinamento Técnico

## 1. Objetivo

A feature **Schema** será responsável por cadastrar e gerenciar definições de estrutura de dados utilizadas pelo Catalog Service.

Existirão dois contextos de utilização:

1. **Schemas da plataforma (`PLATFORM`)**
   - utilizados internamente pelo próprio portal;
   - representam estruturas das entidades/features do catálogo.

2. **Schemas de uma conta (`ACCOUNT`)**
   - cadastrados pelo usuário dentro de uma conta;
   - permitem que as features da conta tenham estruturas configuráveis e extensíveis.

A mesma entidade `Schema` atenderá aos dois cenários.

---

# 2. Localização no projeto

A feature deve ficar dentro de `feature`, e não dentro de `core`.

```text
com.brunobs.core.catalog
│
├── common
│   └── BaseType.java
│
└── feature
    ├── account
    ├── application
    ├── environment
    ├── authorization
    ├── type
    ├── feature
    │
    └── schema
        ├── controller
        │   ├── PlatformSchemaController.java
        │   └── AccountSchemaController.java
        │
        ├── service
        │   └── SchemaService.java
        │
        ├── repository
        │   └── SchemaRepository.java
        │
        ├── domain
        │   ├── Schema.java
        │   ├── SchemaScope.java
        │   └── SchemaType.java
        │
        ├── dto
        │   ├── SchemaCreateRequest.java
        │   ├── SchemaUpdateRequest.java
        │   └── SchemaResponse.java
        │
        └── validator
            └── SchemaValidator.java
```

### Responsabilidades

**`core/common`**

Contém componentes compartilhados:

- `BaseType`
- `BaseEntity`
- exceptions
- shared utilities
- outros componentes transversais

**`feature/schema`**

Contém tudo que pertence ao domínio de Schema.

---

# 3. Modelo conceitual

O conceito principal é:

```text
Schema
│
├── accountId
├── scope
├── type
├── name
├── label
├── description
├── sortOrder
├── active
├── settings
└── jsonSchema
```

O `Schema` possui um **escopo** e um **tipo**.

- `scope` determina quem pode possuir aquele schema.
- `type` determina qual é a finalidade daquele schema.

---

# 4. Schema Scope

Criar:

```java
public enum SchemaScope {

    PLATFORM,
    ACCOUNT
}
```

## PLATFORM

Representa schemas pertencentes ao próprio portal.

Características:

```text
accountId = null
```

Tipos permitidos:

```text
ACCOUNT
APPLICATION
ENVIRONMENT
AUTHORIZATION_GROUP
TYPE
FEATURE
```

## ACCOUNT

Representa schemas pertencentes a uma conta.

Características:

```text
accountId != null
```

Tipos permitidos:

```text
KEY
ROUTE
MENU
MFE
```

---

# 5. Schema Type

Criar:

```java
public enum SchemaType {

    ACCOUNT,
    APPLICATION,
    ENVIRONMENT,
    AUTHORIZATION_GROUP,
    TYPE,
    FEATURE,

    KEY,
    ROUTE,
    MENU,
    MFE
}
```

A separação lógica é:

```text
PLATFORM
├── ACCOUNT
├── APPLICATION
├── ENVIRONMENT
├── AUTHORIZATION_GROUP
├── TYPE
└── FEATURE
```

e:

```text
ACCOUNT
├── KEY
├── ROUTE
├── MENU
└── MFE
```

---

# 6. Matriz de validade

| Scope | accountId | Types permitidos |
|---|---|---|
| `PLATFORM` | `null` | `ACCOUNT` |
| `PLATFORM` | `null` | `APPLICATION` |
| `PLATFORM` | `null` | `ENVIRONMENT` |
| `PLATFORM` | `null` | `AUTHORIZATION_GROUP` |
| `PLATFORM` | `null` | `TYPE` |
| `PLATFORM` | `null` | `FEATURE` |
| `ACCOUNT` | obrigatório | `KEY` |
| `ACCOUNT` | obrigatório | `ROUTE` |
| `ACCOUNT` | obrigatório | `MENU` |
| `ACCOUNT` | obrigatório | `MFE` |

Qualquer outra combinação deve ser rejeitada.

Exemplos inválidos:

```text
scope = PLATFORM
type = MENU
```

```text
scope = ACCOUNT
type = FEATURE
```

```text
scope = ACCOUNT
accountId = null
```

---

# 7. Regra de accountId

O `accountId` é nullable no banco porque schemas de plataforma não pertencem a uma conta.

### PLATFORM

```text
scope = PLATFORM
accountId = null
```

### ACCOUNT

```text
scope = ACCOUNT
accountId = obrigatório
```

Portanto:

```java
if (scope == SchemaScope.PLATFORM && accountId != null) {
    // inválido
}

if (scope == SchemaScope.ACCOUNT && accountId == null) {
    // inválido
}
```

## Regra importante

O `scope` é a fonte da verdade sobre o contexto.

Não usar simplesmente:

```java
accountId == null
```

para determinar se é `PLATFORM`.

---

# 8. Entidade Schema

A entidade anterior chamada `SchemaType` deve ser renomeada para simplesmente `Schema`, pois `SchemaType` será utilizado pelo enum.

```java
@Entity
@Table(name = "schemas")
public class Schema extends BaseType {

    @Column(name = "account_id")
    private Long accountId;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false, length = 20)
    private SchemaScope scope;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    private SchemaType type;

    @Column(
        name = "json_schema",
        nullable = false,
        columnDefinition = "TEXT"
    )
    private String jsonSchema;

    protected Schema() {
        super();
    }

    // getters/setters
}
```

---

# 9. BaseType

O `BaseType` pode continuar sendo utilizado.

```java
@MappedSuperclass
public abstract class BaseType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    protected Long id;

    @Column(
        name = "name",
        nullable = false,
        length = 50
    )
    protected String name;

    @Column(
        name = "label",
        nullable = false,
        length = 100
    )
    protected String label;

    @Column(
        name = "description",
        columnDefinition = "TEXT"
    )
    protected String description;

    @Column(
        name = "sort_order",
        nullable = false
    )
    protected Integer sortOrder;

    @Column(
        name = "is_active",
        nullable = false
    )
    protected boolean active;

    @Column(
        nullable = false,
        columnDefinition = "TEXT"
    )
    private String settings;
}
```

## Alteração importante

Remover:

```java
unique = true
```

de:

```java
@Column(name = "name", nullable = false, unique = true)
```

Porque o mesmo nome de schema pode existir para contas diferentes.

Exemplo:

```text
Account 1 → MENU → main-menu
Account 2 → MENU → main-menu
Account 3 → MENU → main-menu
```

Isso deve ser permitido.

---

# 10. Unicidade

A regra de unicidade deve considerar o contexto.

Uma possibilidade:

```text
account_id + type + name
```

para schemas de conta.

Exemplo:

```text
account 10
MENU
main-menu
```

não poderia ser duplicado dentro da mesma conta.

Porém:

```text
account 20
MENU
main-menu
```

poderia existir.

Para schemas de plataforma, a unicidade deve ser definida dentro do contexto `PLATFORM`.

A regra deve ser reforçada no banco através de índices/constraints, e não somente no Java.

> Observação: como `account_id` é `NULL` para `PLATFORM`, a estratégia de constraint deve considerar o comportamento do banco utilizado, especialmente no caso de MySQL.

---

# 11. Repository

Implementação inicial:

```java
public interface SchemaRepository
        extends JpaRepository<Schema, Long> {
}
```

Consultas específicas poderão ser adicionadas posteriormente:

```java
Optional<Schema> findByAccountIdAndTypeAndName(
    Long accountId,
    SchemaType type,
    String name
);
```

E consultas por escopo:

```java
List<Schema> findByScope(SchemaScope scope);
```

---

# 12. Service

As regras de negócio devem ficar no `SchemaService`.

Fluxo:

```text
Controller
    ↓
SchemaService
    ↓
validate scope/account
    ↓
validate scope/type
    ↓
validate JSON Schema
    ↓
validate uniqueness
    ↓
Repository
```

O controller deve permanecer fino.

---

# 13. Validação de Scope

Criar uma validação explícita:

```java
private void validateScope(
        SchemaScope scope,
        Long accountId) {

    if (scope == SchemaScope.PLATFORM && accountId != null) {
        throw new BusinessException(
            "Platform schema cannot have an account"
        );
    }

    if (scope == SchemaScope.ACCOUNT && accountId == null) {
        throw new BusinessException(
            "Account schema requires an account"
        );
    }
}
```

---

# 14. Validação de Type

A matriz pode ficar centralizada:

```java
private static final Map<SchemaScope, Set<SchemaType>>
        ALLOWED_TYPES = Map.of(

    SchemaScope.PLATFORM,
    Set.of(
        SchemaType.ACCOUNT,
        SchemaType.APPLICATION,
        SchemaType.ENVIRONMENT,
        SchemaType.AUTHORIZATION_GROUP,
        SchemaType.TYPE,
        SchemaType.FEATURE
    ),

    SchemaScope.ACCOUNT,
    Set.of(
        SchemaType.KEY,
        SchemaType.ROUTE,
        SchemaType.MENU,
        SchemaType.MFE
    )
);
```

Validação:

```java
private void validateType(
        SchemaScope scope,
        SchemaType type) {

    if (!ALLOWED_TYPES
            .get(scope)
            .contains(type)) {

        throw new BusinessException(
            "Schema type %s is not allowed for scope %s"
                .formatted(type, scope)
        );
    }
}
```

---

# 15. JSON Schema

O campo:

```text
jsonSchema
```

representa a definição estrutural dos dados.

Exemplo para um schema `KEY`:

```json
{
  "type": "object",
  "properties": {
    "key": {
      "type": "string"
    },
    "value": {
      "type": "string"
    }
  },
  "required": [
    "key",
    "value"
  ]
}
```

O banco armazena isso como `TEXT`.

A API deve validar:

1. se o conteúdo é JSON válido;
2. se o JSON representa um JSON Schema válido.

Não basta verificar apenas se a string contém um JSON qualquer.

---

# 16. Settings

O campo:

```java
private String settings;
```

pode continuar.

A diferença conceitual é:

```text
jsonSchema
    ↓
define a estrutura dos dados

settings
    ↓
define configurações/comportamentos do próprio schema
```

Exemplo:

```json
{
  "ui": {
    "layout": "form"
  },
  "validation": {
    "strict": true
  }
}
```

Regras críticas de negócio não devem depender de `settings`.

---

# 17. API REST

Por padronização, existirão **dois controllers**, um para cada contexto.

## Platform

```text
/api/v1/schemas
```

Controller:

```java
@RestController
@RequestMapping("/api/v1/schemas")
public class PlatformSchemaController {
}
```

Responsabilidade:

> Gerenciar exclusivamente schemas pertencentes à plataforma.

## Account

```text
/api/v1/accounts/{accountId}/schemas
```

Controller:

```java
@RestController
@RequestMapping("/api/v1/accounts/{accountId}/schemas")
public class AccountSchemaController {
}
```

Responsabilidade:

> Gerenciar exclusivamente schemas pertencentes à conta indicada na URL.

---

# 18. Contexto determinado pela URL

Essa decisão é importante.

O cliente **não deve enviar `scope` nem `accountId` no body**.

### Platform

```http
POST /api/v1/schemas
```

Body:

```json
{
  "type": "FEATURE",
  "name": "feature",
  "label": "Feature",
  "description": "Schema utilizado para definição de features",
  "sortOrder": 1,
  "active": true,
  "settings": "{}",
  "jsonSchema": "{...}"
}
```

Internamente:

```text
scope = PLATFORM
accountId = null
type = FEATURE
```

### Account

```http
POST /api/v1/accounts/123/schemas
```

Body:

```json
{
  "type": "MENU",
  "name": "menu",
  "label": "Menu",
  "description": "Estrutura do menu da aplicação",
  "sortOrder": 1,
  "active": true,
  "settings": "{}",
  "jsonSchema": "{...}"
}
```

Internamente:

```text
scope = ACCOUNT
accountId = 123
type = MENU
```

Essa abordagem impede que o consumidor envie combinações contraditórias como:

```json
{
  "accountId": 123,
  "scope": "PLATFORM"
}
```

---

# 19. DTO de criação

O `SchemaCreateRequest` não deve possuir `accountId` nem `scope`.

```java
public record SchemaCreateRequest(

    @NotNull
    SchemaType type,

    @NotBlank
    @Size(max = 50)
    String name,

    @NotBlank
    @Size(max = 100)
    String label,

    String description,

    @NotNull
    Integer sortOrder,

    boolean active,

    @NotBlank
    String settings,

    @NotBlank
    String jsonSchema

) {
}
```

---

# 20. Controller Platform

```java
@PostMapping
public ResponseEntity<SchemaResponse> create(
        @Valid @RequestBody SchemaCreateRequest request) {

    return ResponseEntity
        .status(HttpStatus.CREATED)
        .body(
            schemaService.create(
                SchemaScope.PLATFORM,
                null,
                request
            )
        );
}
```

O controller informa ao service que o contexto é `PLATFORM`.

---

# 21. Controller Account

```java
@PostMapping
public ResponseEntity<SchemaResponse> create(
        @PathVariable Long accountId,
        @Valid @RequestBody SchemaCreateRequest request) {

    return ResponseEntity
        .status(HttpStatus.CREATED)
        .body(
            schemaService.create(
                SchemaScope.ACCOUNT,
                accountId,
                request
            )
        );
}
```

O `accountId` é obtido exclusivamente da URL.

---

# 22. Service único

Apesar de existirem dois controllers, a regra de criação deve permanecer centralizada.

Não criar:

```java
createPlatform()
createAccount()
```

Preferir:

```java
create(
    SchemaScope scope,
    Long accountId,
    SchemaCreateRequest request
)
```

Assim:

```text
                         Schema
                           │
             ┌─────────────┴─────────────┐
             │                           │
       Platform API                 Account API
             │                           │
 /api/v1/schemas             /api/v1/accounts/{id}/schemas
             │                           │
             │                           │
       PLATFORM                      ACCOUNT
       accountId=null              accountId={id}
             │                           │
             └─────────────┬─────────────┘
                           │
                     SchemaService
                           │
                     SchemaRepository
```

---

# 23. Endpoints

A API inicial deverá disponibilizar:

## Platform

```text
POST   /api/v1/schemas
GET    /api/v1/schemas
GET    /api/v1/schemas/{id}
PUT    /api/v1/schemas/{id}
DELETE /api/v1/schemas/{id}
```

## Account

```text
POST   /api/v1/accounts/{accountId}/schemas
GET    /api/v1/accounts/{accountId}/schemas
GET    /api/v1/accounts/{accountId}/schemas/{id}
PUT    /api/v1/accounts/{accountId}/schemas/{id}
DELETE /api/v1/accounts/{accountId}/schemas/{id}
```

Filtros poderão ser adicionados:

```text
GET /api/v1/schemas?type=FEATURE
```

```text
GET /api/v1/accounts/123/schemas?type=MENU
```

---

# 24. Segurança e autorização

A separação dos controllers também facilita aplicar regras de autorização diferentes.

```text
PlatformSchemaController
        ↓
autorização administrativa/platform
```

```text
AccountSchemaController
        ↓
autorização sobre a account
```

O `accountId` da URL deve ser validado contra o contexto/autorização do usuário.

Não basta confiar no ID recebido.

---

# 25. Exemplos inválidos

## Conta em schema PLATFORM

```json
{
  "type": "FEATURE"
}
```

Endpoint:

```text
POST /api/v1/schemas
```

O contexto interno será:

```text
scope = PLATFORM
accountId = null
```

Se o tipo for `FEATURE`, é válido.

Não existe `accountId` no body.

---

## Tipo MENU no PLATFORM

```text
POST /api/v1/schemas
```

```json
{
  "type": "MENU"
}
```

Resultado:
