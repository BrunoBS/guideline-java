# Refinamento V1 — Configuration

**Projetos:** workspace-service e platform-libraries  
**Status:** Especificação para execução por Worker — Golden Reference  
**Local:** docs/refinamento/14-configuration/configuration-refinement-v1.md

## 1. Objetivo e limites
Centralizar configurações internas da plataforma no workspace-service (MySQL 8 como fonte de verdade), publicar explicitamente versões aprovadas no Redis e consumi-las exclusivamente pela platform-libraries. DEV, HOMO e PROD possuem instalações/bancos próprios: **não** criar dimensão de ambiente lógico. Não introduzir outbox, cache local, fallback de microsserviço, filas ou composição de expressões na V1.

## 2. Decisões obrigatórias
- Cada Configuration pertence a um registro do catálogo **Microservice**, referenciado por `microservice_id`. O registro de código `PLATFORM` representa as configurações globais; verificar sua existência/proteção no catálogo existente, sem criar catálogo paralelo.
- A chave lógica/contrato do consumidor é `<microservice.code>.<key>`, exemplo `account-service.request.timeout`; o consumidor informa **a chave completa**. Não prefixar automaticamente e não consultar `PLATFORM` como fallback.
- `microservice_id` e `key` são imutáveis depois da criação; `key` é obrigatória, máximo 80 caracteres, única por microsserviço. Não incluir campo `name` ou cópia `microservice_code` na Configuration.
- `Microservice.code` permanece administrável somente pela owner conforme as regras atuais. Mudá-lo é mudança de contrato que pode quebrar consumidores de Configuration e mensagens de erro; registrar risco e exigir análise de impacto operacional, **sem** implementar migração automática nesta V1.
- Dois catálogos persistidos em `foundation.catalog`: ConfigurationType (`CONFIGURATION`, `EXPRESSION`) e ConfigurationStatus (`DRAFT`, `PUBLISHED`). Seguir modelo de catálogo Golden existente, inclusive migrations/seeds.
- Operator (`EQUALS`, `NOT_EQUALS`, `CONTAINS`, `NOT_CONTAINS`, `GREATER_THAN`, `GREATER_THAN_OR_EQUALS`, `LESS_THAN`, `LESS_THAN_OR_EQUALS`) e ValueType (`STRING`, `INTEGER`, `LONG`, `DECIMAL`) são **enums Java na feature**, não catálogos persistidos.
- `CONFIGURATION` aceita JSON válido; `EXPRESSION` aceita apenas JSON que passa no schema padrão V1. `value` é editável e **não** é publicado até ação explícita.

## 3. Persistência, domínio e invariantes
Criar `Configuration` em `feature.configuration` conforme separação domain/service/usecase/infra e Command/Query da Golden:
- `id` BIGINT PK; `identifier` UUID público único e obrigatório; `microservice_id` FK obrigatória; `key` VARCHAR(80) obrigatória; `description` VARCHAR(200) opcional; `type_id` FK ConfigurationType; `value` JSON MySQL obrigatório, mapeado para JsonNode; `published_value` JSON MySQL nullable, mapeado para JsonNode; `status_id` FK ConfigurationStatus; `active` BOOLEAN obrigatório default true; auditoria conforme convenção existente.
- Índice UNIQUE (`microservice_id`, `key`); integridade de FK e índices necessários às consultas/reconciliação. Não armazenar `microservice_code` duplicado.
- Estado inicial: `DRAFT`, `active=true`, `published_value` SQL NULL. JSON literal `null` em `value` é valor JSON válido; não confundir com SQL NULL em `published_value`. O Worker deve testar esse caso.
- Publicação: somente ativa e em DRAFT; copiar **integralmente** `value` para `published_value`, alterar status para PUBLISHED. `published_value` permanece imutável nas edições subsequentes até nova publicação.
- Atualização de `value` ou `type` de registro PUBLISHED: validar, salvar novos dados, voltar a DRAFT e **preservar** `published_value`. Não alterar Redis nessa edição. Alterar só descrição não precisa invalidar publicação.
- Inativação: `active=false`, `status=DRAFT`, limpar `published_value` para SQL NULL e solicitar remoção da chave Redis após commit. Reativação: `active=true`, `status=DRAFT`, `published_value` continua SQL NULL, sem publicação automática.
- Exclusão física permitida **somente se inativa**; excluir registro e remover eventual chave residual Redis após commit. Não criar versionamento adicional ou histórico na V1.
- Validar tamanho/formato de key, identidade do microsserviço, tipo, status, JSON e duplicidade. Usar mensagens i18n, exceptions e autorização existentes; nunca registrar payload de configuração em logs.

## 4. API e use cases — especificação ao Worker
Inspecionar controllers/rotas do workspace-service antes de fixar os caminhos concretos; respeitar o padrão Golden de Request/Response e identificador UUID. Implementar:
1. Create: recebe `microserviceIdentifier`, `key`, `description`, `type`, `value`; valida, persiste DRAFT ativo e **não escreve no Redis**.
2. Update: recebe apenas campos editáveis (`description`, `type`, `value`); rejeita tentativa de alterar microservice/key. Se `type` ou `value` mudarem, aplica regras de DRAFT/published_value; sem autopublicação.
3. FindById e FindAll: consulta ao banco, paginação/filtros por microsserviço, status, tipo, ativo e chave segundo padrão existente; Response administrativo não precisa expor `publishedValue` na UI.
4. Patch Activate e Patch Inactivate: use cases separados e idempotência definida/testada; inativação remove publicação.
5. Delete: somente INACTIVE; respeitar padrões de autorização/erros.
6. PublishById: valida ativo e DRAFT, valida novamente JSON Schema da expressão, persiste publicação, agenda atualização da chave Redis após commit.
7. PublishBatch: recebe lista não vazia de UUIDs, rejeita UUIDs repetidos, inexistentes, inativos, não-DRAFT ou valores inválidos; **validar todo o conjunto antes de alterar qualquer registro**, executar mudanças de todos os registros em **uma única transação do banco**; qualquer falha de validação/persistência reverte o lote inteiro. Não fazer chamadas Redis dentro da transação; após commit, sincronizar cada chave. Falha no Redis não reverte o banco e pode causar divergência temporária, corrigida pelo scheduler.
8. Não implementar endpoint de publicação automática em POST/PUT, publicação irrestrita de todas as configurações ou troca de key/microsserviço.
Respostas de publish devem diferenciar persistência confirmada de sincronização Redis falha/pendente; nunca declarar atomicidade distribuída. Garantir concorrência (lock/versionamento transacional ou estratégia equivalente) para impedir publicação de snapshot obsoleto, especialmente entre publish, update e inactivate.

## 5. Redis, reconciliação e consistência
- Redis é armazenamento runtime; consumidores não acessam MySQL/HTTP para resolver configuração. Publicar um **envelope JSON** com `type` e `value` publicado (não `value` de DRAFT), para `ConfigurationProvider` distinguir CONFIGURATION de EXPRESSION.
- Chave de consumo pública `<microservice.code>.<key>`; convenção física Redis V1: `config:<microservice.code>.<key>` (prefixo `config:` é interno à biblioteca). Exemplo `config:account-service.request.timeout`. A biblioteca recebe a chave pública completa e só adiciona `config:`, sem adivinhar microsserviço. Validar/escapar ambiguidades e colisões; não apagar namespaces alheios.
- Publicação individual/em lote e inativação sincronizam Redis **após commit**, via serviço único de sincronização idempotente; falha gera log estruturado (identificador/chave/correlation-id, sem payload) e sinalização apropriada.
- Scheduler de reconciliação aproximadamente horário, seguindo infraestrutura de agendamento existente: consultar todas as configurações com `active=true` e `published_value IS NOT NULL`, inclusive status DRAFT que preserva versão anterior; repor chaves ausentes/desatualizadas e remover chaves obsoletas/inativas/nunca publicadas do namespace gerenciado. Não publicar `value` de DRAFT.
- Redis sem TTL na V1; Redis vazio/indisponível deve recuperar por reconciliação. Considerar múltiplas instâncias e concorrência para não sobrescrever versão mais recente; não adicionar dependência de lock sem autorização. Se infraestrutura atual não permitir garantia segura, relatar bloqueio no checkpoint arquitetural antes de implementar.
- Uma publicação confirmada no banco pode ainda não estar visível no Redis; documentar consistência eventual. Falha Redis **não** é motivo para rollback da transação já commitada.

## 6. platform-libraries — módulo de consumo
Criar módulo/componente compartilhado de configuração, com nome final alinhado à estrutura real do projeto (sugestão: `platform-configuration`), auto-configurável pelo Spring Boot quando habilitado e com conexão Redis provida pela infraestrutura padrão.

### Contrato V1 aprovado para implementação

Armazenar valores como JSON válido (inclusive string, número, booleano, array e objeto), sem coluna de tipo. O `ConfigurationProvider` lê exclusivamente Redis e retorna um `ConfigurationValue` que encapsula a navegação e conversão, sem expor `JsonNode` ao consumidor.

```java
public interface ConfigurationProvider {
    ConfigurationValue get(String key);
}

public interface ConfigurationValue {
    ConfigurationValue path(String path);

    String asString();
    String asString(String defaultValue);
    Integer asInteger();
    Integer asInteger(Integer defaultValue);
    Boolean asBoolean();
    Boolean asBoolean(Boolean defaultValue);
    Double asDouble();
    Double asDouble(Double defaultValue);
    BigDecimal asBigDecimal();
    BigDecimal asBigDecimal(BigDecimal defaultValue);

    <T> T as(Class<T> type);
    <T> T as(Class<T> type, T defaultValue);
    Long asLong();
    Long asLong(Long defaultValue);
    <T> List<T> asList(Class<T> elementType);
    <T> List<T> asList(Class<T> elementType, List<T> defaultValue);
    boolean matches(Object candidate);
    boolean matches(Object candidate, boolean defaultValue);
}
```

`path("retry.attempts")` navega propriedades aninhadas; `path("retry")` seleciona um objeto interno. Especificar e testar tratamento de nomes literais contendo ponto e acesso a arrays, sem ambiguidade. `as(Class<T>)` usa Jackson para converter JSON em objeto do consumidor. Para listas parametrizadas e mapas tipados, estudar `JavaType`/`TypeReference<T>` em evolução separada, pois `Class<T>` não preserva parâmetros genéricos.

### Exemplos completos de consumo

Considere os valores publicados:

```text
platform.quarantineDays = 30
platform.applicationName = "Portal Manager"
platform.amount = 19.90
platform.enabled = true
platform.settings = {
  "enabled": true,
  "timeout": 60,
  "retry": { "attempts": 3, "interval": 1000 },
  "database": { "poolSize": 20, "connectionTimeout": 5000 }
}
```

**Valores simples:**

```java
Integer days = configurationProvider.get("platform.quarantineDays").asInteger();
String name = configurationProvider.get("platform.applicationName").asString();
BigDecimal amount = configurationProvider.get("platform.amount").asBigDecimal();
Boolean enabled = configurationProvider.get("platform.enabled").asBoolean();
```

**Atributos de JSON, inclusive aninhados:**

```java
Boolean enabled = configurationProvider.get("platform.settings")
    .path("enabled").asBoolean();
Integer timeout = configurationProvider.get("platform.settings")
    .path("timeout").asInteger();
Integer attempts = configurationProvider.get("platform.settings")
    .path("retry.attempts").asInteger();
Integer poolSize = configurationProvider.get("platform.settings")
    .path("database.poolSize").asInteger();
```

**Classes de negócio e conversão de subobjeto:**

```java
public record RetrySettings(Integer attempts, Integer interval) {}
public record DatabaseSettings(Integer poolSize, Integer connectionTimeout) {}
public record PlatformSettings(
    Boolean enabled, Integer timeout,
    RetrySettings retry, DatabaseSettings database
) {}

PlatformSettings settings = configurationProvider.get("platform.settings")
    .as(PlatformSettings.class);
RetrySettings retry = configurationProvider.get("platform.settings")
    .path("retry").as(RetrySettings.class);
```

**Sobrecargas com default (valores simples e objetos):**

```java
Integer days = configurationProvider.get("platform.quarantineDays").asInteger(30);
String name = configurationProvider.get("platform.applicationName").asString("Portal Manager");
Boolean enabled = configurationProvider.get("platform.enabled").asBoolean(false);
BigDecimal amount = configurationProvider.get("platform.amount").asBigDecimal(BigDecimal.ZERO);
Integer attempts = configurationProvider.get("platform.settings")
    .path("retry.attempts").asInteger(3);

RetrySettings defaultRetry = new RetrySettings(3, 1000);
RetrySettings retry = configurationProvider.get("platform.settings")
    .path("retry").as(RetrySettings.class, defaultRetry);

PlatformSettings defaultSettings = new PlatformSettings(
    true, 30, defaultRetry, new DatabaseSettings(20, 5000));
PlatformSettings settings = configurationProvider.get("platform.settings")
    .as(PlatformSettings.class, defaultSettings);
```

### Política de fallback e erros — decisão V1

- **Com default explícito:** se a chave/propriedade estiver ausente, Redis indisponível ou ocorrer erro de conversão, retornar o default informado pelo consumidor; absorver a exceção técnica **e registrar log estruturado** com chave, caminho, categoria do erro e correlation-id, sem registrar payload/segredos. Falha técnica não deve ser silenciosa. O consumidor assume explicitamente o risco de operar com esse fallback.
- **Sem default:** chave/propriedade ausente gera exceção padronizada de configuração não encontrada; falha Redis gera exceção de infraestrutura; JSON incompatível gera exceção de conversão. Não retornar `null` silenciosamente para ausência.
- **Valor presente e válido:** retornar o valor convertido; default não substitui valor válido.
- Distinguir explicitamente JSON `null` de chave/propriedade ausente e definir comportamento consistente antes da implementação. Recomenda-se rejeitar default `null` para não criar ambiguidade entre sobrecargas.
- Fallback não consulta outro microsserviço, nem `PLATFORM`, nem banco ou HTTP; não implementar cache local na V1.
- Usar padrão Golden para exceptions, mensagens e MDC. Logs de fallback por falha técnica devem permitir diagnóstico, sem expor dados sensíveis. Não adicionar dependências sem aprovação.



### Avaliação de condições — V1 (escopo aprovado)

O cadastro V1 possui dois tipos: `CONFIGURATION` (JSON livre, consumido pelos métodos `as...`) e `EXPRESSION` (objeto de regra obrigatório, consumido por `matches`). Apenas `EXPRESSION` aceita `matches`; uso em `CONFIGURATION` gera erro padronizado ou fallback explícito. Uma expressão V1 contém uma única condição, sem grupos, AND ou OR. Seu objeto JSON contém obrigatoriamente `operator`, `valueType` e `value` (escalar ou lista, conforme o operador). A biblioteca avalia a condição com `matches(candidate)` ou `matches(candidate, defaultValue)`, sem expor detalhes de Jackson ao consumidor.

**Tipos suportados na avaliação V1:** `String`, `Integer`, `Long` e `BigDecimal`; listas desses tipos para participação. Booleanos e objetos complexos permanecem disponíveis para leitura normal (`asBoolean`, `as(Class<T>)`), mas ficam fora do avaliador V1. Persistir `type` no cadastro, mas não duplicar o tipo Java do JSON em colunas. `valueType` é obrigatório **dentro da expressão** e indica o tipo do valor ou dos elementos da lista: `STRING`, `INTEGER`, `LONG` ou `DECIMAL` (`BigDecimal` no Java). O operador determina escalar ou lista; não é necessário `isArray`.

**Operadores suportados:**

| Operador | Significado | Valores admitidos |
| --- | --- | --- |
| `EQUALS` | Igual a | String ou número |
| `NOT_EQUALS` | Diferente de | String ou número |
| `CONTAINS` | Lista configurada contém o candidato | Lista de strings ou números |
| `NOT_CONTAINS` | Lista configurada não contém o candidato | Lista de strings ou números |
| `GREATER_THAN` | Candidato maior que valor configurado | Número |
| `GREATER_THAN_OR_EQUALS` | Candidato maior ou igual ao configurado | Número |
| `LESS_THAN` | Candidato menor que valor configurado | Número |
| `LESS_THAN_OR_EQUALS` | Candidato menor ou igual ao configurado | Número |

Comparações numéricas devem ser feitas por valor (preferencialmente via `BigDecimal`, sem perda de precisão), de modo que `10`, `10L` e `10.0` sejam equivalentes. Comparações de strings são exatas e sensíveis a maiúsculas/minúsculas na V1; não usar ordenação lexicográfica com operadores maior/menor. Não fazer coerção implícita de string numérica (por exemplo, `"10"`) para número. Rejeitar valores mistos/incompatíveis com exceção padronizada ou fallback explícito.

**Exemplo — contas piloto** (`platform.pilotAccounts`):

```json
{
  "operator": "CONTAINS",
  "valueType": "LONG",
  "value": [10, 20, 30]
}
```

```java
boolean pilot = configurationProvider.get("platform.pilotAccounts")
    .matches(10L);
boolean pilotWithFallback = configurationProvider.get("platform.pilotAccounts")
    .matches(10L, false);
```

**Exemplo — ambiente por String** (`platform.allowedEnvironment`):

```json
{ "operator": "EQUALS", "valueType": "STRING", "value": "PRD" }
```

```java
boolean allowed = configurationProvider.get("platform.allowedEnvironment")
    .matches("PRD", false);
```

**Exemplo — limite inteiro ou Long** (`platform.minimumAccounts`):

```json
{ "operator": "GREATER_THAN_OR_EQUALS", "valueType": "LONG", "value": 1000 }
```

```java
boolean meetsLimit = configurationProvider.get("platform.minimumAccounts")
    .matches(1200L, false);
```

**Exemplo — limite decimal** (`platform.minimumAmount`):

```json
{ "operator": "GREATER_THAN_OR_EQUALS", "valueType": "DECIMAL", "value": 19.90 }
```

```java
boolean meetsAmount = configurationProvider.get("platform.minimumAmount")
    .matches(new BigDecimal("20.00"), false);
```

Acrescentar ao contrato `ConfigurationValue` os métodos `boolean matches(Object candidate)` e `boolean matches(Object candidate, boolean defaultValue)`. Sem default, chave ausente, Redis indisponível, operador desconhecido ou comparação inválida geram exceção padronizada. Com default, retornar o valor informado e registrar log estruturado em caso de falha; resultados legítimos `false` não são erros. Não carregar listas piloto junto aos settings gerais do microsserviço: consultar a chave específica no Redis.

#### JSON Schema padrão de EXPRESSION — V1

O cadastro possui dois tipos: `CONFIGURATION` (JSON livre, **sem schema associado**) e `EXPRESSION` (estrutura obrigatória, validada por **um único schema padrão**, reutilizado pelo módulo de Schema existente). Não criar um schema por configuração, operador ou tipo. POST/PUT validam antes da persistência/publicação; a biblioteca avalia a regra sem executar JSON Schema a cada leitura.

O schema abaixo é a definição de referência **completa para a V1** (Draft 2020-12). `valueType` descreve o elemento, enquanto o operador determina escalar ou lista. Listas são homogêneas, não vazias e sem duplicados; maior/menor só aceita tipos numéricos. `INTEGER` e `LONG` possuem limites; números são comparados por valor sem coerção implícita de strings. A implementação deve preservar precisão numérica ao ler JSON, especialmente limites de Long e BigDecimal.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Configuration Expression V1",
  "type": "object",
  "required": [
    "operator",
    "valueType",
    "value"
  ],
  "properties": {
    "operator": {
      "enum": [
        "EQUALS",
        "NOT_EQUALS",
        "CONTAINS",
        "NOT_CONTAINS",
        "GREATER_THAN",
        "GREATER_THAN_OR_EQUALS",
        "LESS_THAN",
        "LESS_THAN_OR_EQUALS"
      ]
    },
    "valueType": {
      "enum": [
        "STRING",
        "INTEGER",
        "LONG",
        "DECIMAL"
      ]
    },
    "value": {}
  },
  "allOf": [
    {
      "if": {
        "properties": {
          "operator": {
            "enum": [
              "CONTAINS",
              "NOT_CONTAINS"
            ]
          }
        },
        "required": [
          "operator"
        ]
      },
      "then": {
        "properties": {
          "value": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": true
          }
        }
      },
      "else": {
        "properties": {
          "value": {
            "not": {
              "type": "array"
            }
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "operator": {
            "enum": [
              "GREATER_THAN",
              "GREATER_THAN_OR_EQUALS",
              "LESS_THAN",
              "LESS_THAN_OR_EQUALS"
            ]
          }
        },
        "required": [
          "operator"
        ]
      },
      "then": {
        "properties": {
          "valueType": {
            "enum": [
              "INTEGER",
              "LONG",
              "DECIMAL"
            ]
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "valueType": {
            "const": "STRING"
          }
        },
        "required": [
          "valueType"
        ]
      },
      "then": {
        "properties": {
          "value": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "array",
                "items": {
                  "type": "string"
                }
              }
            ]
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "valueType": {
            "const": "INTEGER"
          }
        },
        "required": [
          "valueType"
        ]
      },
      "then": {
        "properties": {
          "value": {
            "oneOf": [
              {
                "type": "integer",
                "minimum": -2147483648,
                "maximum": 2147483647
              },
              {
                "type": "array",
                "items": {
                  "type": "integer",
                  "minimum": -2147483648,
                  "maximum": 2147483647
                }
              }
            ]
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "valueType": {
            "const": "LONG"
          }
        },
        "required": [
          "valueType"
        ]
      },
      "then": {
        "properties": {
          "value": {
            "oneOf": [
              {
                "type": "integer",
                "minimum": -9223372036854776000,
                "maximum": 9223372036854776000
              },
              {
                "type": "array",
                "items": {
                  "type": "integer",
                  "minimum": -9223372036854776000,
                  "maximum": 9223372036854776000
                }
              }
            ]
          }
        }
      }
    },
    {
      "if": {
        "properties": {
          "valueType": {
            "const": "DECIMAL"
          }
        },
        "required": [
          "valueType"
        ]
      },
      "then": {
        "properties": {
          "value": {
            "oneOf": [
              {
                "type": "number"
              },
              {
                "type": "array",
                "items": {
                  "type": "number"
                }
              }
            ]
          }
        }
      }
    }
  ],
  "additionalProperties": false
}
```

**Casos de teste obrigatórios:** aceitar `CONTAINS/LONG/[10,20]`, `EQUALS/STRING/"PRD"`, `GREATER_THAN_OR_EQUALS/DECIMAL/19.90`; rejeitar `CONTAINS/LONG/[10,"20"]`, `CONTAINS/LONG/10`, `GREATER_THAN/STRING/"ABC"`, campos extras, valores nulos e números fora do intervalo. O schema pode ser versionado pelo catálogo existente; mudanças futuras devem avaliar compatibilidade com expressões já cadastradas. Objetos complexos e booleanos continuam disponíveis no tipo `CONFIGURATION`, mas não como operandos de `EXPRESSION` na V1.

No Redis, publicar um envelope com `type` e `value` para o consumidor distinguir os dois modelos, sem alterar a API pública do `ConfigurationProvider`. Em caso de payload inválido ou conversão incompatível, aplicar exceção padronizada ou fallback explícito com log. `AND` e `OR` permanecem exclusivos da V2.

### Composição de condições — V2 (fora do escopo de implementação V1)

Reservar para a V2 a combinação de condições com `AND` e `OR`, grupos aninhados e avaliação de múltiplos atributos. Exemplo ilustrativo:

```json
{
  "operator": "OR",
  "conditions": [
    {
      "operator": "AND",
      "conditions": [
        {"field": "accountId", "operator": "CONTAINS", "value": [10, 20, 30]},
        {"field": "environment", "operator": "EQUALS", "value": "PRD"}
      ]
    },
    {"field": "profile", "operator": "EQUALS", "value": "ADMIN"}
  ]
}
```

Exemplo de API **apenas proposta para V2**, não implementar na V1:

```java
boolean enabled = configurationProvider.get("platform.newFlow")
    .matches(Map.of("accountId", 10L, "environment", "PRD", "profile", "USER"), false);
```

Na V2, detalhar separadamente semântica de operadores, limites de profundidade e quantidade de condições, tipagem, validação, segurança e desempenho. Não implementar parser recursivo, `AND`, `OR` ou grupos na V1.

## 7. Segurança, testes e critérios de aceite
- Autorização administrativa Golden para mutações e publicação; catálogo Microservice controlado pela owner. Não logar payload, valores sensíveis ou segredos; não criar armazenamento de segredos na V1.
- Testar migration/constraints, duplicidade (microservice_id,key), UUID, criação DRAFT, imutabilidade de key/microservice, transições de status/active, update preservando published_value, delete somente inativa, reativação sem autopublish, publicação individual, lote tudo-ou-nada (inclusive erro no meio da transação), concorrência, JSON SQL NULL versus JSON literal null, schema e todos os operadores.
- Testar Redis após commit, falha Redis sem rollback fictício, scheduler restaurando valor anteriormente publicado mesmo com status DRAFT, limpeza de chaves órfãs/inativas, Redis vazio, múltiplas instâncias e idempotência.
- Testar ConfigurationProvider: getters tipados, path, asList, objetos Java, matches, defaults, falhas Redis/conversão, logs e ausência de fallback automático; executar builds e testes de arquitetura Golden.
- Revisar precisão do schema LONG: limites exatos Java Long.MIN_VALUE = -9223372036854775808 e Long.MAX_VALUE = 9223372036854775807; **não** usar limites arredondados. Validar com parser/schema que preserva precisão inteira, inclusive limites e vizinhos inválidos. Se a engine existente arredondar, bloquear e reportar alternativa antes de liberar.
- Critério de aceite: nenhum fluxo de Create/Update/Activate publica automaticamente; só Publish produz novo valor runtime; inativação remove; lote é atômico no banco; divergência Redis é recuperável; nenhuma feature V2 implementada.

## 8. Plano prescritivo para o Worker — checkpoints obrigatórios
**Regra geral:** ler guideline-java, workspace-service e platform-libraries reais antes de modificar; reaproveitar componentes, migrations, convenções de controller, Messenger/i18n, exceptions, autorização, testes e Redis existentes. Não criar dependências sem autorização, não implementar fora do escopo, não realizar merge main. Para cada checkpoint apresentar arquivos alterados, decisões, testes/builds, evidências, riscos e pendências; **aguardar aprovação explícita antes de avançar**.

**Checkpoint 1 — Análise (sem código).** Inventariar estrutura real de foundation.catalog, feature.configuration, Microservice, migrations Flyway, bibliotecas, Redis e infraestrutura de scheduler; mapear divergências deste documento, incluindo política de sincronização concorrente e validação LONG. Entregar plano por arquivo/repositório e riscos.

**Checkpoint 2 — Domínio/persistência e CRUD (workspace-service).** Criar migrations, seeds de ConfigurationType/Status, entidade, repositórios, requests/responses, Command/Query, use cases CRUD/activate/inactivate, validações e mensagens. Testar todas as transições e imutabilidade. Não publicar automaticamente.

**Checkpoint 3 — Publish e Redis (workspace-service).** Implementar PublishById, PublishBatch com validação prévia e transação única, sincronização após commit, envelope JSON, tratamento de falhas e scheduler de reconciliação. Testar tudo-ou-nada no banco, divergência/recuperação Redis, concorrência e limpeza de obsoletas.

**Checkpoint 4 — Leitura (platform-libraries).** Implementar ConfigurationProvider/ConfigurationValue conforme contrato da seção 6; Redis exclusivo, conversões, path, matches, defaults, exceptions/logs. Não criar cache local, fallback por microsserviço ou AND/OR. Testar API e compatibilidade.

**Checkpoint 5 — Validação final Golden.** Executar build/testes/arquitetura, verificar segurança, i18n, contratos, simplicidade, cobertura disponível e documentação. Apresentar evidências, riscos residuais e prontidão para PR; não fazer merge sem autorização.

## 9. Itens explicitamente fora da V1
Composição de expressões AND/OR, grupos aninhados, histórico de versões, publicação automática, outbox, cache local, fallback PLATFORM, ambiente lógico, migração automática quando Microservice.code muda, dependências novas não aprovadas.
