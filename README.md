# Guideline — Estrutura Padrão de Projetos Java (Spring Boot)

## Objetivo

Padronizar todos os projetos da equipe para:

* Manutenção simples
* Onboarding rápido de novos membros
* Consistência entre APIs
* Escalabilidade sem complexidade
* Compatibilidade com agentes de IA
* Redução de acoplamento e bugs arquiteturais

## Estrutura padrão do projeto

```
com/suaempresa/<projeto>/
│
├── Application.java
│
├── config/
├── exception/
├── shared/
├── core/
├── features/
├── infra/
└── resources/
```

## Descrição das camadas

### config/

Configurações globais do Spring e do sistema.

Exemplos:

* Segurança
* OpenAPI / Swagger
* Serialização JSON
* Async / Executor
* Beans globais

> Não deve conter lógica de negócio.

### exception/

Tratamento padronizado de erros da API.

Responsabilidades:

* Handler global (@ControllerAdvice)
* Modelos de erro
* Catálogo de códigos

Permite respostas consistentes para API, batch e integrações.

### shared/

Componentes reutilizáveis por todo o sistema.

```
shared/
  util/
  constants/
  validation/
  errors/
```

Pode conter:

* Utilitários
* Constantes
* Validadores genéricos
* Catálogo de erros
* Classes puras (sem regra de domínio)

> Não deve depender de features.

### core/ — CRUD base compartilhado (opcional)

Entidades e funcionalidades comuns a múltiplas features.

Exemplos:

* Usuário
* Auditoria
* Configurações globais
* Base de autenticação
* Entidades compartilhadas

> Evitar colocar regras específicas de negócio.

### features/ — Camada principal (Feature-based)

Cada funcionalidade/domínio é isolada.

```
features/
  <feature>/
```

Exemplo:

```
features/providers/
features/contascompartilhadas/
```

#### Estrutura interna de uma feature

```
<feature>/
  controller/
  service/
  repository/
  model/
  dto/
    request/
    response/
  mapper/
  validation/
  batch/ (opcional)
```

##### controller/

* Exposição de endpoints REST
* Validação básica de entrada
* Conversão HTTP ↔ DTO
* Sem regra de negócio

##### service/

Camada de orquestração da feature.

Responsável por:

* Regras de negócio
* Transações
* Integrações
* Chamadas ao repositório
* Execução do Validation Pipeline

> Apenas services acessam repositories.

##### repository/

* Acesso a dados
* Interfaces Spring Data
* Queries
* Sem lógica de negócio

##### model/

* Entidades persistentes (@Entity)
* Representam tabelas do banco
* Não expor diretamente na API

##### dto/

Objetos de transferência.

Separados por direção:

* request/
* response/

> Evita acoplamento da API ao modelo de dados.

##### mapper/

Conversão entre:

* DTO ↔ Entity
* Model ↔ Response

> Pode ser MapStruct ou manual.

##### validation/

Validação da feature usando Validation Pipeline.

Pode incluir:

* Validação estrutural
* Validação de negócio
* Consistência de dados

> Deve retornar lista de erros, não lançar exceções.

##### batch/ (opcional)

Processamento assíncrono ou em lote.

```
batch/
  job/
  processor/
  dto/
```

Usado para:

* Importações
* Atualizações massivas
* Processamento via fila
* Arquivos
* SQS / eventos

### infra/ — Integrações externas e infraestrutura

Isola dependências externas do domínio.

```
infra/
  persistence/
  storage/
  messaging/
  async/
  external/
```

Exemplos:

* Banco (configs JPA)
* S3
* SQS / Kafka
* Clients HTTP externos
* Executors
* SDKs de terceiros

> Features consomem serviços da infra, nunca SDK direto.

### resources/

Arquivos de configuração:

* application.yml
* logs
* templates
* scripts

## Regras arquiteturais obrigatórias

### Organização por feature

* Todo código de negócio deve estar dentro de uma feature
* Evitar módulos técnicos horizontais (ex.: “services globais”)

### Dependências entre camadas

Fluxo permitido:

* Controller → Service → Repository
* Service → Validation → Infra

Proibido:

* Controller → Repository
* Repository → Service
* Feature → outra feature diretamente

> Integração entre features deve ocorrer via Service.

### Separação entre domínio e infraestrutura

* Domínio não conhece SDKs externos
* Infra não contém regras de negócio

### DTO obrigatório para API

* Nunca expor entidades diretamente
* Sempre usar request/response DTO

### Validação padronizada

* Executada na camada de service
* Retorna múltiplos erros
* Independente de API ou batch
* Baseada em códigos padronizados

### Tratamento de erros consistente

Toda API deve:

* Retornar códigos de erro identificáveis
* Permitir documentação externa
* Ser compreensível para humanos e IA

### Testes

Cada feature deve possuir:

* Testes unitários (service/validator)
* Testes de integração (controller/repository)

### Integrações externas

Sempre via infra/.

> Nunca: feature → SDK diretamente

### Convenções de nomenclatura

| Tipo         | Padrão                 |
| ------------ | ---------------------- |
| Controller   | <Feature>Controller    |
| Service      | <Feature>Service       |
| Repository   | <Feature>Repository    |
| Entity       | Nome do domínio        |
| DTO Request  | <Acao><Feature>Request |
| DTO Response | <Feature>Response      |
| Validator    | <Feature>Validator     |

## Benefícios esperados

### Para o time

* Projetos previsíveis
* Menos curva de aprendizado
* Facilita code review
* Reduz dívida técnica
* Reuso de padrões

### Para novos membros

* Onboarding rápido
* Estrutura intuitiva
* Documentação implícita no código

### Para agentes de IA

* Navegação clara do código
* Identificação de responsabilidades
* Melhor geração de testes e refatorações
* Respostas mais precisas sobre erros

## Conclusão

Este padrão equilibra:

* Simplicidade para projetos CRUD
* Estrutura para crescimento futuro
* Isolamento de domínios
* Baixo acoplamento
* Práticas corporativas modernas
