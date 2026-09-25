# Refinamento — Platform: Service, Feature e FeatureContext

## 1. Objetivo

Refatorar o contexto `feature.platform` para que a gestão estrutural da plataforma seja composta por três recursos administrativos coesos:

- `Service`
- `Feature`
- `FeatureContext`

O principal objetivo desta evolução é remover completamente o conceito `FeatureScopeType` da `foundation` e promovê-lo para um recurso de domínio próprio dentro de `feature.platform`.

A implementação deve seguir o padrão Golden já utilizado para `Service` e `Feature`, sem reutilizar o modelo genérico de catálogo como base do novo CRUD.

---

## 2. Semântica oficial

A nomenclatura do domínio deve seguir esta definição:

### Service

Representa **quem oferece** uma capacidade da plataforma.

Exemplos:

- `PORTAL_MANAGER`
- `AUDIT_SERVICE`
- `MESSAGE_SERVICE`

### Feature

Representa **a capacidade funcional oferecida**.

Exemplos:

- `WORKSPACE`
- `APPLICATION`
- `PROMOTION_ENGINE`
- `MICRO_FRONTEND`
- `MESSAGE_MANAGEMENT`

### FeatureContext

Representa **o contexto funcional no qual uma ou mais Features são disponibilizadas**.

O `FeatureContext` funciona como um agrupador funcional de navegação e disponibilidade dentro do portal.

Exemplos conceituais:

- contexto de abertura do portal;
- contexto de contas Manager;
- contexto de contas Admin;
- contexto de catálogos;
- outros agrupamentos funcionais que venham a surgir.

Um `FeatureContext` não representa a capacidade em si. A capacidade continua sendo a `Feature`.

---

## 3. Decisão arquitetural

O antigo:

`foundation.catalog.featurescopetype.FeatureScopeType`

deve deixar de existir.

O novo recurso deve residir em:

`feature.platform`

com nome de domínio:

`FeatureContext`

A `foundation` não deve manter dependência, catálogo ou conhecimento específico desse conceito.

A estrutura de `feature.platform` passa a ser responsável integralmente pela administração de:

- Services;
- Features;
- FeatureContexts;
- associação entre Features e FeatureContexts.

---

## 4. FeatureContext não é catálogo

O novo `FeatureContext` deve ser implementado como um CRUD próprio.

Não utilizar como base:

- `CatalogEntity`;
- `CatalogController`;
- `CatalogService`;
- estruturas genéricas de catálogo da `platform-libraries`.

O recurso deve seguir o mesmo modelo arquitetural utilizado por `Service` e `Feature`:

- entidade de domínio;
- repository;
- command use case;
- query use case;
- Inputs;
- Outputs;
- request/response web;
- controller;
- testes de domínio;
- testes de use case;
- testes de persistência;
- testes de API.

---

## 5. Relacionamento Feature x FeatureContext

A relação permanece:

`Feature N:N FeatureContext`

### Justificativa

Uma Feature pode estar disponível em vários contextos funcionais.

Um mesmo FeatureContext pode disponibilizar várias Features.

Exemplo:

`MANAGER_ACCOUNT`

pode agrupar:

- `APPLICATION`;
- `PROMOTION_ENGINE`;
- `ACCOUNT_CONFIGURATION`;
- `MICRO_FRONTEND`.

Da mesma forma, uma Feature poderá ser utilizada em mais de um FeatureContext quando fizer sentido para o produto.

### Regra atual

A relação N:N não deve possuir atributos próprios neste momento.

Se no futuro surgirem propriedades específicas da combinação, como:

- ordem;
- prioridade;
- visibilidade;
- política;
- configuração;
- override;

a associação poderá ser promovida para uma entidade de domínio própria.

Não antecipar essa complexidade nesta implementação.

---

## 6. Modelo de dados

Criar tabela:

`platform_feature_contexts`

Campos mínimos:

- `id`;
- `version`;
- `identifier`;
- `code`;
- `name`;
- `description`;
- `lifecycle_code`;
- `created_at`;
- `updated_at`.

Criar tabela associativa entre Feature e FeatureContext.

Nome sugerido:

`platform_feature_context_relations`

Campos:

- `feature_id`;
- `feature_context_id`.

A chave primária deve impedir associações duplicadas.

Manter FKs explícitas.

---

## 7. Identificador e versionamento

`Service`, `Feature` e `FeatureContext` devem seguir o mesmo padrão:

- PK técnica numérica;
- `identifier` UUID de 36 caracteres, único e imutável;
- `@Version` para optimistic locking;
- lifecycle estrutural.

---

## 8. Regras transversais de code e name

A regra abaixo é obrigatória para os três recursos:

- `Service`;
- `Feature`;
- `FeatureContext`.

### 8.1 Code

`code` é obrigatório, único dentro de cada tipo de recurso e representa o identificador técnico interno.

O formato de `code` deve seguir o padrão técnico:

- somente letras maiúsculas;
- números permitidos quando aplicável;
- separação por underscore;
- nenhum espaço;
- nenhuma letra minúscula;
- nenhum hífen;
- nenhuma normalização silenciosa.

Exemplos válidos:

- `PORTAL_MANAGER`
- `MANAGER_ACCOUNT`
- `PROMOTION_ENGINE`
- `MICRO_FRONTEND`
- `ACCOUNT_CONFIGURATION`

Exemplos inválidos:

- `Portal Manager`
- `portal_manager`
- `MANAGER ACCOUNT`
- `manager-account`
- `ManagerAccount`

A API deve rejeitar `code` fora do padrão. Não converter automaticamente lowercase para uppercase e não substituir espaços ou hífens.

A validação de formato deve ser compartilhada dentro de `feature.platform`, sem duplicar regex entre Service, Feature e FeatureContext.

### 8.2 Name

`name` é obrigatório, amigável para exibição e pode conter espaços, letras minúsculas/maiúsculas e demais caracteres permitidos pelo campo.

Não aplicar ao `name` a regra técnica de uppercase + underscore.

### 8.3 Unicidade de name

`name` deve ser único dentro de cada tipo de recurso.

Portanto:

- não podem existir dois Services com o mesmo name;
- não podem existir duas Features com o mesmo name;
- não podem existir dois FeatureContexts com o mesmo name.

A unicidade deve existir em dois níveis:

1. regra de aplicação;
2. constraint UNIQUE no banco.

### 8.4 Validação de name

A aplicação deve rejeitar `name` nulo ou em branco e preservar exatamente o valor amigável informado pelo usuário, sem normalização técnica.

---

## 9. Code

O `code` é o identificador técnico e funcional estável de `Service`, `Feature` e `FeatureContext`.

O `name` é o nome amigável exibido ao usuário.

Os dois campos são obrigatórios e únicos por tipo de recurso, mas possuem responsabilidades diferentes e não devem ser tratados como sinônimos.

---

## 10. Lifecycle

Aplicar o mesmo lifecycle estrutural utilizado em Platform:

- `ACTIVE`;
- `INACTIVE`;
- `QUARANTINED`.

Não introduzir `PENDING_DELETION`.

### FeatureContext

Um FeatureContext:

- nasce ACTIVE;
- pode ser inativado;
- pode ser reativado;
- pode ser colocado em QUARANTINED conforme fluxo de exclusão.

### Associação

Não permitir associar uma Feature a FeatureContext inativo ou quarantined.

---

## 11. Exclusão e integridade

Não permitir colocar um `FeatureContext` em quarentena enquanto existir Feature associada.

A remoção da associação deve ocorrer explicitamente antes.

Da mesma forma, preservar as regras atuais de integridade entre Service e Feature.

Não usar cascade destrutivo para mascarar dependências de domínio.

---

## 12. Refatoração da entidade Feature

Remover:

`Set<FeatureScopeType>`

Adicionar:

`Set<FeatureContext>`

A entidade `Feature` continua dona da operação de associação/desassociação em domínio.

Exemplos de comportamento esperado:

- `addContext(...)`;
- `removeContext(...)`.

Não expor coleção mutável.

---

## 13. APIs administrativas

### Services

Preservar a API atual:

`/api/v1/platform/services`

### Features

Preservar a API atual:

`/api/v1/platform/features`

### FeatureContexts

Criar:

`/api/v1/platform/contexts`

Operações esperadas:

- POST;
- GET list;
- GET by identifier;
- PUT;
- PATCH activate;
- PATCH inactivate;
- DELETE lógico/quarantine.

### Associação Feature x FeatureContext

A API deve permitir:

- associar contexto à Feature;
- remover contexto da Feature;
- consultar contextos da Feature;
- filtrar Features por contexto.

Os nomes dos endpoints devem seguir o padrão atual da API Platform.

---

## 14. Autorização

A administração de:

- Service;
- Feature;
- FeatureContext;

deve exigir:

`AuthorizationLevel.OWNER`

Preservar o padrão utilizado atualmente pelos controllers administrativos de Platform.

---

## 15. Auditoria

Operações de escrita devem manter `@Auditable`.

Cobrir:

- criação;
- atualização;
- ativação;
- inativação;
- delete/quarantine;
- associação;
- desassociação.

Usar `identifier` como resource id sempre que aplicável.

---

## 16. Migração de banco

Criar nova migration após a V12.

Não alterar a V12 já entregue na main.

A migration deve:

1. criar `platform_feature_contexts`;
2. migrar os registros existentes de `type_feature_scopes`;
3. preservar o máximo possível de:
   - code;
   - label/name;
   - description;
   - estado ativo/inativo;
4. converter a associação atual `platform_feature_scopes` para a nova associação Feature x FeatureContext;
5. atualizar FKs;
6. atualizar queries e repositories;
7. remover estruturas antigas somente após a migração segura;
8. remover `type_feature_scopes` quando não houver mais dependência;
9. remover `platform_feature_scopes` quando substituída pela nova tabela;
10. manter rollback conceitualmente seguro via migração forward-only, sem depender de edição de migration anterior.

---

## 17. Compatibilidade de views

Revisar:

`vw_feature_runtime_config`

Não quebrar o contrato existente para consumidores que não dependam da mudança de nomenclatura.

Se a view atualmente não expõe scopes/contexts, preservar suas colunas atuais.

Se for necessário expor contexto futuramente, isso deve ser uma evolução explícita de contrato, e não uma mudança lateral não documentada.

---

## 18. Remoção completa do legado

Ao concluir a implementação, não devem permanecer referências de runtime para:

- `FeatureScopeType`;
- package `foundation.catalog.featurescopetype`;
- repository do catálogo antigo;
- service do catálogo antigo;
- controller do catálogo antigo;
- `type_feature_scopes`;
- associação `platform_feature_scopes`.

Pesquisar o projeto inteiro antes de considerar a atividade concluída.

---

## 19. Foundation

A Foundation deve permanecer independente de `feature.platform`.

Após a mudança:

- Foundation não conhece FeatureContext;
- Foundation não conhece Feature;
- Foundation não conhece Service;
- Platform pode consumir conceitos realmente transversais da Foundation, como lifecycle.

Os testes de arquitetura devem continuar garantindo essa direção de dependência.

---

## 20. Contratos de use case

Seguir o padrão Golden já aplicado em Platform.

Command e Query Services devem trabalhar por contratos explícitos.

Exemplos:

- `CreateFeatureContextInput`;
- `UpdateFeatureContextInput`;
- `FeatureContextOutput`.

Não expor entidade JPA diretamente no controller.

---

## 21. Testes obrigatórios

### Domínio

Cobrir no mínimo:

- criação válida;
- code inválido;
- code lowercase;
- code com espaço ou hífen;
- name amigável com espaço/lowercase;
- name duplicado;
- lifecycle;
- associação com Feature;
- tentativa de associação com FeatureContext inativo;
- remoção de associação;
- tentativa de quarantine com Feature associada.

### Use case

Cobrir:

- duplicidade;
- not found;
- create;
- update;
- activate;
- inactivate;
- delete/quarantine;
- associate;
- remove association.

### Persistência

Cobrir:

- UNIQUE de name;
- optimistic locking;
- N:N;
- leitura fora da fronteira transacional sem LazyInitializationException.

### Migração

Criar teste específico começando da versão anterior à migration nova.

Validar:

- dados migrados;
- associações preservadas;
- lifecycle preservado;
- estrutura antiga removida;
- nova estrutura criada;
- views continuam válidas.

### API

Cobrir fluxo administrativo completo de FeatureContext e relacionamento com Feature.

### Arquitetura

Executar e manter verde:

`GoldenArchitectureTest`

---

## 22. Critérios de aceite

A implementação somente pode ser considerada concluída quando:

1. `FeatureScopeType` tiver sido removido da Foundation;
2. `FeatureContext` existir como recurso administrativo de Platform;
3. Feature x FeatureContext estiver N:N estrutural;
4. Service, Feature e FeatureContext tiverem `code` obrigatório, único e validado no formato técnico definido, e `name` obrigatório, amigável e único;
5. constraints de banco estiverem presentes;
6. migration estiver coberta por teste;
7. APIs administrativas estiverem cobertas por integração;
8. não houver dependências residuais do catálogo antigo;
9. arquitetura permanecer verde;
10. `mvn clean verify` estiver GREEN no CI.

---

## 23. Restrições da implementação

Não fazer:

- validação forte de `Feature.settings` nesta atividade;
- migração da política de settings para Schema nesta atividade;
- promoção da relação Feature x FeatureContext para entidade própria sem necessidade;
- merge automático;
- alterações fora do contexto sem justificativa arquitetural.

A validação forte de `Feature.settings` continua postergada para a futura integração com a feature de Schema.

---

## 24. Fluxo de execução para o worker

1. Ler este refinamento integralmente.
2. Revisar o estado atual da main.
3. Criar branch específica para a mudança.
4. Mapear todas as referências de `FeatureScopeType`.
5. Implementar `FeatureContext`.
6. Refatorar Feature.
7. Implementar migration.
8. Ajustar Service/Feature para a regra transversal de `code` técnico e `name` amigável/único.
9. Implementar/ajustar APIs.
10. Implementar todos os testes.
11. Executar `mvn clean verify`.
12. Corrigir qualquer falha pela causa raiz.
13. Abrir PR.
14. Validar CI.
15. Fazer revisão arquitetural e funcional final.
16. Não realizar merge sem autorização explícita.

---

## 25. Resultado esperado

Ao final, `feature.platform` deve ser um contexto administrativo coeso:

```text
feature.platform
├── Service
├── Feature
└── FeatureContext
```

Com as relações:

```text
Service 1 ─── N Feature
Feature N ─── N FeatureContext
```

E com a responsabilidade semântica:

```text
Service        = quem oferece
Feature        = o que é oferecido
FeatureContext = em qual contexto funcional a capacidade é disponibilizada
```

Esse passa a ser o modelo oficial para a administração estrutural das capacidades da plataforma.
