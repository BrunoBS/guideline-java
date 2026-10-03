# Refinamento V1 — Platform Message Queue

## 1. Objetivo

Criar o módulo transversal `platform-message-queue` da Golden Platform Foundation para abstrair publicação e consumo assíncrono de mensagens sem acoplar os serviços de negócio a AWS SQS ou Azure Service Bus.

A aplicação deve conhecer somente destinations lógicos, contratos de mensagem e listeners de negócio. A library é responsável por resolver o provider configurado, serialização, envelope, publicação, consumo e integração técnica com o provider.

A regra central é:

> A plataforma controla o transporte; a aplicação controla o comportamento.

---

## 2. Escopo da V1

A V1 contempla:

- publicação de mensagens;
- consumo de mensagens;
- múltiplas queues por aplicação;
- destinations lógicos dinâmicos;
- AWS SQS;
- Azure Service Bus;
- seleção explícita de um provider por deployment;
- envelope comum;
- payload genérico;
- metadata de tipo e versão;
- listeners de negócio;
- consumo de dead-letter;
- retry e DLQ delegados ao provider;
- defaults globais do provider com override por destination;
- integração com observabilidade/MDC;
- integração com o módulo `platform-messaging`/Messenger para mensagens de erro;
- validações fail-fast no startup para tudo que puder ser conhecido antecipadamente;
- shutdown gracioso;
- testes unitários, de contrato e de integração.

Não fazem parte da V1:

- failover automático AWS → Azure ou Azure → AWS;
- roteamento multi-cloud por requisição;
- criação/provisionamento de filas em runtime;
- implementação própria de broker, retry ou DLQ;
- Redis como mecanismo de fila;
- SNS, EventBridge, Kafka ou streams;
- chunking automático de payload;
- governança de compatibilidade entre versões de contratos.

---

## 3. Princípios arquiteturais

### 3.1. Capacidade transversal

`platform-message-queue` não conhece Account, Product, Workspace, Publisher, Audit ou qualquer outro domínio.

Qualquer serviço pode utilizar a mesma API para publicar e consumir qualquer quantidade de mensagens.

### 3.2. Independência de cloud no código do cliente

Código de negócio não deve importar classes AWS ou Azure.

Exemplo de publicação:

```java
messageQueuePublisher.publish("product-updated", event);
```

Exemplo de consumo:

```java
@MessageQueueListener("product-updated")
public void consume(MessageQueueMessage<ProductUpdatedEvent> message) {
    // regra de negócio
}
```

### 3.3. Um provider por deployment

O provider é escolhido explicitamente pelo usuário na configuração da instância/célula.

```yaml
platform:
  message-queue:
    provider: AWS
```

ou:

```yaml
platform:
  message-queue:
    provider: AZURE
```

Não existe troca automática de provider em caso de falha.

Isso permite utilizar a mesma aplicação/imagem em shards ou cells diferentes:

```text
Shard 1 / Cell A -> AWS
Shard 2 / Cell B -> AWS
Shard 3 / Cell C -> AZURE
```

### 3.4. Providers embarcados, inicialização condicional

A V1 pode disponibilizar suporte aos dois providers no mesmo módulo/artefato. Apenas o provider configurado deve inicializar clients, listeners e recursos de runtime.

O custo de manter ambos os SDKs no classpath é aceito inicialmente em favor de simplicidade operacional e de uma única imagem de aplicação. A evolução para artefatos separados permanece possível caso tamanho, CVEs ou governança de dependências se tornem problema concreto.

---

## 4. Destination lógico

A library não possui catálogo ou enum de filas de negócio.

Cada aplicação declara dinamicamente seus destinations:

```yaml
platform:
  message-queue:
    destinations:
      product-updated:
        queue: pm-product-updated

      account-updated:
        queue: pm-account-updated

      audit-events:
        queue: pm-audit-events

      publisher-updated:
        queue: pm-publisher-updated
```

A chave (`product-updated`, `audit-events`, etc.) é o **destination lógico**.

O valor `queue` representa o destino físico configurado para aquele deployment.

O código Java utiliza somente o destination lógico.

### 4.1. Nome lógico não é nome físico

Nunca utilizar o nome físico da infraestrutura como contrato da aplicação.

Exemplo:

```text
logical destination: audit-events

DEV AWS   -> pm-dev-audit-events
HML AWS   -> pm-hml-audit-events
PRD AWS   -> pm-prd-audit-events
PRD Azure -> pm-prd-audit-events
```

Alterações de ambiente ou cloud não devem exigir recompilação do serviço.

---

## 5. Múltiplas filas por serviço

Uma aplicação pode:

- publicar em uma ou várias queues;
- consumir uma ou várias queues;
- publicar em algumas e consumir outras;
- utilizar quantos destinations forem necessários ao seu domínio.

Exemplo conceitual:

```text
workspace-service

PRODUZ:
  product-updated   -> Queue A
  account-updated   -> Queue B
  audit-events      -> Queue C

CONSOME:
  feature-published <- Queue X
  account-changed   <- Queue Y
```

Não existe limite funcional imposto pela library além dos limites do provider e da configuração operacional.

---

## 6. Contrato de publicação

A library fornece o publisher. O cliente não implementa producer AWS/Azure.

Contrato conceitual:

```java
public interface MessageQueuePublisher {

    void publish(String destination, Object payload);
}
```

Uso:

```java
publisher.publish("product-updated", new ProductUpdatedEvent(...));
publisher.publish("account-updated", new AccountUpdatedEvent(...));
publisher.publish("audit-events", new AuditEvent(...));
```

O cliente não chama resolver explicitamente. Resolução de destination, envelope, serialização e provider são responsabilidades internas.

---

## 7. Envelope padrão

A mensagem transportada deve possuir um envelope comum independente de provider.

Modelo conceitual:

```java
public record MessageQueueMessage<T>(
    String messageId,
    String messageType,
    String messageVersion,
    Instant timestamp,
    String correlationId,
    Map<String, String> headers,
    T payload
) {}
```

Responsabilidades:

- `messageId`: UUID técnico gerado pela library para a mensagem;
- `messageType`: identificação lógica da mensagem;
- `messageVersion`: metadado opcional/opaco de versão do contrato;
- `timestamp`: instante de criação/publicação;
- `correlationId`: propagado do contexto/MDC quando disponível;
- `headers`: metadados adicionais;
- `payload`: objeto de domínio definido pela aplicação.

O envelope é criado pela library. O cliente não precisa construir o envelope para publicar.

---

## 8. QueueMessage, type e version

A anotação de contrato é opcional:

```java
@QueueMessage(
    type = "product.updated",
    version = "2"
)
public record ProductUpdatedEvent(...) {}
```

### 8.1. Convention over configuration

Se `@QueueMessage` não existir:

```text
messageType    = destination lógico
messageVersion = "1"
```

Exemplo:

```java
publisher.publish("product-updated", event);
```

gera por default:

```text
destination    = product-updated
messageType    = product-updated
messageVersion = 1
```

### 8.2. Override

Se `@QueueMessage` existir, seus metadados sobrescrevem os defaults.

A versão pertence à mensagem/contrato, nunca à queue.

### 8.3. Sem governança de versão pela library

`messageVersion` é somente metadata transportada.

A library:

- não compara versões;
- não decide compatibilidade;
- não seleciona regra de negócio por versão;
- não impede V1, V2 e V3 de coexistirem na mesma destination.

Produtor e consumidor definem o acordo semântico.

O consumidor pode, por exemplo:

```java
switch (message.messageVersion()) {
    case "1" -> processV1(message.payload());
    case "2" -> processV2(message.payload());
    case "3" -> processV3(message.payload());
    default -> handleUnsupportedVersion(message);
}
```

A decisão para uma versão desconhecida pertence ao consumidor.

---

## 9. Serialização

A V1 utiliza JSON/Jackson com o `ObjectMapper` padronizado da plataforma.

Fluxo:

```text
Payload Java
   -> resolve metadata
   -> cria envelope
   -> serializa JSON
   -> provider
   -> queue física
```

Os adapters AWS/Azure trabalham com a representação serializada e não precisam conhecer classes de domínio.

Exemplo de envelope:

```json
{
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "messageType": "product.updated",
  "messageVersion": "1",
  "timestamp": "2026-10-03T14:30:00Z",
  "correlationId": "correlation-id",
  "headers": {},
  "payload": {
    "identifier": "123",
    "name": "Produto A"
  }
}
```

---

## 10. Contrato de consumo

A infraestrutura de consumo é fornecida pela library. A aplicação implementa somente a regra de negócio.

Exemplo:

```java
@MessageQueueListener("product-updated")
public void consume(MessageQueueMessage<ProductUpdatedEvent> message) {
    productService.process(message.payload());
}
```

A V1 deve manter o listener simples e previsível.

Contrato inicial recomendado:

- método público;
- um parâmetro do tipo `MessageQueueMessage<T>`;
- retorno `void`;
- payload tipado a partir do generic `T`.

A library deve:

1. localizar os listeners;
2. resolver o destination;
3. receber a mensagem pelo provider;
4. desserializar o envelope;
5. desserializar o payload no tipo esperado;
6. restaurar contexto/correlationId;
7. invocar o método;
8. sinalizar sucesso/falha ao provider.

---

## 11. ACK, falha e redelivery

A V1 não expõe ACK/NACK manual para o cliente.

Regra:

```text
listener termina normalmente -> sucesso / ACK
listener lança exception      -> falha / redelivery do provider
```

A tradução para os mecanismos nativos é responsabilidade do adapter AWS/Azure.

---

## 12. Retry e DLQ

A library não implementa loops próprios de retry e não cria DLQ própria.

Retry, redelivery e dead-letter utilizam capacidades nativas do provider.

Fluxo conceitual:

```text
mensagem
   -> consumer
      -> sucesso -> ACK
      -> exception
          -> provider redelivery/retry
          -> limite do provider/policy
          -> DLQ
```

Provisionamento de queue, DLQ, permissões e políticas de redrive/dead-letter pertence à infraestrutura/IaC.

A library utiliza e valida a infraestrutura disponibilizada.

---

## 13. Consumo de Dead Letter

A library também abstrai o consumo da DLQ.

A aplicação pode registrar um listener específico:

```java
@MessageQueueDeadLetterListener("product-updated")
public void consumeDeadLetter(
        DeadLetterMessage<ProductUpdatedEvent> message) {
    // decisão da aplicação
}
```

Modelo conceitual:

```java
public record DeadLetterMessage<T>(
    MessageQueueMessage<T> message,
    String reason,
    String description,
    Integer deliveryCount,
    Instant deadLetteredAt,
    Map<String, String> providerMetadata
) {}
```

A estrutura comum deve conter somente informações semanticamente comuns aos providers. Dados específicos podem ser preservados em metadata.

A library entrega a dead-letter; a aplicação decide se irá:

- registrar;
- alertar;
- corrigir;
- reprocessar;
- descartar de forma controlada.

Não haverá reprocessamento automático de DLQ na V1.

Também não haverá `publishToDlq()` como API comum de negócio.

---

## 14. Providers

### 14.1. AWS

Provider:

```text
AWS -> Amazon SQS
```

O adapter encapsula o SDK AWS e traduz o contrato comum para SQS.

### 14.2. Azure

Provider:

```text
AZURE -> Azure Service Bus
```

O adapter encapsula o SDK Azure e traduz o contrato comum para Service Bus.

### 14.3. Sem abstração falsa

A experiência Java é comum, mas diferenças reais de infraestrutura não devem ser escondidas artificialmente.

Configurações específicas permanecem em namespaces específicos do provider.

---

## 15. Configuração comum e específica

Exemplo AWS:

```yaml
platform:
  message-queue:
    provider: AWS

    aws:
      region: sa-east-1

    destinations:
      audit-events:
        queue: pm-audit-events
```

Exemplo Azure:

```yaml
platform:
  message-queue:
    provider: AZURE

    azure:
      namespace: pm-production

    destinations:
      audit-events:
        queue: pm-audit-events
```

O provider selecionado determina qual bloco é validado/inicializado.

Credenciais devem preferencialmente utilizar os mecanismos padrões de identidade/credential chain do SDK/ambiente. A library não deve criar um gerenciador próprio de secrets.

---

## 16. Defaults e override por destination

Configurações operacionais podem possuir defaults no nível do provider e override por destination.

Precedência:

```text
Platform default
      -> Provider default
          -> Destination override
              -> ResolvedDestination
```

Exemplo AWS:

```yaml
platform:
  message-queue:
    provider: AWS

    aws:
      region: sa-east-1
      defaults:
        visibility-timeout: 30s
        wait-time: 20s
        concurrency: 5

    destinations:
      audit-events:
        queue: pm-audit-events

      product-updated:
        queue: pm-product-updated
        aws:
          visibility-timeout: 120s
          concurrency: 10
```

Resultado:

```text
audit-events:
  visibility-timeout = 30s
  wait-time          = 20s
  concurrency        = 5

product-updated:
  visibility-timeout = 120s
  wait-time          = 20s
  concurrency        = 10
```

A resolução deve ser centralizada. Os adapters recebem uma configuração já resolvida, evitando condicionais de fallback espalhadas.

Propriedades específicas por destination só devem existir quando houver necessidade real do provider.

---

## 17. Publish e consume por destination

Uma destination pode ser utilizada somente para publicação, somente para consumo ou para ambos.

Modelo de configuração:

```yaml
destinations:
  product-updated:
    queue: pm-product-updated
    publisher:
      enabled: true
    consumer:
      enabled: false

  account-updated:
    queue: pm-account-updated
    publisher:
      enabled: false
    consumer:
      enabled: true
```

Configurações exclusivas de consumo, como concurrency, não devem contaminar a configuração de publisher.

---

## 18. Resolução interna

A aplicação não utiliza resolver diretamente.

A library possui resolução interna equivalente a:

```text
destination lógico
      -> DestinationProperties
      -> provider selecionado
      -> defaults do provider
      -> overrides da destination
      -> ResolvedDestination
      -> adapter
      -> queue física
```

Conceitualmente:

```java
ResolvedDestination resolve(String destination);
```

---

## 19. Observabilidade

A integração com o padrão de observabilidade da plataforma é obrigatória.

Publisher:

- captura `correlationId` quando disponível;
- inclui no envelope;
- registra contexto técnico da publicação.

Consumer:

- restaura o `correlationId` durante o processamento;
- limpa/restaura corretamente o contexto ao finalizar.

Logs devem permitir identificar, no mínimo:

- `messageId`;
- `messageType`;
- `messageVersion`;
- destination lógico;
- provider;
- correlationId.

A implementação deve integrar com `platform-observability` e não criar um segundo padrão de logging/MDC.

---

## 20. Erros e Messenger

`platform-message-queue` deve integrar com o módulo existente `platform-messaging`/Messenger para resolução das mensagens de erro.

Não utilizar strings de erro espalhadas pelo código.

Hierarquia inicial:

```text
MessageQueueException
├── MessagePublishException
├── MessageConsumeException
├── MessageSerializationException
└── MessageQueueConfigurationException
```

Chaves conceituais:

```text
PROVIDER_INVALID
DESTINATION_NOT_FOUND
SERIALIZATION_FAILED
PUBLISH_FAILED
CONSUME_FAILED
LISTENER_INVALID
CONFIGURATION_INVALID
```

As chaves devem ser centralizadas em `MessageQueueMessageKeys` e resolvidas pelo Messenger/bundles da plataforma.

---

## 21. Dependências funcionais explícitas

Regra Golden:

> Dependências entre capabilities são explícitas no POM da aplicação e validadas no startup. Não são escondidas transitivamente e não são silenciosamente ignoradas.

Portanto, uma aplicação que utiliza Message Queue deve declarar explicitamente:

```xml
<dependency>
    <artifactId>platform-message-queue</artifactId>
</dependency>

<dependency>
    <artifactId>platform-messaging</artifactId>
</dependency>
```

Se `platform-message-queue` estiver presente sem a capability obrigatória de Messenger, a aplicação deve falhar no startup com mensagem acionável indicando a dependência a adicionar.

O mesmo padrão será aplicado posteriormente a outras relações Golden, como:

```text
platform-audit         -> requires -> platform-message-queue
platform-catalog       -> requires -> platform-schema-validation
platform-message-queue -> requires -> platform-messaging
```

---

## 22. Startup validation

Tudo que for conhecido antecipadamente deve ser validado antes da aplicação ficar disponível.

Validar:

- provider informado;
- provider suportado;
- configuração obrigatória do provider selecionado;
- destinations válidos;
- destination de cada listener existente;
- duplicidades/incompatibilidades de listeners;
- configurações de publisher/consumer;
- dependências funcionais obrigatórias;
- configuração necessária para dead-letter listeners;
- propriedades operacionais inválidas.

Não utilizar `@ConditionalOnClass` para simplesmente desabilitar silenciosamente uma capability obrigatória ausente.

Quando a ausência for erro de composição, deve existir startup guard explícito com mensagem acionável.

O que só puder ser conhecido no momento da publicação deve ser validado imediatamente antes do envio.

---

## 23. Limites de payload

A library deve conhecer/validar os limites aplicáveis ao provider selecionado antes do envio quando tecnicamente possível.

Se o payload exceder o limite suportado, deve ocorrer erro padronizado e acionável.

A V1 não implementa:

- chunking automático;
- upload automático para storage;
- fragmentação transparente.

Essas capacidades somente serão adicionadas mediante refinamento específico.

---

## 24. Shutdown gracioso

No shutdown:

1. parar a aquisição de novas mensagens;
2. permitir que processamentos em andamento concluam dentro de timeout configurado;
3. sinalizar corretamente ao provider mensagens não concluídas;
4. encerrar clients/recursos do provider.

A aplicação não deve precisar implementar essa mecânica.

---

## 25. Estrutura inicial sugerida

Estrutura conceitual:

```text
platform-message-queue
├── annotation
│   ├── QueueMessage
│   ├── MessageQueueListener
│   └── MessageQueueDeadLetterListener
├── contract
│   ├── MessageQueuePublisher
│   ├── MessageQueueMessage
│   └── DeadLetterMessage
├── configuration
│   ├── MessageQueueProperties
│   ├── DestinationProperties
│   ├── AwsProperties
│   ├── AzureProperties
│   └── MessageQueueAutoConfiguration
├── resolver
│   ├── DestinationResolver
│   └── ResolvedDestination
├── serialization
├── provider
│   ├── aws
│   └── azure
├── consumer
├── publisher
├── validation
├── exception
└── message
    └── MessageQueueMessageKeys
```

A estrutura final deve respeitar os padrões de package da Golden Platform Foundation e evitar abstrações adicionais sem necessidade concreta.

---

## 26. Fluxo de publicação

```text
Cliente
  -> MessageQueuePublisher.publish(destination, payload)
  -> valida destination
  -> resolve @QueueMessage ou defaults
  -> gera messageId
  -> captura timestamp/correlationId
  -> monta envelope
  -> serializa JSON
  -> resolve configuração efetiva
  -> seleciona adapter do provider configurado
  -> publica na queue física
```

---

## 27. Fluxo de consumo

```text
Provider
  -> adapter recebe mensagem
  -> resolve destination/listener
  -> desserializa envelope
  -> desserializa payload
  -> restaura correlationId/MDC
  -> invoca @MessageQueueListener
      -> sucesso: ACK/conclusão
      -> exception: falha para mecanismo nativo de redelivery
  -> limpa contexto
```

---

## 28. Fluxo de dead-letter

```text
Mensagem falha repetidamente
  -> provider aplica política nativa
  -> mensagem chega à DLQ
  -> adapter da library recebe
  -> normaliza metadata disponível
  -> cria DeadLetterMessage<T>
  -> invoca @MessageQueueDeadLetterListener
  -> aplicação decide tratamento
```

---

## 29. Idempotência

A entrega dos providers pode ser at-least-once e duplicidades são possíveis.

A library garante identidade técnica da mensagem por `messageId` e preserva os metadados recebidos durante o processamento.

A library não pode garantir idempotência da regra de negócio.

Cada consumidor decide se precisa:

- persistir `messageId`;
- detectar duplicidade;
- tornar operação naturalmente idempotente.

No caso de Audit, `eventId` continua sendo a identidade funcional do evento de auditoria; `messageId` é a identidade técnica do transporte.

---

## 30. Testes

### 30.1. Unitários

Cobrir:

- resolução de destination;
- defaults e overrides;
- resolução de `QueueMessage`;
- defaults `messageType = destination` e `messageVersion = "1"`;
- criação do envelope;
- serialização/deserialização;
- startup validators;
- exceptions/messages;
- listener invocation.

### 30.2. Contract tests

AWS e Azure devem obedecer ao mesmo comportamento observável do contrato comum:

- publish;
- consume;
- sucesso;
- falha;
- redelivery;
- dead-letter consumption;
- metadata;
- correlationId.

### 30.3. Integração

Testes de integração devem utilizar tecnologias homologadas pela plataforma.

Não introduzir H2 ou outra infraestrutura alternativa apenas por conveniência de teste.

---

## 31. Critérios de aceite da V1

A V1 está concluída quando:

1. uma aplicação consegue selecionar AWS ou Azure por Properties;
2. somente o provider selecionado é inicializado;
3. o mesmo código de negócio publica em ambos os providers sem alteração;
4. uma aplicação pode configurar múltiplos destinations;
5. publisher resolve destination lógico para queue física;
6. qualquer payload serializável pode ser publicado;
7. ausência de `@QueueMessage` aplica type=destination e version="1";
8. `@QueueMessage` permite sobrescrever type/version;
9. version é entregue ao consumidor sem interpretação pela library;
10. listeners recebem envelope e payload tipado;
11. sucesso/falha do listener é traduzido corretamente ao provider;
12. retry/DLQ não são reimplementados pela library;
13. dead-letter pode ser consumida através de abstração comum;
14. defaults do provider podem ser sobrescritos por destination;
15. erros utilizam Messenger e chaves centralizadas;
16. correlationId é propagado/restaurado;
17. configuração inválida falha no startup quando detectável;
18. dependências funcionais obrigatórias ausentes falham com mensagem acionável;
19. shutdown é gracioso;
20. AWS/Azure passam pela mesma suíte de contrato;
21. não há código de domínio nem nomes de filas fixos dentro da library.

---

## 32. Integração futura com Platform Audit

O `platform-audit` deverá utilizar `platform-message-queue` como capacidade explícita.

Fluxo futuro:

```text
platform-audit
   -> captura AuditEvent
   -> mantém eventId funcional
   -> MessageQueuePublisher.publish("audit-events", auditEvent)
   -> platform-message-queue
   -> AWS SQS ou Azure Service Bus
   -> consumidor de auditoria
   -> persistência
```

Com isso, deixam de pertencer ao Audit:

- Redis como fila durável;
- recovery scheduler próprio;
- distributed lock de recovery;
- retry próprio;
- DLQ própria.

A atomicidade entre commit do banco de negócio e publicação da mensagem continua sendo uma preocupação separada. A adoção de SQS/Service Bus não transforma duas operações independentes em uma transação atômica. Caso seja necessária garantia transacional entre persistência de negócio e publicação, deverá existir refinamento específico para Transactional Outbox ou mecanismo equivalente.

---

## 33. Decisões Golden consolidadas

1. O módulo chama-se `platform-message-queue`.
2. É transversal e independente de domínio.
3. AWS SQS e Azure Service Bus são os providers iniciais.
4. O usuário escolhe explicitamente um provider por deployment.
5. Não existe failover automático entre clouds.
6. Um serviço pode utilizar N queues.
7. Destinations são dinâmicos e definidos pela aplicação.
8. Código utiliza destination lógico, nunca endereço físico.
9. Publisher é fornecido pela library.
10. Cliente implementa somente comportamento do consumer.
11. A library abstrai também consumo de dead-letter.
12. Retry/DLQ pertencem ao provider.
13. `@QueueMessage` é opcional.
14. Sem anotação: type=destination e version="1".
15. Version é metadata opaca; consumidor decide V1/V2/V3.
16. Defaults operacionais podem ser sobrescritos por destination.
17. Diferenças legítimas AWS/Azure ficam em configuração específica do provider.
18. Erros integram com `platform-messaging`/Messenger.
19. Dependências funcionais entre capabilities são explícitas no POM.
20. Tudo que puder ser validado antecipadamente deve falhar no startup com mensagem acionável.
21. A library abstrai uso da mensageria, mas não provisiona infraestrutura em runtime.
22. A V1 não reinventa broker, retry, DLQ, idempotência de negócio ou governança de contratos.

---

## 34. Próximos passos

1. revisar este refinamento ponto a ponto;
2. validar nomenclatura/packages contra a Golden Platform Foundation;
3. definir dependências/versions AWS SDK e Azure SDK conforme `platform-build`;
4. criar o módulo `platform-message-queue`;
5. implementar core/contracts/properties;
6. implementar adapter AWS/SQS;
7. implementar adapter Azure/Service Bus;
8. implementar publisher;
9. implementar consumer/listeners;
10. implementar dead-letter listener;
11. integrar Messenger;
12. integrar Observability;
13. implementar startup guards;
14. implementar testes;
15. executar auditoria final do módulo;
16. somente então integrar `platform-audit`.
