# Refinamento V1 — Configuration

**Projetos:** workspace-service e platform-libraries  
**Status:** Proposta para implementação — Golden Reference  
**Local:** docs/refinamento/14-configuration/configuration-refinement-v1.md

## 1. Objetivo
Centralizar parâmetros de configuração da plataforma e das features no workspace-service, persistidos em banco relacional e publicados em Redis compartilhado. Microsserviços consumidores leem somente o Redis por meio da platform-libraries.

## 2. Escopo e decisões
- Configurações globais pertencem à feature fixa `PLATFORM`, cadastrada por migration e protegida contra exclusão/inativação.
- Configurações específicas pertencem a uma feature existente no catálogo; usar a referência dessa tabela, sem duplicar cadastros.
- A chave lógica é totalmente qualificada: `platform.quarantineDays`, `workspace.quarantineDays`, `key-service.quarantineDays`. O código usado deve ser o código canônico da feature, com normalização definida pelo catálogo.
- Não existe herança nem fallback entre features. `PLATFORM` não é fallback automático.
- O consumidor informa explicitamente o nome completo da chave e, opcionalmente, um valor default local.
- Banco de dados é a fonte de verdade; Redis é cache compartilhado.
- V1 sem outbox transacional, cache local ou acesso ao banco pelos consumidores.

## 3. Modelo de dados
Criar entidade/tabela de configuração com:
- `id`: identificador interno, conforme padrão do projeto;
- `identifier`: UUID público, se aplicável ao padrão Golden;
- `feature_id`: FK obrigatória para o catálogo de features, inclusive `PLATFORM`;
- `key`: nome da chave dentro da feature;
- `value`: valor da configuração, aceitando JSON;
- `lifecycle`: ACTIVE/INACTIVE, seguindo catálogo e convenções existentes.
- Campos de auditoria conforme padrão já adotado no workspace-service.

Impor unicidade de `(feature_id, key)`. Validar chave não vazia, feature existente e valor JSON válido quando armazenado como JSON. Definir representação de strings e tipos primitivos de forma consistente na publicação e na leitura. Não persistir segredos sem uma política específica de segurança.

## 4. Endpoints e casos de uso
- `POST`: criar configuração; persistir e, após commit, publicar sua chave no Redis.
- `PUT`: atualizar configuração; persistir e, após commit, publicar a versão atual.
- `GET` por identificador e `GET` paginado/filtros: consulta administrativa ao banco.
- `PATCH` de lifecycle: ativar/inativar; refletir o estado publicado no Redis.
- `PATCH` de publish: republicar todas as configurações ou apenas as de uma feature, lendo o banco; não modificar dados de negócio.
- Exclusão física, se oferecida, deve obedecer às regras de lifecycle e retirar a chave do Redis.

Usar Request/Response nos controllers, Command/Query e use cases separados, validações centralizadas, autorização administrativa e mensagens de erro padronizadas conforme a Golden Reference. Rotas exatas devem respeitar as convenções existentes do repositório.

## 5. Contrato de publicação no Redis
Chave física padronizada: `config:<feature>:<key>`, por exemplo `config:platform:quarantineDays`. A biblioteca deve receber a chave lógica completa (`platform.quarantineDays`) e transformá-la no nome físico de maneira determinística, sem colisões. Não assumir que nomes de features ou keys nunca contêm pontos: estabelecer validação/escape no contrato.

Publicar somente configurações ACTIVE. Inativação, remoção ou republicação integral devem eliminar entradas obsoletas do namespace gerenciado, sem apagar chaves de outros módulos. Preferir operação idempotente. Não expirar entradas por TTL sem estratégia de reposição definida, pois uma expiração silenciosa produziria ausência de configuração.

### Três gatilhos de publicação
1. **Automático:** após POST/PUT e alterações de lifecycle, depois do commit do banco, atualizar ou remover somente a chave afetada.
2. **Manual:** PATCH administrativo republica tudo ou uma feature selecionada, usando o estado atual do banco.
3. **Agendado:** scheduler a cada uma hora reconcilia Redis e banco.

Todos devem reutilizar o mesmo serviço de publicação. Com múltiplas instâncias, evitar execuções simultâneas do job (lock distribuído ou execução única conforme infraestrutura). Evitar que um snapshot antigo sobrescreva uma gravação mais nova; serializar por chave, usar versão/controle de ordem ou reconciliar novamente após concorrência. O mecanismo concreto deve seguir a infraestrutura disponível e ser testado.

### Consistência e recuperação
Banco e Redis não participam da mesma transação ACID. Falha na publicação após commit não deve ser tratada como rollback da gravação: registrar erro, sinalizar a condição conforme contrato e permitir republicação manual/agendada. A sincronização horária recupera divergências; pode existir defasagem temporária. Testar Redis vazio, indisponível, remoção de chave, mudança de lifecycle e publicação concorrente.

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
- Fallback não consulta outra feature, nem `PLATFORM`, nem banco ou HTTP; não implementar cache local na V1.
- Usar padrão Golden para exceptions, mensagens e MDC. Logs de fallback por falha técnica devem permitir diagnóstico, sem expor dados sensíveis. Não adicionar dependências sem aprovação.



### Avaliação de condições — V1 (escopo aprovado)

A Configuration V1 permite uma única condição por configuração, sem grupos, AND ou OR. O objeto JSON contém `operator` e `value` (escalar ou lista, conforme o operador). A biblioteca avalia a condição com `matches(candidate)` ou `matches(candidate, defaultValue)`, sem expor detalhes de Jackson ao consumidor.

**Tipos suportados na avaliação V1:** `String`, `Integer`, `Long` e `BigDecimal`; listas desses tipos para participação. Booleanos e objetos complexos permanecem disponíveis para leitura normal (`asBoolean`, `as(Class<T>)`), mas ficam fora do avaliador V1. Não armazenar discriminador de tipo no banco: o valor é JSON e a biblioteca resolve a tipagem.

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
{ "operator": "EQUALS", "value": "PRD" }
```

```java
boolean allowed = configurationProvider.get("platform.allowedEnvironment")
    .matches("PRD", false);
```

**Exemplo — limite inteiro ou Long** (`platform.minimumAccounts`):

```json
{ "operator": "GREATER_THAN_OR_EQUALS", "value": 1000 }
```

```java
boolean meetsLimit = configurationProvider.get("platform.minimumAccounts")
    .matches(1200L, false);
```

**Exemplo — limite decimal** (`platform.minimumAmount`):

```json
{ "operator": "GREATER_THAN_OR_EQUALS", "value": 19.90 }
```

```java
boolean meetsAmount = configurationProvider.get("platform.minimumAmount")
    .matches(new BigDecimal("20.00"), false);
```

Acrescentar ao contrato `ConfigurationValue` os métodos `boolean matches(Object candidate)` e `boolean matches(Object candidate, boolean defaultValue)`. Sem default, chave ausente, Redis indisponível, operador desconhecido ou comparação inválida geram exceção padronizada. Com default, retornar o valor informado e registrar log estruturado em caso de falha; resultados legítimos `false` não são erros. Não carregar listas piloto junto aos settings gerais da feature: consultar a chave específica no Redis.

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

## 7. Segurança e observabilidade
Restringir mutações e republicação a perfis administrativos; leituras administrativas seguem autorização e visibilidade existentes. Não registrar valores sensíveis nos logs. Incluir correlation-id, resultado da publicação, feature e chave sem expor payloads. Monitorar falhas de sincronização usando mecanismos já existentes; não introduzir framework de métricas não aprovado.

## 8. Testes e critérios de aceite
- Criar/atualizar configuração grava no banco e publica no Redis após commit.
- Chaves com o mesmo nome em features distintas não colidem.
- `PLATFORM` é fixa e protegida.
- Configuração inativa não permanece disponível no Redis após reconciliação.
- Publicação manual funciona para todas e para uma feature; job horário reconcilia inclusive remoções.
- Falha do Redis não causa falsa afirmação de rollback no banco; republicação recupera.
- `get(key).asX()` e `get(key).path(...).asX()` convertem valores simples, atributos aninhados e objetos Java.\n- Com default, ausências e falhas técnicas/de conversão retornam fallback e geram logs apropriados; sem default, lançam exceções padronizadas.
- Não há fallback automático para `PLATFORM`.
- Erros de Redis e conversão seguem padrão de exceptions e mensagens.
- Testar serialização JSON, tipos primitivos, `asLong`, `asList`, os oito operadores de `matches` e os tipos String/Integer/Long/BigDecimal, fallback, concorrência, idempotência e múltiplas instâncias.
- Testes unitários, integração e arquitetura conforme padrões Golden; sem alterar módulos fora do escopo.

## 9. Orientação ao Worker
Antes de implementar, inspecionar os repositórios workspace-service, platform-libraries e as diretrizes de guideline-java. Reutilizar catálogos, lifecycle, autorização, mensagens, arquitetura de pacotes e infraestrutura Redis existentes. Documentar decisões técnicas não especificadas, sem inventar contratos incompatíveis. Entregar alterações por projeto, com testes e evidências, sem adicionar dependências não autorizadas.

### 9.1. Checkpoints de execução (aprovação obrigatória)

Executar os checkpoints **sequencialmente**. Ao concluir cada um, apresentar ao responsável: arquivos alterados, decisões adotadas, testes executados e seus resultados, riscos, pendências e evidências. **Não iniciar o checkpoint seguinte sem aprovação explícita.** Não realizar merge na `main` sem autorização.

**Checkpoint 1 — Análise arquitetural (sem alterações de código).**
- Ler este refinamento, as guidelines Golden e a estrutura atual de `workspace-service` e `platform-libraries`.
- Conferir catálogos/feature `PLATFORM`, lifecycle, convenções de endpoints, migrations, Redis, injeção de dependências, exceptions, autorização e testes.
- Apontar incompatibilidades, lacunas e decisões pendentes; propor plano incremental por repositório.
- **Saída:** relatório de aderência e plano para aprovação, sem implementar.

**Checkpoint 2 — Persistência e domínio (`workspace-service`).**
- Implementar entidade/tabela Configuration, migration, constraints, relacionamento com catálogo de features e proteção da feature `PLATFORM`.
- Implementar casos de uso de CRUD, lifecycle, validações, autorização e mensagens conforme Golden.
- Testar regras de unicidade, lifecycle, tipos de valores, erros e persistência.
- **Saída:** alterações e evidências dos testes de domínio e integração.

**Checkpoint 3 — Publicação e reconciliação Redis (`workspace-service`).**
- Publicar alterações após commit do banco; remover chaves inativas/excluídas.
- Implementar publicação manual (todas ou por feature) e scheduler de reconciliação a cada hora.
- Validar idempotência, falha de Redis, recuperação, concorrência, múltiplas instâncias e proteção contra publicação obsoleta.
- **Saída:** evidências de consistência e recuperação, com limitações explicitadas.

**Checkpoint 4 — Consumo pela `platform-libraries`.**
- Implementar o módulo/componente `ConfigurationProvider` seguindo os padrões de autoconfiguração existentes.
- Ler exclusivamente do Redis; suportar `ConfigurationValue`, `path`, `asLong`, `asList`, `matches` com os oito operadores simples e sobrecargas com default. Não implementar composição AND/OR da V2. Com default, absorver ausência/falhas e registrar logs; sem default, lançar exceção padronizada. Nunca fazer fallback entre features.
- Validar tipos primitivos, objetos JSON, erros de conversão e indisponibilidade do Redis.
- **Saída:** contrato documentado, exemplos de uso e testes.

**Checkpoint 5 — Validação final Golden.**
- Executar testes unitários, integração, arquitetura e build dos módulos impactados; apresentar resultados e cobertura disponível.
- Revisar segurança, logs, simplicidade, padrões de pacotes, compatibilidade e documentação.
- Confirmar ausência de novas dependências não autorizadas e de mudanças fora do escopo.
- **Saída:** relatório final com evidências, riscos residuais e indicação de prontidão para revisão/PR.

**Restrições para todos os checkpoints:** não adicionar dependências sem autorização, não alterar contratos existentes desnecessariamente, não avançar sem aprovação explícita e não efetuar merge na `main` sem autorização.
