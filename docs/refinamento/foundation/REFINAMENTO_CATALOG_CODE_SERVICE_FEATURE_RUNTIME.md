# Refinamento — Catálogos Tipados + Service/Feature Runtime Configuration

## 1. Objetivo

Este refinamento consolida duas evoluções estruturais do `workspace-service`:

1. **Padronizar o uso de códigos de catálogo** por meio de uma abstração reutilizável na `platform-libraries`, mantendo implementações semânticas específicas dentro de cada catálogo da `foundation`.
2. **Estruturar os catálogos `ServiceType` e `FeatureType`** para que a `FeatureType` seja a unidade de configuração operacional consumida por auditoria, quarentena e purge através de uma view estável.

As duas atividades devem ser executadas no mesmo refinamento, porém em duas fases sequenciais, pois a segunda deve utilizar o padrão de `CatalogCode` definido na primeira.

---

# 2. Decisões arquiteturais

## 2.1. Catálogos continuam simples

`ServiceType` e `FeatureType` permanecem catálogos simples dentro de:

```text
foundation.catalog
```

Estrutura esperada:

```text
foundation
└── catalog
    ├── servicetype
    │   ├── domain
    │   │   ├── ServiceType
    │   │   ├── ServiceTypeEnum
    │   │   └── ServiceTypeCode
    │   ├── repository
    │   └── usecase
    │
    └── featuretype
        ├── domain
        │   ├── FeatureType
        │   ├── FeatureTypeEnum
        │   └── FeatureTypeCode
        ├── repository
        └── usecase
```

Não serão criadas, neste momento, entidades administrativas separadas `Service` e `Feature`.

---

## 2.2. Relação Service → Feature

A cardinalidade conceitual será:

```text
ServiceType 1 ───── N FeatureType
```

Cada `FeatureType` pertence a exatamente um `ServiceType`.

O vínculo não será implementado como FK física entre as tabelas de catálogo.

A referência será mantida dentro do `settings` de `type_features`.

Exemplo:

```json
{
  "service": "workspace-service",
  "quarantine": {
    "enabled": true,
    "retentionDays": 30,
    "restoreAllowed": true
  },
  "audit": {
    "enabled": true,
    "snapshotOnPurge": true
  },
  "purge": {
    "enabled": true
  }
}
```

A camada de domínio deve validar que o `service` informado existe e está ativo em `type_services`.

---

# 3. Fase 1 — Abstração de CatalogCode

## 3.1. Problema atual

Atualmente alguns domínios possuem VOs próprios com comportamento repetido.

Exemplos atuais:

```text
LifecycleTypeCode
WorkspaceTypeCode
```

Também existem entidades que ainda persistem códigos de catálogo diretamente como `String`.

Exemplo:

```text
Message.lifecycleCode
MessageTranslation.lifecycleCode
```

Isso gera:

- repetição de validação;
- repetição de `equals/hashCode`;
- constantes String duplicadas;
- uso inconsistente entre módulos;
- risco de novos domínios criarem soluções diferentes.

---

## 3.2. Abstração na platform-libraries

Criar na `platform-libraries` uma abstração reutilizável para códigos de catálogo.

Nome sugerido:

```text
AbstractCatalogCode
```

Responsabilidades da abstração:

- armazenar o valor do código;
- validar formato semântico padrão;
- expor `value()`;
- implementar igualdade;
- implementar `hashCode`;
- implementar `toString`;
- fornecer comportamento comum de persistência compatível com JPA;
- não conhecer nenhum catálogo específico;
- não conhecer valores como `ACTIVE`, `DEV`, `JAVA`, etc.

Conceito:

```java
public abstract class AbstractCatalogCode<E extends Enum<E>> {

    protected String value;

    protected AbstractCatalogCode() {
    }

    protected AbstractCatalogCode(E value) {
        this.value = value.name();
    }

    public String value() {
        return value;
    }
}
```

A implementação final deve respeitar as regras e convenções já existentes na `platform-libraries`.

---

## 3.3. Implementações concretas permanecem na foundation

Cada catálogo terá seu próprio VO semântico dentro de seu `domain`.

Exemplo:

```text
foundation.catalog.lifecycletype.domain
├── LifecycleType
├── LifecycleTypeEnum
└── LifecycleTypeCode
```

Exemplo conceitual:

```java
@Embeddable
public class LifecycleTypeCode
        extends AbstractCatalogCode<LifecycleTypeEnum> {

    protected LifecycleTypeCode() {
    }

    private LifecycleTypeCode(LifecycleTypeEnum value) {
        super(value);
    }

    public static LifecycleTypeCode of(LifecycleTypeEnum value) {
        return new LifecycleTypeCode(value);
    }
}
```

O mesmo padrão deverá ser aplicável a:

```text
ApplicationScopeTypeCode
AuthorizationTypeCode
EnvironmentTypeCode
FeatureScopeTypeCode
FeatureTypeCode
InfrastructureTypeCode
LanguageTypeCode
LifecycleTypeCode
OnboardingPhaseTypeCode
PublisherScopeTypeCode
SchemaScopeTypeCode
SchemaTypeCode
ServiceTypeCode
ShareStatusTypeCode
TagOriginTypeCode
VisibilityTypeCode
WorkspaceTypeCode
```

Observação: somente criar implementações que façam sentido para consumo por entidades. Não criar classes artificiais apenas por simetria se determinado catálogo não for referenciado por nenhum domínio.

---

## 3.4. Enum como fonte dos valores conhecidos

Remover constantes String duplicadas quando já existir enum correspondente.

Evitar:

```java
private static final String ACTIVE_CODE = "ACTIVE";
private static final String INACTIVE_CODE = "INACTIVE";
```

Preferir:

```java
LifecycleTypeCode.of(LifecycleTypeEnum.ACTIVE);
LifecycleTypeCode.of(LifecycleTypeEnum.INACTIVE);
```

O enum representa os valores conhecidos em compile time.

A entidade consumidora continua responsável pelas transições permitidas.

---

## 3.5. Lifecycle

O catálogo de lifecycle deve ser preparado para o novo padrão transversal:

```text
ACTIVE
INACTIVE
QUARANTINED
```

`PENDING_DELETION` deverá ser substituído por `QUARANTINED` quando a migração desse conceito for executada.

`PURGED` não é lifecycle.

`PURGED` é um evento terminal de auditoria, pois após o purge o recurso não existe mais na tabela de origem.

---

## 3.6. Regra de uso do LifecycleTypeCode

Toda entidade que utiliza lifecycle deve usar:

```text
LifecycleTypeCode
```

e não `String`.

Exemplos:

```text
Workspace
Message
MessageTranslation
Application
Environment
Publisher
```

Cada entidade define suas próprias transições.

Exemplo:

```text
Workspace
ACTIVE
INACTIVE
QUARANTINED
```

Enquanto outra entidade poderá permitir apenas:

```text
Message
ACTIVE
INACTIVE
QUARANTINED
```

mas com retenção de quarentena igual a zero.

A existência de um valor no catálogo não obriga todas as entidades a exporem todas as transições diretamente.

---

## 3.7. Nome físico da coluna

O VO não deve conhecer o nome da coluna da entidade consumidora.

A entidade define o mapeamento.

Exemplo:

```java
@Embedded
@AttributeOverride(
    name = "value",
    column = @Column(
        name = "lifecycle_code",
        nullable = false,
        length = 50
    )
)
private LifecycleTypeCode lifecycle;
```

Isso permite reutilizar a mesma implementação sem acoplamento ao schema físico de cada tabela.

---

# 4. Fase 2 — ServiceType e FeatureType

## 4.1. ServiceType

Tabela:

```text
type_services
```

Responsabilidade:

- identificar os serviços da plataforma;
- fornecer código estável;
- permitir validação de referências de feature;
- servir como catálogo owner do `workspace-service`.

Estrutura base permanece no padrão de catálogo:

```text
code
label
description
sort_order
is_active
settings
```

Neste primeiro momento, `ServiceType.settings` não precisa possuir configuração operacional relevante.

Exemplo inicial:

```text
workspace-service
```

---

## 4.2. FeatureType

Tabela:

```text
type_features
```

Responsabilidade:

- identificar cada feature administrada;
- apontar para exatamente um `ServiceType`;
- armazenar a política operacional da feature;
- ser a chave utilizada por auditoria, quarantine e purge.

Estrutura física permanece no padrão de catálogo:

```text
code
label
description
sort_order
is_active
settings
```

O comportamento adicional ficará em `settings`.

---

# 5. Estrutura de settings da FeatureType

Formato inicial proposto:

```json
{
  "service": "workspace-service",
  "quarantine": {
    "enabled": true,
    "retentionDays": 30,
    "restoreAllowed": true
  },
  "audit": {
    "enabled": true,
    "snapshotOnPurge": true
  },
  "purge": {
    "enabled": true
  }
}
```

## 5.1. service

```text
service
```

Obrigatório.

Deve apontar para:

```text
type_services.code
```

A aplicação deve validar:

- service informado existe;
- service está ativo.

---

## 5.2. quarantine

Campos iniciais:

```text
enabled
retentionDays
restoreAllowed
```

Regras:

- todo recurso deletável da plataforma utiliza o conceito de `QUARANTINED`;
- o domínio define seu tempo de retenção;
- `retentionDays = 0` significa que o recurso pode seguir para purge imediatamente após entrar em quarentena;
- retenção maior que zero mantém o recurso em quarentena até expiração;
- `restoreAllowed` define se aquela feature pode ser restaurada durante a quarentena.

---

## 5.3. audit

Campos iniciais:

```text
enabled
snapshotOnPurge
```

`enabled` indica que operações relevantes da feature participam do mecanismo de auditoria.

`PURGE` de recurso auditável deverá gerar registro permanente na estrutura agregadora de auditoria, o conceito de “cemitério”.

`snapshotOnPurge` controla se o estado final deve possuir snapshot antes da remoção física.

---

## 5.4. purge

Campo inicial:

```text
enabled
```

Define se a feature permite exclusão física após cumprir sua política de quarentena.

---

# 6. Exemplos iniciais

## 6.1. WORKSPACE

```json
{
  "service": "workspace-service",
  "quarantine": {
    "enabled": true,
    "retentionDays": 30,
    "restoreAllowed": true
  },
  "audit": {
    "enabled": true,
    "snapshotOnPurge": true
  },
  "purge": {
    "enabled": true
  }
}
```

---

## 6.2. MESSAGE

```json
{
  "service": "workspace-service",
  "quarantine": {
    "enabled": true,
    "retentionDays": 0,
    "restoreAllowed": false
  },
  "audit": {
    "enabled": true,
    "snapshotOnPurge": false
  },
  "purge": {
    "enabled": true
  }
}
```

Mesmo com retenção zero, a sequência conceitual permanece:

```text
QUARANTINED
    ↓
PURGED
```

---

# 7. View de contrato

Criar uma view no schema owner do `workspace-service`.

Nome sugerido:

```text
vw_feature_runtime_config
```

Objetivo:

- esconder o JSON dos consumidores;
- transformar `settings` em contrato tabular;
- disponibilizar Service + Feature + política operacional;
- evitar que auditoria dependa da estrutura interna de `type_features.settings`.

A auditoria e outros consumidores não devem interpretar diretamente o JSON.

---

## 7.1. Colunas propostas

```text
feature_code
feature_label
service_code
service_label

quarantine_enabled
quarantine_retention_days
quarantine_restore_allowed

audit_enabled
audit_snapshot_on_purge

purge_enabled

feature_active
service_active
```

A view poderá evoluir futuramente com novos atributos sem alterar a modelagem física dos catálogos.

---

## 7.2. Exemplo conceitual

```text
feature_code | service_code      | retention_days | audit | purge
-------------+-------------------+----------------+-------+------
WORKSPACE    | workspace-service | 30             | true  | true
MESSAGE      | workspace-service | 0              | true  | true
APPLICATION  | workspace-service | 30             | true  | true
```

---

# 8. Contrato com auditoria

A auditoria deverá trabalhar usando a `feature_code` como chave de contexto operacional.

Exemplo:

```text
feature = MESSAGE
```

Através da view:

```text
MESSAGE
   ↓
workspace-service
   ↓
quarantine policy
   ↓
audit policy
   ↓
purge policy
```

A feature é única no catálogo e pertence a um único serviço.

Logo, a auditoria não precisa receber `service` e `feature` separadamente para descobrir configuração.

---

# 9. Fluxo transversal de exclusão

Fluxo padrão:

```text
ACTIVE / INACTIVE
       ↓
QUARANTINED
       ↓
consulta vw_feature_runtime_config
       ↓
retentionDays
       ↓
expiração
       ↓
PURGE
       ↓
audit event
       ↓
audit purge / operação histórica
```

Para retenção zero:

```text
QUARANTINED
       ↓
PURGE
```

A passagem por quarentena continua existindo conceitualmente.

---

# 10. Auditoria e “cemitério”

Regra proposta:

```text
recurso auditável
+
PURGE
=
registro permanente de exclusão física
```

Esse registro deve permitir responder futuramente:

- o recurso existiu?
- qual era seu identifier?
- qual feature?
- qual serviço?
- quando foi fisicamente removido?
- quem executou a operação?
- qual operação/correlation id originou a exclusão?
- existia snapshot associado?

`PURGED` deve permanecer como evento de auditoria, e não como estado de lifecycle.

---

# 11. Ordem de implementação

## Etapa 1 — platform-libraries

1. Criar abstração `AbstractCatalogCode`.
2. Centralizar validação de formato.
3. Centralizar `value`, igualdade, `hashCode` e representação textual.
4. Adicionar testes unitários da abstração.
5. Publicar nova versão da lib.

---

## Etapa 2 — foundation/catalog

1. Mover `LifecycleTypeCode` para:
   ```text
   foundation.catalog.lifecycletype.domain
   ```
2. Mover `WorkspaceTypeCode` para:
   ```text
   foundation.catalog.workspacetype.domain
   ```
3. Fazer ambos herdarem da abstração da lib.
4. Remover `SemanticCode` específico do módulo workspace se ficar obsoleto.
5. Criar os demais `*TypeCode` necessários conforme consumo real.
6. Substituir constantes String por enums onde aplicável.

---

## Etapa 3 — consumidores existentes

Migrar:

```text
Workspace
Message
MessageTranslation
```

para usar VOs de catálogo tipados.

Remover uso direto de String para códigos de catálogo onde houver VO disponível.

---

## Etapa 4 — lifecycle

1. Consolidar:
   ```text
   ACTIVE
   INACTIVE
   QUARANTINED
   ```
2. Planejar substituição de:
   ```text
   PENDING_DELETION
   ```
3. Manter transições dentro das entidades/agregados.
4. Não adicionar `PURGED` ao catálogo de lifecycle.

---

## Etapa 5 — ServiceType

1. Revisar `ServiceType` existente.
2. Criar `ServiceTypeEnum`, se aplicável.
3. Criar `ServiceTypeCode`.
4. Garantir registro inicial:
   ```text
   workspace-service
   ```

---

## Etapa 6 — FeatureType

1. Revisar `FeatureType` existente.
2. Criar `FeatureTypeCode`.
3. Definir contrato de `settings`.
4. Implementar validação de vínculo com `ServiceType`.
5. Garantir que uma feature pertença a apenas um service.
6. Inserir configurações iniciais das features existentes.

---

## Etapa 7 — View

Criar:

```text
vw_feature_runtime_config
```

A view deve:

- extrair atributos do JSON;
- resolver `service_code`;
- fazer join com `type_services`;
- expor somente contrato tabular;
- filtrar ou sinalizar inatividade de service/feature de forma explícita.

---

## Etapa 8 — Testes

Cobrir:

### CatalogCode
- criação válida;
- valor nulo;
- valor inválido;
- igualdade;
- enums diferentes;
- persistência JPA.

### ServiceType / FeatureType
- feature com service válido;
- feature com service inexistente;
- feature com service inativo;
- settings inválido;
- retention zero;
- retention positiva.

### View
- projeção correta do JSON;
- relacionamento Feature → Service;
- booleanos;
- retention;
- feature inativa;
- service inativo.

### Consumidores
- Workspace usando `WorkspaceTypeCode`;
- Workspace usando `LifecycleTypeCode`;
- Message usando `LifecycleTypeCode`;
- MessageTranslation usando `LifecycleTypeCode`.

---

# 12. Critérios de aceite

O refinamento é considerado concluído quando:

- [ ] `AbstractCatalogCode` existir na `platform-libraries`;
- [ ] não houver comportamento genérico duplicado nos VOs migrados;
- [ ] VOs concretos estiverem dentro do domínio do catálogo correspondente;
- [ ] `Workspace` não possuir mais `LifecycleTypeCode`/`WorkspaceTypeCode` próprios em seu domínio;
- [ ] `Message` e `MessageTranslation` não persistirem lifecycle como String;
- [ ] enums substituírem constantes String de valores conhecidos;
- [ ] `ServiceType` estiver estruturado como catálogo simples;
- [ ] `FeatureType` estiver estruturado como catálogo simples;
- [ ] cada FeatureType referenciar exatamente um ServiceType;
- [ ] configuração operacional estiver no `FeatureType.settings`;
- [ ] validação impedir referência a service inexistente/inativo;
- [ ] `vw_feature_runtime_config` existir;
- [ ] a view expuser os dados necessários para auditoria/quarentena/purge;
- [ ] testes de arquitetura e integração permanecerem verdes;
- [ ] `mvn clean verify` passar no `workspace-service`;
- [ ] CI da `platform-libraries` passar;
- [ ] CI do `workspace-service` passar.

---

# 13. Fora de escopo deste refinamento

Não implementar ainda:

- scheduler real de purge;
- worker de quarentena;
- consumo da view pelo audit-service;
- persistência do “cemitério” de auditoria;
- snapshot de purge;
- orquestração entre microserviços;
- hard delete automático;
- contratos externos de auditoria.

Este refinamento prepara o modelo e o contrato necessários para essas etapas.

---

# 14. Resultado esperado

Ao final, teremos:

```text
platform-libraries
└── AbstractCatalogCode

workspace-service
└── foundation.catalog
    ├── lifecycletype
    │   ├── LifecycleType
    │   ├── LifecycleTypeEnum
    │   └── LifecycleTypeCode
    ├── workspacetype
    │   ├── WorkspaceType
    │   ├── WorkspaceTypeEnum
    │   └── WorkspaceTypeCode
    ├── servicetype
    │   ├── ServiceType
    │   ├── ServiceTypeEnum
    │   └── ServiceTypeCode
    └── featuretype
        ├── FeatureType
        ├── FeatureTypeEnum
        └── FeatureTypeCode
```

Com:

```text
type_services
      +
type_features.settings
      ↓
vw_feature_runtime_config
      ↓
audit / quarantine / purge
```

Esse passa a ser o padrão base para as próximas features da Golden Reference.
