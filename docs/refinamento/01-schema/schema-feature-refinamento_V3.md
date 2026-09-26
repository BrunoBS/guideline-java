# Feature Schema — Refinamento Técnico V3

## 1. Objetivo

Esta V3 complementa o refinamento de Schema V2 exclusivamente para consolidar a modelagem e as regras de negócio de status e versionamento de `SchemaVersion`.

O restante do refinamento V2 permanece válido. Em caso de divergência sobre os pontos tratados neste documento, prevalece esta V3.

---

## 2. Regra de catálogo

Na Golden Reference, conceitos fechados que seriam naturalmente representados por `enum` no código devem ser modelados como catálogo persistido quando fizerem parte do domínio persistente.

A quantidade de consumidores não determina se o conceito é catálogo. Mesmo que um conjunto fechado de valores seja utilizado por apenas uma feature, ele continua sendo catálogo quando possuir essa natureza semântica.

Para `SchemaVersion`, o status da versão é um conjunto fechado de valores e, portanto, deve ser representado por catálogo, e não por `enum` Java.

---

## 3. SchemaVersionStatusType

Criar o catálogo:

```text
SchemaVersionStatusType
```

Localização conceitual:

```text
foundation
└── catalog
    └── SchemaVersionStatusType
```

O nome completo é intencional:

- `SchemaVersion`: identifica o recurso qualificado;
- `Status`: identifica a dimensão representada;
- `Type`: mantém o padrão de nomenclatura dos catálogos da Golden.

Não utilizar apenas `SchemaVersionType`, pois esse nome seria semanticamente ambíguo.

Valores iniciais:

```text
DRAFT
PUBLISHED
```

`SchemaVersion.status` deve referenciar `SchemaVersionStatusType`.

Não criar um enum semântico paralelo para representar o status fora do padrão de catálogo. A infraestrutura padrão da Golden pode manter `SchemaVersionStatusTypeEnum` como contrato técnico do próprio catálogo (`CatalogEnum`), sem criar uma segunda representação de domínio.

---

## 4. Criação do Schema

Ao criar um novo `Schema`, o sistema deve criar automaticamente sua primeira versão:

```text
Schema
└── SchemaVersion v1
    └── status = DRAFT
```

Assim, um Schema recém-criado já possui uma versão editável, mas ainda não possui uma versão efetiva para consumo.

---

## 5. Regra do DRAFT

Uma versão `DRAFT`:

- pode ser visualizada e editada no contexto administrativo;
- não pode ser utilizada como versão efetiva pelos consumidores;
- não participa da resolução de Schema para validação;
- pode ser excluída fisicamente;
- não representa histórico oficial publicado.

Deve existir, no máximo, **uma versão DRAFT por Schema**.

Se já existir uma DRAFT e o usuário continuar alterando o Schema, as alterações devem ocorrer nessa mesma versão. Não criar uma nova versão enquanto houver DRAFT aberta.

---

## 6. Publicação

Ao publicar uma versão DRAFT:

```text
DRAFT -> PUBLISHED
```

A versão passa a fazer parte do histórico oficial do Schema.

Uma versão `PUBLISHED` é imutável. Ela não deve ser editada diretamente.

Versões anteriormente publicadas permanecem com status `PUBLISHED`; publicar uma nova versão não altera o status histórico das anteriores.

---

## 7. Criação automática de nova versão

Quando o usuário solicitar alteração de um Schema cuja versão vigente já esteja `PUBLISHED`, o sistema deve criar automaticamente a próxima versão como `DRAFT`.

Exemplo:

```text
v1 PUBLISHED
      |
      | usuário solicita alteração
      v
v2 DRAFT
```

A nova DRAFT deve ser criada como cópia da versão publicada vigente, preservando inicialmente sua definição. O usuário altera somente o que for necessário sobre essa cópia.

A versão publicada nunca é modificada diretamente.

Se já existir uma DRAFT aberta, o sistema não cria outra versão e continua trabalhando na DRAFT existente.

---

## 8. Versão publicada vigente

A versão publicada vigente é determinada pelo **maior número de versão entre as versões com status PUBLISHED**.

Formalmente:

```text
currentPublishedVersion =
    MAX(version)
    WHERE status = PUBLISHED
```

A resolução não deve utilizar `createdAt`, `updatedAt` ou outro critério temporal para determinar a versão vigente.

Exemplo:

```text
v1 PUBLISHED
v2 PUBLISHED
v3 DRAFT

vigente para consumo = v2
```

A DRAFT nunca interfere na resolução da versão publicada vigente.

---

## 9. Exclusão de DRAFT

Uma versão DRAFT pode ser descartada por exclusão física.

Exemplo:

```text
v1 PUBLISHED
v2 DRAFT
```

Se `v2` for descartada:

```text
v1 PUBLISHED
```

`v1` continua sendo a versão vigente.

Como a DRAFT descartada nunca se tornou parte do histórico oficial, seu número pode ser reutilizado. Assim, uma futura alteração de `v1` pode criar novamente:

```text
v2 DRAFT
```

Versões PUBLISHED não seguem essa regra de exclusão física.

---

## 10. Visibilidade

Separar explicitamente administração de consumo.

### Administração

Usuários autorizados a administrar Schema podem:

- visualizar DRAFT;
- editar DRAFT;
- publicar DRAFT;
- descartar DRAFT;
- consultar versões PUBLISHED.

### Consumo

Consumidores do Schema:

- não resolvem DRAFT;
- não utilizam DRAFT para validação;
- recebem somente a versão PUBLISHED vigente.

---

## 11. Invariantes

A implementação deve garantir:

1. no máximo uma DRAFT por Schema;
2. `version` única dentro do Schema;
3. PUBLISHED é imutável;
4. DRAFT pode ser alterada;
5. DRAFT pode ser excluída fisicamente;
6. alteração sobre uma PUBLISHED cria automaticamente a próxima DRAFT;
7. a nova DRAFT nasce como cópia da PUBLISHED vigente;
8. se já houver DRAFT, continuar nela;
9. publicação transforma DRAFT em PUBLISHED;
10. publicações anteriores continuam PUBLISHED;
11. a versão vigente é a maior `version` com status PUBLISHED;
12. consumidores nunca utilizam DRAFT;
13. o status é representado pelo catálogo `SchemaVersionStatusType`; `SchemaVersionStatusTypeEnum`, quando existente, é somente a enumeração técnica exigida pela infraestrutura de catálogo, e não um enum de domínio paralelo.

---

## 12. Exemplo completo

```text
1. Criar Schema
   -> v1 DRAFT

2. Editar Schema
   -> continua v1 DRAFT

3. Publicar
   -> v1 PUBLISHED

4. Alterar Schema
   -> cria v2 DRAFT copiando v1

5. Continuar editando
   -> continua v2 DRAFT

6. Descartar v2
   -> hard delete de v2
   -> v1 continua vigente

7. Alterar novamente
   -> cria v2 DRAFT copiando v1

8. Publicar v2
   -> v1 PUBLISHED
   -> v2 PUBLISHED
   -> vigente = v2

9. Alterar novamente
   -> cria v3 DRAFT copiando v2

10. Consumo
    -> continua utilizando v2 enquanto v3 estiver DRAFT
```

---

## 13. Testes mínimos

A refatoração deve cobrir ao menos:

- criação de Schema gera v1 DRAFT;
- DRAFT não é resolvida para consumo;
- edição de DRAFT não cria nova versão;
- tentativa de manter duas DRAFTs para o mesmo Schema é impedida;
- publicação altera DRAFT para PUBLISHED;
- PUBLISHED não pode ser editada diretamente;
- alteração de PUBLISHED cria próxima versão DRAFT;
- nova DRAFT copia a definição da PUBLISHED vigente;
- descarte de DRAFT realiza hard delete;
- descarte da DRAFT não afeta a PUBLISHED vigente;
- número de DRAFT descartada pode ser reutilizado;
- versões PUBLISHED anteriores permanecem PUBLISHED;
- maior versão PUBLISHED é resolvida como vigente;
- DRAFT de número superior não substitui a PUBLISHED vigente;
- `SchemaVersion.status` referencia `SchemaVersionStatusType`;
- não existe enum semântico/de domínio duplicando o catálogo; eventual `SchemaVersionStatusTypeEnum` existe apenas como infraestrutura padrão do catálogo.

---

## 14. Resultado esperado

O ciclo de versionamento fica determinístico:

```text
CREATE
  |
  v
DRAFT --publish--> PUBLISHED
  ^                    |
  |                    | alteração
  |                    v
  +------------- próxima DRAFT
```

O histórico oficial é composto pelas versões PUBLISHED, enquanto DRAFT representa exclusivamente o trabalho em andamento.

Esta V3 deve ser utilizada como referência para a refatoração de `SchemaVersion` e de seu status no `workspace-service`.
