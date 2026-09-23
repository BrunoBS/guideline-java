# Feature de Compartilhamento — Documentação de Negócio e Estado da Implementação

**API:** `account-api`  

> **Versão V2 — validação contra a implementação real do `account-api/main`.**
>
> Esta versão preserva as regras de negócio da V1 e acrescenta a
> verificação do que está efetivamente implementado, além de registrar
> divergências de nomenclatura e pontos técnicos ainda pendentes de
> alinhamento. A regra de negócio adotada continua sendo Contract /
> Participant / Receiver / Publisher; nomes antigos Target / Origin que
> ainda aparecem no código são considerados legado técnico.

**Feature:** Sharing / Compartilhamento entre aplicações  
**Base analisada:** branch `main`  
**Objetivo:** descrever o comportamento de negócio da feature de compartilhamento, considerando o código atual e a semântica funcional do domínio.

---

## 1. Visão geral

A feature de compartilhamento permite que uma aplicação da plataforma declare que está apta a **receber determinados tipos de dados publicados por outras aplicações**.

O modelo é composto por dois conceitos principais:

1. **Contrato de compartilhamento (`Sharing`)** — define **qual aplicação receberá os dados** e **quais tipos de dados ela aceita receber**.
2. **Participante (`SharingParticipant`)** — representa **qual aplicação está autorizada a enviar dados para esse contrato**.

Em termos de negócio:

> Uma aplicação receptora, com escopo `SHARED`, cria um contrato informando quais tipos de dados deseja receber. Outras aplicações podem solicitar participação nesse contrato. Após aprovação, essas aplicações passam a poder publicar os dados permitidos pelo contrato para a aplicação receptora.

---

## 2. Conceito central

O compartilhamento é orientado por três perguntas:

### Para onde os dados serão enviados?

Para a **aplicação receptora** associada ao contrato.

### Quem pode enviar os dados?

As **aplicações participantes** cujo relacionamento com o contrato esteja aprovado.

### Quais dados podem ser enviados?

Somente os tipos de dados definidos nas **features do contrato**.

Exemplo:

```text
Aplicação Receptora: Central Configuration
Contrato: Configuração Compartilhada

Features:
- KEY
- RULE
- MENU
```

Esse contrato significa:

> A aplicação `Central Configuration` está apta a receber dados de chaves, regras e menus.

Se a aplicação `Payments API` for aprovada como participante, significa:

> A `Payments API` está autorizada a publicar seus dados de KEY, RULE e MENU para a `Central Configuration`.

---

## 3. Terminologia de negócio

### 3.1 Aplicação receptora

É a aplicação que **recebe os dados publicados**.

No código, corresponde à aplicação associada ao `Sharing`.

Para criar um contrato, essa aplicação deve possuir escopo:

`SHARED`

A aplicação receptora é o destino da publicação.

---

### 3.2 Aplicação publicadora

É a aplicação que **envia dados** para uma aplicação receptora.

No modelo atual, ela é representada pelo participante do contrato.

A aplicação publicadora pode existir em outra conta e precisa possuir um relacionamento aprovado com o contrato antes de utilizar aquele destino.

---

### 3.3 Contrato de compartilhamento

O contrato define:

- a aplicação receptora;
- o nome do contrato;
- a descrição;
- os tipos de dados aceitos;
- a combinação funcional das features;
- os participantes autorizados.

O contrato funciona simultaneamente como:

- declaração de capacidade de recebimento;
- regra de relacionamento entre aplicações;
- referência para autorização da publicação;
- referência para resolução do destino da publicação.

---

### 3.4 Participante

O participante representa a associação:

```text
Aplicação Publicadora
        |
        v
Contrato de Compartilhamento
        |
        v
Aplicação Receptora
```

Cada participante possui um status que determina se a publicação está autorizada.

---

### 3.5 Features do contrato

As features representam os **tipos ou domínios de dados que podem ser publicados para o destino**.

Exemplos conceituais:

- `KEY`
- `RULE`
- `MENU`
- `ROUTE`
- outras features de backend suportadas pela plataforma.

Portanto, uma feature dentro do contrato não representa simplesmente uma capacidade genérica da aplicação, mas um **tipo de dado autorizado naquele relacionamento de compartilhamento**.

---

## 4. Modelo conceitual

```text
Conta de Destino
    |
    +-- Aplicação Receptora (SHARED)
            |
            +-- Contrato de Compartilhamento
                    |
                    +-- KEY
                    +-- RULE
                    +-- MENU
                    |
                    +-- Participante A
                    |       |
                    |       +-- Payments API
                    |
                    +-- Participante B
                            |
                            +-- Orders API
```

No momento da publicação:

```text
Payments API
    |
    | publica KEY / RULE / MENU
    |
    v
Contrato aprovado
    |
    v
Central Configuration
```

---

## 5. Pré-condições do compartilhamento

### Aplicação receptora

A aplicação que cria o contrato deve:

- existir;
- pertencer à conta informada;
- estar ativa;
- possuir escopo `SHARED`.

### Features

As features do contrato devem:

- existir no catálogo;
- estar disponíveis;
- estar ativas;
- possuir escopo `BACKEND_APPLICATION`.

### Aplicação publicadora

A aplicação participante deve:

- existir;
- pertencer à conta informada;
- estar ativa;
- ser diferente da aplicação receptora.

A mesma aplicação não pode publicar para ela própria por meio do mesmo contrato.

---

## 6. Fluxo de criação do contrato

O fluxo começa na aplicação que deseja receber dados.

### Etapa 1 — aplicação receptora

Uma aplicação com escopo:

`SHARED`

é selecionada como receptora.

### Etapa 2 — definição dos dados aceitos

A aplicação cria um contrato informando:

- nome;
- descrição;
- lista de features.

Exemplo:

```json
{
  "name": "Configuração Central",
  "description": "Recebe configurações publicadas por aplicações participantes",
  "features": [
    {
      "name": "KEY",
      "label": "Chaves"
    },
    {
      "name": "RULE",
      "label": "Regras"
    },
    {
      "name": "MENU",
      "label": "Menus"
    }
  ]
}
```

A conta e a aplicação receptora são determinadas pelo contexto da URL.

### Etapa 3 — validações

A API valida:

1. conta e aplicação;
2. situação ativa;
3. escopo `SHARED`;
4. nome;
5. descrição;
6. existência das features;
7. disponibilidade das features;
8. escopo permitido das features;
9. duplicidade de nome;
10. duplicidade da combinação de features.

### Etapa 4 — criação

O contrato é persistido e recebe:

- `id`;
- `identifier`;
- `version`;
- `hashFeatures`.

A partir desse momento ele pode ser descoberto por aplicações interessadas em publicar dados para esse destino.

---

## 7. Regras do contrato

### Nome

Obrigatório.

Tamanho:

- mínimo: 3;
- máximo: 100 caracteres.

O nome é único dentro da aplicação receptora.

### Descrição

Obrigatória.

Tamanho:

- mínimo: 3;
- máximo: 100 caracteres.

### Features

É obrigatório informar ao menos uma feature.

Todas devem ser elegíveis para compartilhamento.

### Combinação das features

A API calcula um hash SHA-256 a partir da aplicação receptora e da lista ordenada de features.

Conceitualmente:

```text
destApp=<applicationId>|features=<feature1>,<feature2>,...
```

Assim:

```text
[KEY, RULE, MENU]
```

e:

```text
[MENU, KEY, RULE]
```

representam o mesmo contrato funcional.

A mesma aplicação não pode possuir dois contratos com a mesma combinação de features.

---

## 8. Descoberta de contratos

Uma aplicação publicadora pode consultar quais contratos estão disponíveis.

A consulta permite filtrar por:

- conta receptora;
- aplicação receptora;
- status do relacionamento.

Para cada contrato, são retornadas informações sobre:

- contrato;
- aplicação receptora;
- conta receptora;
- features aceitas;
- status do relacionamento;
- validade do destino.

Quando a aplicação ainda não possui relacionamento com o contrato:

`NOT_REQUESTED`

Esse status representa que ainda não existe solicitação de participação.

---

## 9. Solicitação de participação

Depois de encontrar um contrato, a aplicação publicadora pode solicitar participação.

A solicitação informa:

- contrato;
- conta receptora;
- aplicação receptora.

Exemplo:

```json
{
  "sharingId": 10,
  "accountSharingId": 2,
  "applicationSharingId": 15
}
```

A API:

1. valida a aplicação publicadora;
2. localiza o contrato;
3. valida a aplicação receptora;
4. impede origem e destino iguais;
5. verifica duplicidade de participação;
6. cria o participante.

O status inicial é:

`WAITING_DESTINATION_APPROVAL`

Significado:

> A aplicação publicadora solicitou autorização para enviar dados para o destino, e a aplicação receptora precisa aprovar ou rejeitar essa solicitação.

---

## 10. Máquina de estados

```text
NOT_REQUESTED

WAITING_DESTINATION_APPROVAL
        |
        +----> APPROVED ----> CANCELLED
        |
        +----> REJECTED

WAITING_SOURCE_APPROVAL
        |
        +----> APPROVED ----> CANCELLED
        |
        +----> REJECTED
```

---

## 11. Significado dos estados

### `NOT_REQUESTED`

Ainda não existe um participante persistido para aquele contrato.

A aplicação publicadora conhece o contrato, mas não solicitou autorização.

---

### `WAITING_DESTINATION_APPROVAL`

A aplicação publicadora solicitou participação.

A aplicação receptora deve decidir.

Transições:

- `APPROVED`;
- `REJECTED`.

---

### `APPROVED`

A aplicação publicadora está autorizada a enviar os dados definidos pelo contrato para a aplicação receptora.

Esse é o estado que habilita o contrato como destino operacional de publicação.

---

### `WAITING_SOURCE_APPROVAL`

O contrato mudou depois de uma aprovação anterior.

A aplicação publicadora precisa aceitar novamente o novo conjunto de dados permitidos.

Transições:

- `APPROVED`;
- `REJECTED`.

---

### `REJECTED`

A solicitação ou a nova versão funcional do contrato foi rejeitada.

Estado final no modelo atual.

---

### `CANCELLED`

O relacionamento aprovado foi cancelado.

Pode ser acionado por qualquer um dos lados.

Estado final no modelo atual.

---

## 12. Responsabilidade pelas decisões

| Estado atual | Quem decide | Próximos estados |
|---|---|---|
| `WAITING_DESTINATION_APPROVAL` | Aplicação receptora | `APPROVED`, `REJECTED` |
| `WAITING_SOURCE_APPROVAL` | Aplicação publicadora | `APPROVED`, `REJECTED` |
| `APPROVED` | Publicador ou receptor | `CANCELLED` |
| `REJECTED` | Ninguém | Final |
| `CANCELLED` | Ninguém | Final |

---

## 13. Aprovação inicial

Fluxo:

```text
Aplicação receptora cria contrato
            |
            v
Contrato define dados aceitos
            |
            v
Aplicação publicadora localiza contrato
            |
            v
Solicita participação
            |
            v
WAITING_DESTINATION_APPROVAL
            |
      +-----+-----+
      |           |
      v           v
 APPROVED      REJECTED
```

Quando aprovado:

> a aplicação publicadora passa a poder utilizar aquele contrato como destino de publicação.

---

## 14. Publicação dos dados

A publicação ocorre depois da aprovação.

Exemplo:

```text
Contrato:
- KEY
- RULE
- MENU
```

Participante aprovado:

```text
Payments API
```

No momento da publicação:

```text
Payments API
    |
    +-- KEY --------+
    +-- RULE -------+----> Central Configuration
    +-- MENU -------+
```

O contrato define o limite funcional da publicação.

Logo:

- se `KEY` está no contrato, pode ser publicado;
- se `RULE` está no contrato, pode ser publicado;
- se `MENU` está no contrato, pode ser publicado;
- se `ROUTE` não está no contrato, não faz parte daquele relacionamento.

---

## 15. Resolução do destino de publicação

A consulta de destinos compartilhados retorna apenas relacionamentos aprovados.

Para a aplicação publicadora, ela resolve:

- aplicação receptora;
- conta receptora;
- contrato;
- ambiente;
- publisher;
- parâmetros do publisher;
- features aceitas.

Conceitualmente:

```text
Aplicação Publicadora
        |
        v
Relacionamento APPROVED
        |
        v
Contrato
        |
        +-- Features permitidas
        |
        +-- Aplicação Receptora
                |
                +-- Ambiente
                |
                +-- Publisher
                |
                +-- Parâmetros
```

Esse fluxo permite à plataforma responder:

```text
Quem recebe?
Como enviar?
Em qual ambiente?
Quais dados podem ser enviados?
```

---

## 16. Integração conceitual com Publisher

O `Sharing` define **a relação de negócio**.

O `Publisher` define **o mecanismo de entrega**.

Assim:

```text
Sharing
    |
    +-- Quem envia
    +-- Quem recebe
    +-- O que pode ser enviado

Publisher
    |
    +-- Como enviar
    +-- Para onde tecnicamente enviar
    +-- Quais parâmetros utilizar
```

No momento da publicação, as duas informações se combinam:

```text
Participante aprovado
        |
        v
Contrato
        |
        v
Aplicação receptora
        |
        v
Ambiente
        |
        v
Publisher configurado
        |
        v
Entrega dos dados
```

---

## 17. Alteração das features do contrato

Essa é uma das regras mais importantes do fluxo.

Considere:

```text
Contrato original:
- KEY
- RULE
- MENU
```

Participante:

```text
Payments API
Status: APPROVED
```

A aplicação receptora altera o contrato para:

```text
- KEY
- RULE
- MENU
- ROUTE
```

O hash funcional muda.

Todos os participantes atualmente `APPROVED` passam automaticamente para:

`WAITING_SOURCE_APPROVAL`

Significado:

> A aplicação publicadora precisa aceitar o novo conjunto de tipos de dados que poderá enviar para aquele destino.

Fluxo:

```text
APPROVED
    |
    | receptor altera features
    v
WAITING_SOURCE_APPROVAL
    |
    +----> APPROVED
    |
    +----> REJECTED
```

---

## 18. Alterações que não exigem nova aprovação

O código atual só dispara nova aprovação quando muda o hash das features.

Portanto, mudanças apenas em:

- nome;
- descrição;

não alteram o status dos participantes.

A regra implementada é:

> apenas mudanças no conteúdo funcional do contrato exigem novo consentimento da aplicação publicadora.

---

## 19. Cancelamento

Um relacionamento aprovado pode ser cancelado por:

- aplicação publicadora;
- aplicação receptora.

Transição:

```text
APPROVED -> CANCELLED
```

Após o cancelamento, o contrato deixa de ser um destino operacional válido para aquele participante.

---

## 20. Rejeição

Uma solicitação pode ser rejeitada em dois momentos:

### Aprovação inicial

```text
WAITING_DESTINATION_APPROVAL -> REJECTED
```

Quem rejeita:

Aplicação receptora.

### Reaprovação após mudança de contrato

```text
WAITING_SOURCE_APPROVAL -> REJECTED
```

Quem rejeita:

Aplicação publicadora.

---

## 21. Remoção de participante

Além de cancelar, a aplicação receptora pode remover diretamente um participante.

Isso exclui o relacionamento persistido.

Diferença conceitual:

```text
CANCELLED
```

mantém o registro do relacionamento.

Enquanto:

```text
DELETE participant
```

remove o vínculo.

Essa diferença precisa ser considerada para histórico e auditoria.

---

## 22. Exclusão do contrato

Quando um contrato é excluído:

1. os participantes são removidos;
2. o contrato é removido.

Consequentemente:

> nenhuma aplicação continua autorizada a publicar para aquele contrato.

---

## 23. Controle de concorrência

O contrato utiliza versionamento otimista.

Exemplo:

```text
Versão atual: 3

Usuário A atualiza
-> versão 4

Usuário B tenta atualizar usando versão 3
-> conflito
```

Esse mecanismo evita sobrescrita silenciosa de mudanças concorrentes.

---

## 24. Permissões

No controller do contrato:

- leitura: `DEV`;
- escrita: `ADM`.

Portanto, criação, alteração e exclusão do contrato exigem nível administrativo de escrita.

As operações relevantes também são auditadas.

---

## 25. Endpoints de negócio

### Contrato

Base:

```text
/api/v1/accounts/{accountId}/applications/{applicationId}/sharings
```

| Método | Operação |
|---|---|
| `POST` | Criar contrato |
| `GET` | Listar contratos |
| `GET /{sharingId}` | Consultar contrato |
| `PUT /{sharingId}` | Alterar contrato |
| `DELETE /{sharingId}` | Excluir contrato |
| `GET /{sharingId}/participants` | Listar aplicações publicadoras participantes |
| `PATCH /{sharingId}/participants/{participantId}` | Aprovar, rejeitar ou cancelar |
| `DELETE /{sharingId}/participants/{participantId}` | Remover participante |

### Aplicação publicadora

Base:

```text
/api/v1/accounts/{accountId}/applications/{applicationId}
```

| Método | Operação |
|---|---|
| `GET /shared-accounts` | Listar contas/aplicações que possuem contratos |
| `GET /shared-avalilables` | Listar contratos disponíveis |
| `POST /shared-participants` | Solicitar participação |
| `PATCH /shared-participants/{participantId}` | Responder reaprovação ou cancelar |
| `GET /shared-destinations` | Resolver destinos aprovados de publicação |

---

## 26. Jornada completa

```text
1. Existe uma aplicação receptora
                    |
                    v
2. Aplicação possui escopo SHARED
                    |
                    v
3. Aplicação cria um contrato
   - KEY
   - RULE
   - MENU
                    |
                    v
4. Contrato fica disponível
                    |
                    v
5. Aplicação publicadora encontra contrato
                    |
                    v
6. Solicita participação
                    |
                    v
7. WAITING_DESTINATION_APPROVAL
                    |
          +---------+---------+
          |                   |
          v                   v
      APPROVED             REJECTED
          |
          v
8. Contrato vira destino válido
          |
          v
9. Publicador realiza publicação
          |
          v
10. Dados são enviados ao receptor
          |
          +-----------------------------+
          |                             |
          v                             v
   Contrato permanece             Features mudam
          |                             |
          v                             v
     segue aprovado          WAITING_SOURCE_APPROVAL
                                        |
                              +---------+---------+
                              |                   |
                              v                   v
                          APPROVED             REJECTED
```

---

## 27. Exemplo completo

Considere:

```text
Conta Plataforma
└── Central Configuration
    Escopo: SHARED

Conta Payments
└── Payments API
```

A `Central Configuration` cria:

```text
Contrato: Configuração Compartilhada

Features:
- KEY
- RULE
- MENU
```

Significado:

> A Central Configuration deseja receber dados de chave, regra e menu.

A `Payments API` solicita participação.

Status:

`WAITING_DESTINATION_APPROVAL`

A `Central Configuration` aprova.

Status:

`APPROVED`

A partir daí, no momento de publicação:

```text
Payments API
    |
    +-- KEY
    +-- RULE
    +-- MENU
    |
    v
Central Configuration
```


---

# 30. Validação contra a implementação atual do account-api

A implementação existente em `main` confirma que a feature está
substancialmente construída.

Componentes identificados:

```text
feature/sharing/
├── catalog/
│   ├── ShareStatusType
│   ├── ShareStatusTypeEnum
│   ├── ShareStatusTypeRepository
│   └── ShareStatusTypeService
├── contract/
│   ├── Sharing
│   ├── SharingDTO
│   ├── SharingMapper
│   ├── SharingRepository
│   ├── SharingService
│   └── SharingValidator
└── participant/
    ├── SharingParticipant
    ├── SharingParticipantService
    ├── SharingParticipantMapper
    ├── dto/
    └── repository/
        └── projections/

web/sharing/
├── SharingController
└── SharingParticipantController
```

Isso confirma que não se trata apenas de uma especificação conceitual:
há CRUD de contrato, relacionamento de participantes, catálogo de
status, descoberta de contratos, resolução de destinos, projections e
integração com autorização/auditoria.

---

# 31. O que está implementado e alinhado com a regra de negócio

## 31.1 Contrato receptor

A entidade `Sharing` representa o contrato associado à aplicação
receptora.

A implementação valida:

- aplicação existente;
- aplicação pertencente à conta;
- aplicação com escopo `SHARED`;
- nome obrigatório;
- descrição obrigatória;
- features obrigatórias;
- features ativas/disponíveis;
- features compatíveis com escopo de backend;
- nome único por aplicação;
- combinação funcional de features única por aplicação;
- versionamento otimista.

A combinação das features utiliza hash para impedir dois contratos
funcionalmente equivalentes dentro da mesma aplicação receptora.

---

## 31.2 Alteração de features e reaprovação

A implementação confirma a regra:

```text
participante APPROVED
        |
        | features do contrato mudam
        v
WAITING_SOURCE_APPROVAL
```

Somente participantes em `APPROVED` são movidos automaticamente para
`WAITING_SOURCE_APPROVAL`.

Alterações de nome ou descrição não disparam reaprovação.

---

## 31.3 Catálogo de status

A máquina de estados implementada é:

```text
WAITING_DESTINATION_APPROVAL
    -> APPROVED
    -> REJECTED

WAITING_SOURCE_APPROVAL
    -> APPROVED
    -> REJECTED

APPROVED
    -> CANCELLED

REJECTED
    -> terminal

CANCELLED
    -> terminal

NOT_REQUESTED
    -> estado virtual de consulta
```

A implementação também define quem pode agir:

| Estado | Ator permitido |
|---|---|
| `WAITING_DESTINATION_APPROVAL` | destino/receptor |
| `WAITING_SOURCE_APPROVAL` | origem/publicador |
| `APPROVED` | ambos |
| `REJECTED` | ninguém |
| `CANCELLED` | ninguém |

---

## 31.4 Descoberta e resolução operacional

A implementação possui três consultas distintas para o lado publicador:

```text
/shared-accounts
/shared-avalilables
/shared-destinations
```

Responsabilidades:

- `shared-accounts`: identifica contas/aplicações que possuem contratos;
- `shared-avalilables`: lista contratos disponíveis e situação do relacionamento;
- `shared-destinations`: resolve destinos efetivamente utilizáveis para publicação.

A resolução operacional considera apenas participantes:

```text
status = APPROVED
```

e valida também:

- aplicação receptora ativa;
- conta receptora ativa;
- escopo receptor `SHARED`;
- ambiente;
- publishers configurados;
- feature solicitada pertencente ao contrato.

---

## 31.5 Publisher

A consulta de destinos resolve:

```text
contrato
receiver account
receiver application
environment
publisher
publisher parameters
```

confirmando a separação:

```text
Sharing
  = relacionamento de negócio

Publisher
  = mecanismo técnico de entrega
```

---

## 31.6 Auditoria

As mutações principais estão anotadas com `@Auditable`.

Recursos auditados:

```text
SHARING
SHARING_PARTICIPANT
```

A documentação de negócio não deve criar um mecanismo paralelo de
auditoria. A integração deve acompanhar o padrão vigente da plataforma.

---

## 31.7 Autorização

O controller de contratos utiliza política:

```text
read  = DEV
write = ADM
```

Essa regra está implementada no boundary do contrato.

As operações do controller do publicador/participante devem continuar
sendo avaliadas para garantir que a autorização contextual esteja
uniformemente aplicada.

---

# 32. Divergências de nomenclatura encontradas no código

Apesar da regra de negócio já ter sido refinada para:

```text
Contract
Participant
Receiver
Publisher
```

a implementação ainda possui nomes históricos:

```text
sharing_targets
sharing_target_features
sharing_origins
applicationOrigen
sharingTarget
SharingOriginProjection
SharingOriginByTargetDTO
NOT_FOUND_TARGET
NOT_FOUND_ORIGIN
```

Esses nomes representam o modelo antigo:

```text
Target = Receiver / Contract
Origin = Publisher / Participant
```

A documentação V2 considera como vocabulário oficial:

```text
Contract
Participant
Receiver
Publisher
```

Portanto, Target/Origin devem ser tratados como dívida de nomenclatura,
não como conceitos adicionais do domínio.

---

# 33. Divergências técnicas identificadas

## 33.1 Persistência ainda usa nomes antigos

As entidades ainda mapeiam:

```text
sharing_targets
sharing_target_features
sharing_origins
type_sharing_statuses
```

Enquanto o refinamento arquitetural posterior previa nomenclatura
orientada ao domínio Contract/Participant.

Isso não altera a regra de negócio, mas indica que a refatoração de
nomenclatura não foi concluída integralmente na `main`.

---

## 33.2 SQL nativo com nomenclatura inconsistente

Há query de consulta que ainda referencia nomes antigos diferentes dos
nomes usados pelas entidades, como:

```text
sharing_origin
sharing_target
share_status_types
```

enquanto outras queries utilizam:

```text
sharing_origins
sharing_targets
type_sharing_statuses
```

Esse ponto deve ser revisado antes de considerar a implementação
completamente estabilizada.

---

## 33.3 Validação de duplicidade do participante

A regra de negócio é:

> uma mesma aplicação publicadora não pode possuir duas participações no
> mesmo contrato.

A implementação deve garantir a unicidade pela relação:

```text
contract + publisher application
```

A validação em serviço e a constraint física precisam ser revisadas em
conjunto para garantir que usam a aplicação participante, e não o ID
interno do participante por engano.

---

## 33.4 Escopo da aplicação publicadora

As queries operacionais validam a origem/publicador como aplicação de
backend.

A criação da solicitação deve preservar a mesma invariante de maneira
explícita e uniforme.

Regra esperada:

```text
Receiver  -> SHARED
Publisher -> BACKEND / escopo backend compatível
```

---

## 33.5 Autorização contextual

O contrato possui policy declarativa clara.

No lado Participant/Destination, parte da proteção depende de validações
contextuais no service.

A estabilização deve garantir que:

- receiver só aprove/rejeite quando for o ator permitido;
- publisher só responda `WAITING_SOURCE_APPROVAL`;
- somente os dois lados cancelem um vínculo `APPROVED`;
- consultas e mutações respeitem Account/Application autorizadas.

---

# 34. Modelo consolidado atual

O modelo de negócio definitivo permanece:

```text
RECEIVER APPLICATION (SHARED)
        |
        v
SHARING CONTRACT
        |
        +-- FEATURES
        |
        +-- PARTICIPANT
                |
                v
        PUBLISHER APPLICATION
                |
                v
              STATUS
```

Publicação:

```text
PUBLISHER
   |
   | relationship APPROVED
   v
CONTRACT
   |
   | feature permitida
   v
RECEIVER
   |
   v
ENVIRONMENT
   |
   v
PUBLISHER CONFIGURATION
   |
   v
DELIVERY
```

---

# 35. Conclusão da validação

A documentação de negócio da V1 estava majoritariamente correta em
relação ao comportamento implementado.

A V2 passa a ser a referência porque acrescenta:

1. estado real da implementação;
2. componentes existentes;
3. confirmação da máquina de estados;
4. confirmação da resolução de destinos e publishers;
5. confirmação de autorização e auditoria;
6. identificação da dívida Target/Origin;
7. inconsistências de SQL/tabelas ainda presentes;
8. pontos de validação que precisam ser estabilizados.

Portanto:

```text
REGRA DE NEGÓCIO
    = madura e documentada

IMPLEMENTAÇÃO
    = avançada / substancialmente completa

ESTABILIZAÇÃO
    = ainda necessária em nomenclatura, queries, constraints e autorização contextual
```

A feature não deve ser reimplementada do zero. O caminho correto é
preservar o comportamento existente e concluir a estabilização técnica.
