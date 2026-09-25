# Refinamento — Catálogos Tipados + Platform Feature + Runtime Configuration

## 1. Objetivo

Este refinamento consolida a evolução arquitetural do `workspace-service` em dois eixos:

1. padronizar códigos de catálogos transversais por meio de `AbstractCatalogCode` na `platform-libraries`;
2. retirar `ServiceType` e `FeatureType` da `foundation` e promover os conceitos para entidades administrativas da feature `platform`: `Service` e `Feature`.

A `foundation` permanece responsável apenas pelo vocabulário estrutural e transversal. A nova `feature.platform` passa a administrar a composição da plataforma: serviços, features, associação funcional a scopes e políticas operacionais.

Este documento substitui as decisões anteriores que tratavam `ServiceType` e `FeatureType` como catálogos simples da Foundation.

---

# 2. Decisões arquiteturais

## 2.1. Foundation permanece estável e transversal

A `foundation` mantém catálogos que representam vocabulário estrutural reutilizável.

Em especial:

```text
foundation.catalog.featurescopetype
├── domain
│   ├── FeatureScopeType
│   ├── FeatureScopeTypeEnum
│   └── FeatureScopeTypeCode
├── repository
└── usecase
```

`FeatureScopeType` representa agrupadores funcionais de features percebidos pelo usuário ou pela plataforma.

Exemplos conceituais:

```text
PROMOTION_ENGINE
CONFIGURATION
ADMINISTRATION
```

Um scope pode agrupar várias features e uma feature pode participar de vários scopes.

A Foundation **não conhece `Service` nem `Feature`** e não depende de `feature.platform`.

---

## 2.2. ServiceType e FeatureType deixam a Foundation

Os conceitos anteriores:

```text
foundation.catalog.servicetype.ServiceType
foundation.catalog.featuretype.FeatureType
```

deixam de representar simples tipos de catálogo.

Passam a ser entidades administrativas:

```text
feature.platform.domain.Service
feature.platform.domain.Feature
```

Motivo: ambos possuem identidade administrativa, relacionamento, regras, configuração, ciclo de manutenção e casos de uso próprios. Portanto, não devem ser tratados apenas como vocabulário estático.

---

## 2.3. Estrutura alvo da feature Platform

Estrutura conceitual:

```text
feature
└── platform
    ├── domain
    │   ├── Service
    │   └── Feature
    ├── repository
    │   ├── ServiceRepository
    │   └── FeatureRepository
    ├── usecase
    │   ├── service
    │   └── feature
    └── infra
```

A organização final deve respeitar o padrão arquitetural vigente da Golden Reference.

Não criar entidade `Platform`. `platform` é o bounded context/feature que agrupa a administração da composição da plataforma.

---

# 3. Modelo de domínio

## 3.1. Service

`Service` representa um serviço/microserviço administrado pela plataforma.

Responsabilidades:

- possuir código estável;
- possuir nome e descrição;
- possuir lifecycle administrativo quando aplicável;
- ser owner de uma ou mais features;
- permitir consulta das features que administra;
- permitir metadados administrativos extensíveis em `settings`, sem transformar cada novo metadado em coluna física.

Cardinalidade:

```text
Service 1 ───── N Feature
```

Uma `Feature` pertence a exatamente um `Service`.

O ownership é uma relação estrutural e **não deve ficar dentro de settings**.

---

## 3.2. Feature

`Feature` representa uma capacidade administrada da plataforma.

Responsabilidades:

- possuir código estável;
- possuir nome e descrição;
- pertencer exatamente a um `Service`;
- associar-se a zero ou mais `FeatureScopeType`;
- armazenar somente configuração operacional em `settings`;
- servir como chave de contexto para auditoria, quarentena e purge.

Exemplos:

```text
WORKSPACE
APPLICATION
ENVIRONMENT
PUBLISHER
MESSAGE
```

---

## 3.3. Relação Feature ↔ FeatureScopeType

Cardinalidade:

```text
Feature N ───── N FeatureScopeType
```

A associação deve ser explícita e persistida fora do JSON de `settings`.

Modelo conceitual:

```text
Feature
  │
  ├── owner ──> Service
  │
  └── scopes ──> FeatureScopeType
```

A feature Platform pode consultar o catálogo de scopes da Foundation. A Foundation não pode depender da feature Platform.

Essa relação permite responder perguntas como:

```text
Quais features compõem o PROMOTION_ENGINE?
Quais scopes utilizam a feature X?
Quais capacidades do service Y aparecem em determinado agrupador?
```

---

# 4. Persistência

Os nomes físicos finais podem ser ajustados durante a implementação, mas o modelo conceitual deve preservar as relações abaixo.

## 4.1. Services

Tabela conceitual:

```text
services
```

Campos mínimos:

```text
identifier
code
name
description
lifecycle_code
settings
created_at
updated_at
```

O `code` deve ser estável e único.

Exemplo:

```text
workspace-service
```

### 4.1.1. Metadados administrativos do Service

`Service` terá um campo:

```text
settings
```

para metadados administrativos e operacionais que podem evoluir ao longo do tempo sem exigir nova coluna para cada informação.

Exemplos de metadados:

```json
{
  "language": "java",
  "repositoryUrl": "https://github.com/empresa/workspace-service",
  "gatewayUrl": "https://gateway.empresa.com/workspace-service",
  "documentationUrl": "https://docs.empresa.com/workspace-service"
}
```

Possíveis metadados futuros:

- observabilidade;
- dashboard;
- pipeline;
- catálogo de API;
- documentação técnica;
- URL de suporte;
- ownership técnico;
- runtime/framework;
- outras referências rápidas úteis ao time administrador da plataforma.

Esses valores **não devem virar atributos fixos da entidade apenas por existirem como metadado**.

A entidade continua enxuta:

```text
Service
├── code
├── name
├── description
├── lifecycle
├── features
└── settings
```

O `code` permanece o identificador técnico canônico do Service.

Para aplicações Spring:

```text
Service.code == spring.application.name
```

Exemplo:

```text
workspace-service
```

### 4.1.2. Schema de metadados do Service

O conteúdo de `Service.settings` não deve ser um JSON livre sem governança.

A Platform deve validá-lo através da feature de Schema.

Contrato conceitual inicial:

```text
schema       = service-metadata
resourceType = MICROSERVICE
```

O schema poderá possuir múltiplas versões e lifecycle próprio.

No create/update de Service:

```text
Create/Update Service
        ↓
resolver schema service-metadata
        ↓
buscar última versão PUBLISHED
        ↓
validar settings
        ↓
persistir Service
```

Regras:

- o Service **não persiste `schemaVersion`**;
- a versão do schema é resolvida no momento da operação;
- novos cadastros e novas alterações usam a última versão `PUBLISHED`;
- Services antigos não são migrados retroativamente apenas porque uma nova versão do schema foi publicada;
- eventual histórico da versão aplicada pode ser registrado por Audit/Event, sem poluir a entidade Service.

A validação deve rejeitar `settings` incompatível com o schema vigente.

### 4.1.3. Language

`language` é um metadado técnico importante do Service, porém permanece dentro de `settings` nesta modelagem.

Exemplos:

```text
java
python
go
nodejs
```

A governança dos valores aceitos deve ser feita pelo schema correspondente. Caso a Platform utilize `LanguageType` como vocabulário oficial, o schema deve refletir os valores permitidos desse catálogo, evitando criar uma segunda fonte semântica independente.

---

## 4.2. Features

Tabela conceitual:

```text
features
```

Campos mínimos:

```text
identifier
code
name
description
service_identifier
lifecycle_code
settings
created_at
updated_at
```

`service_identifier` representa ownership estrutural da feature.

Não armazenar:

```json
{
  "service": "workspace-service"
}
```

em `settings`.

---

## 4.3. Associação de scopes

Tabela associativa conceitual:

```text
feature_scopes
```

Responsabilidade:

```text
Feature N:N FeatureScopeType
```

Exemplo de campos:

```text
feature_identifier
feature_scope_code
```

`feature_scope_code` referencia semanticamente o catálogo `FeatureScopeType` da Foundation conforme o padrão de integração adotado no serviço.

---

# 5. Settings da Feature

`settings` permanece na entidade `Feature`, porém exclusivamente para política operacional.

Formato inicial:

```json
{
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

Não fazem parte de `settings`:

- owner/service;
- scopes;
- identifier;
- lifecycle;
- relações estruturais.

---

## 5.1. Validação forte de settings

`Feature.settings` será validado pelo schema associado ao tipo de Feature. Nesta etapa, a validação forte do JSON fica deliberadamente adiada até a implementação da feature de Schema; este refinamento deverá ser revisitado nessa fase. Até lá, a Platform persiste o JSON sem duplicar um validador provisório.

Contrato inicial:

### quarantine

```text
enabled: boolean obrigatório
retentionDays: inteiro >= 0 obrigatório
restoreAllowed: boolean obrigatório
```

### audit

```text
enabled: boolean obrigatório
snapshotOnPurge: boolean obrigatório
```

### purge

```text
enabled: boolean obrigatório
```

A validação deve rejeitar estrutura incompatível com o contrato vigente.

A validação do owner não faz mais parte da validação de `settings`: a existência e validade do `Service` pertencem à regra de relacionamento do domínio.

---

# 6. Exemplos

## 6.1. WORKSPACE

Relações:

```text
Feature: WORKSPACE
Service: workspace-service
Scopes: conforme composição funcional cadastrada
```

Settings:

```json
{
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

## 6.2. MESSAGE

```json
{
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

Mesmo com retenção zero:

```text
QUARANTINED
    ↓
PURGED
```

`PURGED` continua sendo fato/evento histórico e não lifecycle.

---

# 7. View de runtime

Preservar o contrato:

```text
vw_feature_runtime_config
```

A view passa a ser responsabilidade da `feature.platform`.

Objetivos:

- fornecer contrato tabular estável;
- esconder a representação de `settings`;
- resolver o owner `Service` pela relação estrutural;
- expor política operacional;
- evitar que audit/quarantine/purge dependam do modelo interno da feature Platform.

Colunas propostas:

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

Consumidores não devem interpretar diretamente o JSON de `Feature.settings`.

---

# 8. Contrato com auditoria, quarentena e purge

A `feature_code` permanece como chave operacional.

Fluxo:

```text
feature_code
     ↓
vw_feature_runtime_config
     ↓
Service owner
     ↓
quarantine policy
     ↓
audit policy
     ↓
purge policy
```

O consumidor não precisa receber `service` separadamente para descobrir a configuração.

---

# 9. Lifecycle transversal

O catálogo transversal continua na Foundation:

```text
ACTIVE
INACTIVE
QUARANTINED
```

`PENDING_DELETION` deve ser substituído por `QUARANTINED` conforme a migração do conceito.

`PURGED` não pertence ao catálogo de lifecycle.

Toda entidade que utiliza lifecycle deve consumir `LifecycleTypeCode`, e cada agregado continua responsável por suas transições permitidas.

---

# 10. CatalogCode

## 10.1. platform-libraries

`AbstractCatalogCode` permanece como abstração reutilizável responsável por:

- valor;
- validação semântica comum;
- igualdade;
- hashCode;
- representação textual;
- suporte à persistência;
- ausência de conhecimento sobre catálogos concretos.

## 10.2. Foundation

VOs semânticos de catálogos transversais continuam junto aos respectivos catálogos.

Exemplos:

```text
LifecycleTypeCode
WorkspaceTypeCode
FeatureScopeTypeCode
EnvironmentTypeCode
PublisherScopeTypeCode
...
```

## 10.3. Mudança em relação à versão anterior

Não criar/manter `ServiceTypeCode` e `FeatureTypeCode` como consequência automática desta abstração.

`Service` e `Feature` agora são entidades da `feature.platform`; seus códigos fazem parte do modelo dessas entidades e devem seguir a estratégia de Value Object definida para o domínio, sem reintroduzi-los artificialmente como catálogos da Foundation.

---

# 11. Casos de uso da feature Platform

A feature deve possuir casos de uso próprios para administração.

## Service

No mínimo:

```text
CreateService
UpdateService
FindServiceById
FindAllServices
ActivateService
InactivateService
DeleteService
```

## Feature

No mínimo:

```text
CreateFeature
UpdateFeature
FindFeatureById
FindAllFeatures
ActivateFeature
InactivateFeature
DeleteFeature
```

## Associação de scopes

Prever operações para:

- associar scope a feature;
- remover associação;
- consultar features por scope;
- consultar scopes de uma feature.

A nomenclatura final deve seguir o padrão de use cases já adotado pela Golden Reference.

---

# 12. Regras de domínio essenciais

1. Uma Feature pertence a exatamente um Service.
2. O Service informado deve existir e estar em estado permitido para associação.
3. Ownership não é settings.
4. Feature pode participar de vários FeatureScopeTypes.
5. FeatureScopeType pode agrupar várias Features.
6. Associação de scope não é settings.
7. Settings contém apenas política operacional.
8. Settings inválido não pode ser persistido.
9. A Foundation não depende da feature Platform.
10. A view runtime é o contrato de leitura transversal para consumidores técnicos.
11. Alterações de relacionamento devem preservar integridade e não deixar associações órfãs.

---

# 13. Ordem de implementação futura

Este documento consolida o desenho. A implementação deve ser feita posteriormente em branch própria do `account-service`.

## Etapa 1 — CatalogCode/Foundation

Concluir e validar a abstração `AbstractCatalogCode` e os VOs realmente consumidos pelos domínios.

## Etapa 2 — criar feature.platform

Criar estrutura de domínio, use cases, repositories e infraestrutura.

## Etapa 3 — migrar ServiceType → Service

- remover responsabilidade administrativa de `foundation.catalog.servicetype`;
- criar entidade `Service`;
- migrar dados existentes;
- preservar códigos estáveis.

## Etapa 4 — migrar FeatureType → Feature

- remover responsabilidade administrativa de `foundation.catalog.featuretype`;
- criar entidade `Feature`;
- transformar owner em relação estrutural com `Service`;
- remover `service` do JSON;
- preservar política operacional em `settings`.

## Etapa 5 — scopes

- manter `FeatureScopeType` na Foundation;
- criar associação N:N na feature Platform;
- migrar vínculos existentes, quando houver.

## Etapa 6 — view

Adaptar `vw_feature_runtime_config` ao novo modelo físico sem alterar desnecessariamente seu contrato externo.

## Etapa 7 — testes

Cobrir domínio, settings, relações, scopes, view e arquitetura.

---

# 14. Migração e compatibilidade

A migração não deve quebrar consumidores existentes da view.

Princípios:

- preservar `feature_code`;
- preservar `service_code`;
- preservar semântica de quarantine/audit/purge;
- retirar gradualmente ownership do JSON;
- migrar associações de scope para estrutura explícita;
- eliminar classes/tabelas antigas somente depois da migração dos consumidores;
- não manter dois modelos concorrentes após a conclusão.

Não criar compatibilidade permanente entre `ServiceType/FeatureType` e `Service/Feature`.

---

# 15. Testes esperados

## Service

- criação válida;
- código duplicado;
- lifecycle;
- tentativa de associação de feature a service inválido/inativo conforme regra definida.

## Feature

- criação válida;
- owner obrigatório;
- settings válido;
- settings estruturalmente inválido;
- retention zero;
- retention positiva;
- flags com tipo inválido.

## Scopes

- associação Feature ↔ FeatureScopeType;
- múltiplos scopes por feature;
- múltiplas features por scope;
- scope inexistente/inativo conforme regra do catálogo;
- remoção de associação;
- ausência de órfãos.

## View

- Feature → Service;
- projeção correta de settings;
- booleanos;
- retention;
- inatividade;
- contrato preservado.

## Arquitetura

- Foundation não depende de `feature.platform`;
- `feature.platform` pode consumir tipos da Foundation;
- consumidores transversais usam a view/contrato, não o JSON interno.

---

# 16. Critérios de aceite

O refinamento arquitetural será considerado implementado quando:

- [ ] `AbstractCatalogCode` estiver consolidado na `platform-libraries`;
- [ ] catálogos transversais permanecerem na Foundation;
- [ ] `FeatureScopeType` permanecer na Foundation;
- [ ] `ServiceType` não existir mais como catálogo administrativo da Foundation;
- [ ] `FeatureType` não existir mais como catálogo administrativo da Foundation;
- [ ] existir `feature.platform`;
- [ ] existir entidade `Service`;
- [ ] existir entidade `Feature`;
- [ ] Service 1:N Feature estiver modelado explicitamente;
- [ ] ownership de Service não estiver em `Feature.settings`;
- [ ] Feature N:N FeatureScopeType estiver modelado fora de settings;
- [ ] settings possuir apenas política operacional;
- [ ] validação de `Feature.settings` integrada à feature de Schema (adiada deliberadamente até essa implementação);
- [ ] `vw_feature_runtime_config` continuar existindo como contrato estável;
- [ ] a view for responsabilidade da feature Platform;
- [ ] Foundation não depender da feature Platform;
- [ ] testes de arquitetura, domínio e integração estiverem verdes;
- [ ] `mvn clean verify` passar;
- [ ] CI passar.

---

# 17. Fora de escopo desta consolidação

Este commit de documentação **não deve alterar o `account-service`**.

Também não implementar neste momento:

- scheduler real de purge;
- worker de quarentena;
- consumo real pelo audit-service;
- cemitério de auditoria;
- snapshot de purge;
- hard delete automático;
- orquestração entre microserviços.

Essas atividades dependem da implementação posterior do modelo consolidado.

---

# 18. Resultado esperado

Arquitetura alvo:

```text
platform-libraries
└── AbstractCatalogCode

workspace-service
├── foundation
│   └── catalog
│       ├── lifecycletype
│       ├── workspacetype
│       ├── featurescopetype
│       └── demais catálogos transversais
│
└── feature
    └── platform
        ├── domain
        │   ├── Service
        │   └── Feature
        ├── repository
        ├── usecase
        └── infra
```

Relacionamentos:

```text
Service 1 ───── N Feature

Feature N ───── N FeatureScopeType
                      │
                      └── Foundation
```

Runtime:

```text
Service + Feature + Feature.settings
              ↓
vw_feature_runtime_config
              ↓
audit / quarantine / purge
```

A principal fronteira fica explícita:

> **Foundation define o vocabulário transversal; feature.platform administra a composição e o comportamento operacional da plataforma.**
