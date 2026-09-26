# Message Catalog — Documento de Implementação

## 1. Objetivo

Implementar no `workspace-service` uma feature administrativa de **catálogo de mensagens** responsável pelo gerenciamento centralizado das mensagens utilizadas pelas APIs e pelas bibliotecas da plataforma.

O catálogo permitirá alterar mensagens em tempo de execução, sem necessidade de novo deploy dos serviços consumidores.

A `platform-messaging` continuará responsável pela **resolução** das mensagens. O `workspace-service` será responsável pela **administração** do catálogo.

---

## 2. Princípios da solução

A solução deve seguir os seguintes princípios:

1. O bundle local continua existindo em cada serviço como **fallback técnico**.
2. O catálogo persistido em banco representa a configuração dinâmica da plataforma.
3. Quando houver uma mensagem ativa no catálogo, ela deve prevalecer sobre o bundle local.
4. Quando não houver mensagem ativa no catálogo, a resolução deve cair para o bundle.
5. Mensagens inativas não devem ser retornadas pela fonte externa consultada pela `platform-messaging`.
6. O catálogo será administrado somente por owners/administradores da plataforma.
7. `code` e `httpStatus` também são administráveis em runtime.
8. A feature deve utilizar um catálogo de serviços da plataforma como referência.
9. A feature não deve criar um conceito paralelo de serviço/namespace.
10. A `platform-messaging` não deve possuir CRUD administrativo.

---

## 3. Pré-requisito bloqueante

Antes da implementação desta feature, deve existir no Foundation do `workspace-service` um **Service Catalog** consolidado.

Esse catálogo será a referência oficial para identificar o serviço proprietário de uma mensagem.

Exemplos conceituais:

- `workspace-service`
- `authorization-service`
- `catalog-service`
- `audit-service`

O catálogo de mensagens não deverá persistir o serviço apenas como string solta se houver uma entidade/catálogo oficial disponível.

> A implementação do Message Catalog só deve iniciar após a definição e disponibilização do Service Catalog.

---

## 4. Terminologia

### 4.1 Service

Representa o serviço proprietário da mensagem.

Exemplo:

```text
workspace-service
```

### 4.2 Message Key

Chave local da mensagem dentro de um serviço.

Exemplo:

```text
workspace.not-found
```

### 4.3 Global Message Key

Chave global utilizada pela `platform-messaging`.

É derivada de:

```text
<service>.<messageKey>
```

Exemplo:

```text
workspace-service.workspace.not-found
```

### 4.4 Bundle

Arquivo local de fallback carregado pela `platform-messaging`.

Exemplo:

```text
META-INF/platform-messages/workspace-service_pt_BR.properties
META-INF/platform-messages/workspace-service_en.properties
```

O nome do serviço presente no bundle deve permanecer coerente com o Service Catalog.

---

# 5. Modelo de domínio

A feature será dividida em duas entidades principais:

1. `Message`
2. `MessageTranslation`

`Message` é o agregado raiz.

`MessageTranslation` pertence obrigatoriamente a uma `Message`.

Contrato de referência de Service:

- externamente, requests/responses usam `serviceIdentifier` (UUID/36);
- internamente, `Message` persiste somente `service_id BIGINT`;
- o use case resolve `serviceIdentifier -> service_id` antes da persistência;
- a FK física aponta para `platform_services(id)`;
- o `service_id` técnico não deve aparecer em contratos HTTP.

---

## 6. Entidade Message

Representa os dados estruturais da mensagem.

### 6.1 Atributos

| Campo | Descrição |
|---|---|
| `id` | Identificador interno do banco |
| `identifier` | Identificador público UUID/string |
| `service_id` | FK interna `BIGINT` para `platform_services.id`; nunca exposta externamente |
| `message_key` | Chave local da mensagem |
| `code` | Código funcional/técnico da mensagem |
| `http_status` | HTTP status efetivo |
| `lifecycle_type_id` | Referência ao lifecycle |
| `version` | Controle de versão/concorrência |
| `created_at` | Data de criação |
| `updated_at` | Data da última alteração |

### 6.2 Exemplo

```text
service       = workspace-service
messageKey    = workspace.not-found
code          = WORKSPACE-0001
httpStatus    = 404
lifecycle     = ACTIVE
```

A chave global resultante será:

```text
workspace-service.workspace.not-found
```

---

## 7. Entidade MessageTranslation

Representa o conteúdo textual da mensagem para um locale.

### 7.1 Atributos

| Campo | Descrição |
|---|---|
| `id` | Identificador interno do banco |
| `identifier` | Identificador público UUID/string |
| `message_id` | FK para Message |
| `locale` | Locale da tradução |
| `message` | Texto principal |
| `solution` | Solução/orientação apresentada ao consumidor |
| `created_at` | Data de criação |
| `updated_at` | Data da última alteração |

### 7.2 Exemplo pt-BR

```text
locale   = pt-BR
message  = O workspace solicitado não foi encontrado.
solution = Verifique o identificador informado.
```

### 7.3 Exemplo en

```text
locale   = en
message  = The requested workspace was not found.
solution = Verify the provided identifier.
```

---

# 8. Constraints e unicidade

## 8.1 Message Key por serviço

Uma `messageKey` deve ser única dentro de um serviço.

```text
UNIQUE(service_id, message_key)
```

Exemplo permitido:

```text
workspace-service + validation.name.required
catalog-service   + validation.name.required
```

Exemplo inválido:

```text
workspace-service + validation.name.required
workspace-service + validation.name.required
```

---

## 8.2 Code por serviço

Um `code` deve ser único dentro de um serviço.

```text
UNIQUE(service_id, code)
```

Exemplo:

```text
workspace-service + WORKSPACE-0001
```

não pode existir duas vezes.

O mesmo código em outro serviço poderá existir somente se isso for permitido pelo catálogo/global convention da plataforma. Para esta feature, a regra definida é unicidade por serviço.

---

## 8.3 Translation por locale

Cada mensagem poderá possuir apenas uma tradução por locale.

```text
UNIQUE(message_id, locale)
```

Exemplo:

```text
Message X + pt-BR
Message X + en
```

são válidos.

Dois registros:

```text
Message X + pt-BR
Message X + pt-BR
```

não são permitidos.

---

# 9. Lifecycle

Para esta feature serão utilizados apenas dois estados:

```text
ACTIVE
INACTIVE
```

Não haverá `PENDING_DELETION`.

## 9.1 Criação

Toda mensagem deve ser criada inicialmente como:

```text
ACTIVE
```

## 9.2 Inativação

Transição permitida:

```text
ACTIVE -> INACTIVE
```

Ao ficar `INACTIVE`:

- permanece persistida;
- deixa de aparecer na resolução externa;
- deixa de sobrescrever o bundle;
- poderá ser reativada;
- poderá ser removida fisicamente.

## 9.3 Reativação

Transição permitida:

```text
INACTIVE -> ACTIVE
```

## 9.4 Delete físico

O delete físico será permitido apenas quando:

```text
lifecycle = INACTIVE
```

Caso a mensagem esteja `ACTIVE`, a operação deve ser rejeitada.

Não haverá, nesta primeira versão, prazo mínimo obrigatório entre inativação e delete físico.

Essa possibilidade poderá ser avaliada futuramente.

---

# 10. Regra de resolução

A resolução deve continuar centralizada na `platform-messaging`.

Fluxo esperado:

```text
messageKey
   ↓
cache
   ↓ miss
catálogo externo / view
   ↓ miss
bundle local
```

Exemplo:

```text
workspace-service.workspace.not-found
```

Para locale:

```text
pt-BR
```

### Quando existir registro ACTIVE

O catálogo prevalece.

### Quando não existir registro

Usar bundle local.

### Quando existir registro INACTIVE

Ele deve ser tratado como inexistente pela view/fonte de resolução.

Resultado:

```text
INACTIVE -> miss externo -> bundle local
```

---

# 11. Papel do bundle

O bundle continua obrigatório como fallback técnico.

Exemplo:

```text
workspace-service_pt_BR.properties
```

```properties
workspace.not-found=WORKSPACE-0001|404|O workspace solicitado não foi encontrado.|Verifique o identificador informado.
```

E:

```text
workspace-service_en.properties
```

```properties
workspace.not-found=WORKSPACE-0001|404|The requested workspace was not found.|Verify the provided identifier.
```

O catálogo em banco não elimina o bundle.

O bundle garante:

- fallback;
- resiliência;
- funcionamento sem dependência obrigatória do catálogo;
- configuração padrão entregue junto ao software.

---

# 12. Responsabilidade sobre HTTP status e code

Nesta arquitetura:

- `code` é administrável;
- `httpStatus` é administrável;
- alterações não exigem redeploy do serviço consumidor.

Essa decisão é intencional.

A governança do contrato HTTP externo está associada ao gateway.

O Message Catalog deve permitir que os administradores alinhem em runtime:

```text
code
httpStatus
message
solution
```

sem necessidade de reconstruir e publicar cada serviço consumidor.

---

# 13. APIs — Message

Base sugerida:

```text
/api/v1/messages
```

---

## 13.1 Criar Message

```http
POST /api/v1/messages
```

Responsabilidades:

- validar Service;
- validar unicidade de `messageKey`;
- validar unicidade de `code`;
- validar HTTP status;
- criar como `ACTIVE`;
- gerar `identifier`;
- inicializar `version`.

Exemplo conceitual:

```json
{
  "serviceIdentifier": "uuid-do-service",
  "messageKey": "workspace.not-found",
  "code": "WORKSPACE-0001",
  "httpStatus": 404
}
```

---

## 13.2 Buscar por identifier

```http
GET /api/v1/messages/{identifier}
```

Deve retornar:

- dados estruturais;
- `serviceIdentifier`;
- lifecycle;
- version.

As traduções poderão ser retornadas separadamente pelo sub-recurso de translations.

---

## 13.3 Listar mensagens

```http
GET /api/v1/messages?serviceIdentifier={serviceIdentifier}
```

O filtro de serviço é opcional na administração.

Filtros adicionais poderão existir:

```text
messageKey
code
lifecycle
```

A coleção de mensagens deve possuir paginação.

Exemplo:

```http
GET /api/v1/messages?serviceIdentifier=<uuid-do-service>&active=true
```

---

## 13.4 Atualizar Message

```http
PUT /api/v1/messages/{identifier}
```

Pode alterar:

```text
messageKey
code
httpStatus
```

Deve respeitar:

- unicidade;
- versionamento;
- referência válida de Service;
- regras de lifecycle.

A alteração de Service deverá ser avaliada com cuidado durante a implementação. Preferencialmente, o Service não deve ser alterado após a criação, pois representa propriedade/domínio da mensagem.

---

## 13.5 Alterar lifecycle

```http
PATCH /api/v1/messages/{identifier}/lifecycle
```

Payload conceitual:

```json
{
  "lifecycle": "INACTIVE"
}
```

Estados permitidos:

```text
ACTIVE
INACTIVE
```

Transições:

```text
ACTIVE   -> INACTIVE
INACTIVE -> ACTIVE
```

---

## 13.6 Delete físico

```http
DELETE /api/v1/messages/{identifier}
```

Regra obrigatória:

```text
Message.lifecycle == INACTIVE
```

Caso contrário:

```text
operação rejeitada
```

Ao remover uma Message, suas translations também devem ser removidas conforme estratégia de integridade definida na implementação.

---

# 14. APIs — MessageTranslation

Translations serão sub-recursos de Message.

Base:

```text
/api/v1/messages/{messageIdentifier}/translations
```

---

## 14.1 Criar tradução

```http
POST /api/v1/messages/{messageIdentifier}/translations
```

Exemplo:

```json
{
  "locale": "pt-BR",
  "message": "O workspace solicitado não foi encontrado.",
  "solution": "Verifique o identificador informado."
}
```

Regras:

- Message deve existir;
- locale obrigatório;
- message obrigatório;
- `message + locale` não pode estar duplicado para a mesma Message;
- `solution` conforme contrato definido;
- validar locale suportado.

---

## 14.2 Listar traduções da Message

```http
GET /api/v1/messages/{messageIdentifier}/translations
```

Retorna todas as traduções da mensagem.

Não há necessidade de paginação nessa primeira versão.

---

## 14.3 Buscar tradução por locale

```http
GET /api/v1/messages/{messageIdentifier}/translations/{locale}
```

Exemplo:

```http
GET /api/v1/messages/{identifier}/translations/pt-BR
```

---

## 14.4 Atualizar tradução

```http
PUT /api/v1/messages/{messageIdentifier}/translations/{locale}
```

Permite alterar:

```text
message
solution
```

---

## 14.5 Remover tradução

```http
DELETE /api/v1/messages/{messageIdentifier}/translations/{locale}
```

Regra:

- remove apenas a tradução;
- não remove a Message pai;
- deve validar existência da Message e do locale.

---

# 15. View para platform-messaging

O `workspace-service` deverá disponibilizar uma view compatível com o contrato esperado pela `platform-messaging`.

A view deve expor exclusivamente mensagens `ACTIVE`.

Modelo conceitual:

```text
service
message_key
code
http_status
locale
message
solution
```

Exemplo:

| service | message_key | code | http_status | locale | message | solution |
|---|---|---|---:|---|---|---|
| workspace-service | workspace.not-found | WORKSPACE-0001 | 404 | pt-BR | O workspace solicitado não foi encontrado. | Verifique o identificador informado. |
| workspace-service | workspace.not-found | WORKSPACE-0001 | 404 | en | The requested workspace was not found. | Verify the provided identifier. |

A chave global poderá ser derivada por:

```text
service + "." + message_key
```

Exemplo:

```text
workspace-service.workspace.not-found
```

---

# 16. Comportamento de mensagens inativas

Mensagens `INACTIVE`:

- permanecem no banco;
- continuam visíveis para administração;
- não aparecem na view consumida pela `platform-messaging`;
- não sobrescrevem o bundle;
- podem ser reativadas;
- podem ser removidas fisicamente.

Esse estado representa o soft delete funcional desta feature.

---

# 17. Validações principais

## Message

Validar:

```text
service obrigatório
messageKey obrigatória
code obrigatório
httpStatus obrigatório
service existente
service ativo, conforme regra do Service Catalog
messageKey única por service
code único por service
httpStatus válido
lifecycle válido
version para updates
```

## MessageTranslation

Validar:

```text
message existente
locale obrigatório
locale válido/suportado
message obrigatório
unicidade message + locale
```

---

# 18. Segurança e autorização

Todas as APIs administrativas desta feature devem ser restritas aos perfis/grupos definidos para:

```text
Platform Owners
Platform Administrators
```

A autorização deve utilizar o mecanismo padrão da plataforma.

Não deverá existir acesso administrativo a esse catálogo para usuários comuns das aplicações.

---

# 19. Auditoria

Alterações no catálogo devem ser auditáveis.

Eventos relevantes:

```text
MESSAGE_CREATED
MESSAGE_UPDATED
MESSAGE_ACTIVATED
MESSAGE_INACTIVATED
MESSAGE_DELETED

MESSAGE_TRANSLATION_CREATED
MESSAGE_TRANSLATION_UPDATED
MESSAGE_TRANSLATION_DELETED
```

Como o módulo de auditoria da plataforma ainda está em evolução, a implementação deve utilizar o padrão vigente no momento da execução.

A ausência de integração final com auditoria não deve justificar duplicação de uma solução paralela.

---

# 20. Persistência

Modelo conceitual:

## message

```text
id
identifier
service_id
message_key
code
http_status
lifecycle_type_id
version
created_at
updated_at
```

Constraints:

```text
UNIQUE(service_id, message_key)
UNIQUE(service_id, code)
UNIQUE(identifier)
```

## message_translation

```text
id
identifier
message_id
locale
message
solution
created_at
updated_at
```

Constraints:

```text
UNIQUE(message_id, locale)
UNIQUE(identifier)
```

FK:

```text
message_translation.message_id -> message.id
message.service_id             -> service catalog
message.lifecycle_type_id      -> lifecycle catalog
```

---

# 21. Concorrência

`Message` deve possuir controle de versão otimista.

Campo:

```text
version
```

O objetivo é impedir perda silenciosa de atualização concorrente.

A estratégia deve seguir o padrão utilizado pelo Golden Reference.

---

# 22. Organização de código

A implementação deve respeitar o padrão arquitetural vigente no `workspace-service`.

Estrutura conceitual:

```text
message
├── domain
├── application
├── infrastructure
└── entrypoint
```

ou o equivalente definido pelo Golden Reference atual.

Princípios obrigatórios:

- controller não acessa repository diretamente;
- regras de negócio ficam fora da camada web;
- entidades não devem carregar dependências desnecessárias de infraestrutura;
- persistência deve seguir o padrão vigente;
- validações de domínio devem ser testáveis isoladamente.

---

# 23. Testes obrigatórios

## 23.1 Unitários

Cobrir:

- criação inicia ACTIVE;
- unicidade de `messageKey` por Service;
- unicidade de `code` por Service;
- criação de translation;
- duplicidade de locale;
- ACTIVE -> INACTIVE;
- INACTIVE -> ACTIVE;
- delete de ACTIVE rejeitado;
- delete de INACTIVE permitido;
- validação de Service;
- validação de HTTP status;
- atualização concorrente/version.

## 23.2 Integração

Cobrir APIs:

```text
POST Message
GET Message
GET collection com service obrigatório
PUT Message
PATCH lifecycle
DELETE Message

POST Translation
GET Translation
GET translations
PUT Translation
DELETE Translation
```

## 23.3 Integração com resolução

Cenários obrigatórios:

### Cenário 1 — catálogo ativo

```text
Existe Message ACTIVE + tradução pt-BR
```

Resultado:

```text
platform-messaging resolve pelo catálogo
```

### Cenário 2 — mensagem inativa

```text
Existe Message INACTIVE
```

Resultado:

```text
view não retorna
platform-messaging cai para bundle
```

### Cenário 3 — tradução inexistente

```text
Message existe
locale solicitado não existe no catálogo
```

Resultado:

```text
resolver segue fallback de locale/bundle conforme contrato da platform-messaging
```

### Cenário 4 — alteração em runtime

Atualizar:

```text
httpStatus
code
message
solution
```

Sem redeploy.

A resolução seguinte deve refletir os novos valores, respeitando eventual cache configurado.