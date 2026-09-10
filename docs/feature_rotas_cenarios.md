# Feature Rotas --- Cenários de Cadastro, Reuso e Evolução

## 1. Objetivo

Este documento descreve, de forma prática, como a API de Rotas deve se
comportar durante o cadastro e a evolução de uma rota.

O foco é deixar explícito:

-   quais dados o usuário informa em cada operação;
-   quais decisões e validações são executadas pelo backend;
-   quando `URL`, `ROUTE` e `URL_VERSION` são criadas ou reutilizadas;
-   quando a operação deve ser rejeitada por duplicidade;
-   como diferentes versões podem coexistir no mesmo ambiente;
-   como ficam as tabelas após cada ciclo da simulação.

> **Premissa da simulação:** o cadastro e a evolução de uma rota
> acontecem inicialmente em `DEV`. A disponibilização nos demais
> ambientes é responsabilidade do fluxo de promoção.

------------------------------------------------------------------------

## 2. Dados informados pelo usuário

Para cadastrar ou evoluir uma rota, o usuário informa os dados de
negócio abaixo.

  -----------------------------------------------------------------------
  Dado                    Exemplo                 Finalidade
  ----------------------- ----------------------- -----------------------
  `accountId`             `ACC-01`                Identifica a conta

  `applicationId`         `APP-A`                 Identifica a aplicação
                                                  que utilizará a rota

  `environmentId`         `ENV-DEV`               Ambiente no qual a
                                                  versão será
                                                  disponibilizada

  `basePath`              `/clientes`             URL lógica da rota

  `schemaVersionId`       `SV-1.0.0`              Contrato que será
                                                  utilizado pela versão
                                                  da URL

  `schemaData`            `{ ... }`               Configuração da rota
                                                  conforme o Schema,
                                                  quando aplicável
  -----------------------------------------------------------------------

O usuário **não precisa informar** IDs internos de `URL`, `ROUTE`,
`URL_VERSION` ou `ROUTE_ENVIRONMENT`. Esses registros são resolvidos ou
criados pelo backend.

A `version_tag` (`v1`, `v2`, `v3`...) também é controlada pelo backend.

------------------------------------------------------------------------

## 3. Responsabilidade das tabelas

### `URL`

Representa o caminho lógico compartilhável dentro de uma conta.

  Campo          Responsabilidade
  -------------- -----------------------------------------
  `id`           Identificador interno
  `account_id`   Conta proprietária
  `base_path`    Caminho lógico, por exemplo `/clientes`

**Regra de unicidade**

``` text
UNIQUE(account_id, base_path)
```

------------------------------------------------------------------------

### `URL_VERSION`

Representa uma versão contratual da URL.

  Campo                 Responsabilidade
  --------------------- ----------------------------------------------
  `id`                  Identificador interno
  `url_id`              URL à qual a versão pertence
  `version_tag`         Tag gerada pelo backend: `v1`, `v2`, `v3`...
  `schema_version_id`   Versão do Schema associada ao contrato

**Regras de unicidade**

``` text
UNIQUE(url_id, schema_version_id)
UNIQUE(url_id, version_tag)
```

Se a mesma URL já possuir uma versão vinculada ao mesmo
`schema_version_id`, o backend reutiliza a `URL_VERSION`.

------------------------------------------------------------------------

### `ROUTE`

Representa o uso da URL por uma aplicação. A URL pode ser compartilhada
entre aplicações, mas cada aplicação possui sua própria rota.

  Campo              Responsabilidade
  ------------------ ------------------------------
  `id`               Identificador interno
  `account_id`       Conta
  `application_id`   Aplicação
  `url_id`           URL utilizada pela aplicação

**Regra de unicidade**

``` text
UNIQUE(account_id, application_id, url_id)
```

------------------------------------------------------------------------

### `ROUTE_ENVIRONMENT`

Representa a disponibilização de uma determinada `URL_VERSION` de uma
rota em um ambiente.

  Campo              Responsabilidade
  ------------------ -----------------------------------
  `id`               Identificador interno
  `route_id`         Rota da aplicação
  `environment_id`   Ambiente
  `url_version_id`   Versão da URL disponibilizada
  `schema_data`      Configuração específica da rota
  `active`           Estado da versão naquele ambiente

**Regra de unicidade**

``` text
UNIQUE(route_id, environment_id, url_version_id)
```

Essa composição é importante porque uma mesma rota pode manter `v1` e
`v2` simultaneamente em `DEV`.

------------------------------------------------------------------------

## 4. Dados base da simulação

Antes dos ciclos abaixo, considere os seguintes cadastros já existentes:

  Entidade           Dados
  ------------------ -----------------------
  Conta              `ACC-01`
  Aplicações         `APP-A`, `APP-B`
  Ambientes          `ENV-DEV`, `ENV-PROD`
  Schema Version 1   `SV-1.0.0`
  Schema Version 2   `SV-2.0.0`

As tabelas `URL`, `URL_VERSION`, `ROUTE` e `ROUTE_ENVIRONMENT` começam
vazias.

------------------------------------------------------------------------

# 5. Ciclo 1 --- Primeiro cadastro de `/clientes`

## Objetivo do ciclo

Cadastrar `/clientes` pela primeira vez para a `APP-A`, utilizando o
contrato `SV-1.0.0`.

### Dados informados pelo usuário

  Dado             Valor
  ---------------- -------------
  Conta            `ACC-01`
  Aplicação        `APP-A`
  Ambiente         `ENV-DEV`
  URL              `/clientes`
  Schema Version   `SV-1.0.0`

### Processamento do backend

1.  Busca `URL` por `ACC-01 + /clientes`.
2.  A URL não existe, portanto cria `URL-01`.
3.  Busca `ROUTE` por `ACC-01 + APP-A + URL-01`.
4.  A rota não existe, portanto cria `ROT-AAA`.
5.  Busca `URL_VERSION` por `URL-01 + SV-1.0.0`.
6.  A versão não existe, portanto cria `VER-V1` e gera
    `version_tag = v1`.
7.  Cria a disponibilização `ROT-AAA + ENV-DEV + VER-V1`.
8.  A versão fica ativa em DEV.
9.  Nenhuma versão é automaticamente disponibilizada em PROD.

### Resultado da operação

**Cadastro realizado com sucesso.**

Foram criados:

``` text
URL-01
ROT-AAA
VER-V1
RE-01
```

### Estado do banco após o Ciclo 1

#### `URL`

  id         account_id   base_path
  ---------- ------------ -------------
  `URL-01`   `ACC-01`     `/clientes`

#### `ROUTE`

  id          account_id   application_id   url_id
  ----------- ------------ ---------------- ----------
  `ROT-AAA`   `ACC-01`     `APP-A`          `URL-01`

#### `URL_VERSION`

  id         url_id     version_tag   schema_version_id
  ---------- ---------- ------------- -------------------
  `VER-V1`   `URL-01`   `v1`          `SV-1.0.0`

#### `ROUTE_ENVIRONMENT`

  id        route_id    environment_id   url_version_id   active
  --------- ----------- ---------------- ---------------- --------
  `RE-01`   `ROT-AAA`   `ENV-DEV`        `VER-V1`         `true`

------------------------------------------------------------------------

# 6. Ciclo 2 --- Outra aplicação cadastra a mesma URL e contrato

## Objetivo do ciclo

A `APP-B` também precisa utilizar `/clientes` com `SV-1.0.0`.

O sistema deve reutilizar tudo o que for compartilhável, mantendo o
isolamento da rota por aplicação.

### Dados informados pelo usuário

  Dado             Valor
  ---------------- -------------
  Conta            `ACC-01`
  Aplicação        `APP-B`
  Ambiente         `ENV-DEV`
  URL              `/clientes`
  Schema Version   `SV-1.0.0`

### Processamento do backend

1.  Busca `URL` por `ACC-01 + /clientes`.
2.  Encontra `URL-01` e **reutiliza** a URL.
3.  Busca `ROUTE` por `ACC-01 + APP-B + URL-01`.
4.  Não encontra rota para a `APP-B`.
5.  Cria `ROT-BBB`.
6.  Busca `URL_VERSION` por `URL-01 + SV-1.0.0`.
7.  Encontra `VER-V1` e **reutiliza** a versão.
8.  Cria `ROT-BBB + ENV-DEV + VER-V1`.
9.  Ativa a versão em DEV para a `APP-B`.

### Resultado da operação

**Cadastro realizado com sucesso por reuso inteligente.**

  Objeto      Ação
  ----------- -------------
  `URL-01`    Reutilizado
  `ROT-BBB`   Criado
  `VER-V1`    Reutilizado
  `RE-02`     Criado

### Estado do banco após o Ciclo 2

#### `URL`

  id         account_id   base_path
  ---------- ------------ -------------
  `URL-01`   `ACC-01`     `/clientes`

#### `ROUTE`

  id          account_id   application_id   url_id
  ----------- ------------ ---------------- ----------
  `ROT-AAA`   `ACC-01`     `APP-A`          `URL-01`
  `ROT-BBB`   `ACC-01`     `APP-B`          `URL-01`

#### `URL_VERSION`

  id         url_id     version_tag   schema_version_id
  ---------- ---------- ------------- -------------------
  `VER-V1`   `URL-01`   `v1`          `SV-1.0.0`

#### `ROUTE_ENVIRONMENT`

  id        route_id    environment_id   url_version_id   active
  --------- ----------- ---------------- ---------------- --------
  `RE-01`   `ROT-AAA`   `ENV-DEV`        `VER-V1`         `true`
  `RE-02`   `ROT-BBB`   `ENV-DEV`        `VER-V1`         `true`

### O que esse ciclo demonstra

``` text
                    URL-01 /clientes
                           |
                     URL_VERSION v1
                       SV-1.0.0
                      /          \
                 APP-A            APP-B
               ROT-AAA          ROT-BBB
                  |                |
                 DEV              DEV
```

A URL e sua versão contratual são compartilhadas. A `ROUTE`, porém,
continua isolada por aplicação.

------------------------------------------------------------------------

# 7. Ciclo 3 --- Tentativa de cadastro duplicado

## Objetivo do ciclo

Validar o comportamento quando a `APP-A` tenta cadastrar exatamente a
mesma combinação que já possui.

### Dados informados pelo usuário

  Dado             Valor
  ---------------- -------------
  Conta            `ACC-01`
  Aplicação        `APP-A`
  Ambiente         `ENV-DEV`
  URL              `/clientes`
  Schema Version   `SV-1.0.0`

### Processamento do backend

1.  Encontra `URL-01`.
2.  Encontra `ROT-AAA`.
3.  Encontra `VER-V1`.
4.  Encontra `ROT-AAA + ENV-DEV + VER-V1`.
5.  Identifica que a mesma versão já está cadastrada para a mesma rota e
    ambiente.
6.  Nenhum novo estado seria produzido.
7.  A operação é rejeitada como duplicidade.

### Resultado da operação

``` text
HTTP 409 Conflict
```

**Nenhum registro é criado ou alterado.**

### Estado do banco após o Ciclo 3

O banco permanece exatamente igual ao final do Ciclo 2.

#### `URL`

  id         account_id   base_path
  ---------- ------------ -------------
  `URL-01`   `ACC-01`     `/clientes`

#### `ROUTE`

  id          account_id   application_id   url_id
  ----------- ------------ ---------------- ----------
  `ROT-AAA`   `ACC-01`     `APP-A`          `URL-01`
  `ROT-BBB`   `ACC-01`     `APP-B`          `URL-01`

#### `URL_VERSION`

  id         url_id     version_tag   schema_version_id
  ---------- ---------- ------------- -------------------
  `VER-V1`   `URL-01`   `v1`          `SV-1.0.0`

#### `ROUTE_ENVIRONMENT`

  id        route_id    environment_id   url_version_id   active
  --------- ----------- ---------------- ---------------- --------
  `RE-01`   `ROT-AAA`   `ENV-DEV`        `VER-V1`         `true`
  `RE-02`   `ROT-BBB`   `ENV-DEV`        `VER-V1`         `true`

------------------------------------------------------------------------

# 8. Ciclo 4 --- Evolução do contrato da APP-A

## Objetivo do ciclo

A `APP-A` continua utilizando `/clientes`, porém agora precisa
disponibilizar uma nova versão baseada em `SV-2.0.0`.

A versão antiga deve continuar disponível para consumidores legados.

### Dados informados pelo usuário

  Dado             Valor
  ---------------- -------------
  Conta            `ACC-01`
  Aplicação        `APP-A`
  Ambiente         `ENV-DEV`
  URL              `/clientes`
  Schema Version   `SV-2.0.0`

### Processamento do backend

1.  Busca `URL` por `ACC-01 + /clientes`.
2.  Encontra `URL-01` e reutiliza.
3.  Busca `ROUTE` por `ACC-01 + APP-A + URL-01`.
4.  Encontra `ROT-AAA` e reutiliza.
5.  Busca `URL_VERSION` por `URL-01 + SV-2.0.0`.
6.  Não encontra uma versão correspondente.
7.  Calcula a próxima `version_tag` da URL.
8.  Cria `VER-V2` com `version_tag = v2` e
    `schema_version_id = SV-2.0.0`.
9.  Cria `ROT-AAA + ENV-DEV + VER-V2`.
10. Mantém `ROT-AAA + ENV-DEV + VER-V1` ativo.
11. As versões `v1` e `v2` passam a coexistir em DEV.

### Resultado da operação

**Nova versão criada com sucesso.**

  Objeto      Ação
  ----------- -------------
  `URL-01`    Reutilizado
  `ROT-AAA`   Reutilizado
  `VER-V1`    Mantido
  `VER-V2`    Criado
  `RE-03`     Criado

### Estado do banco após o Ciclo 4

#### `URL`

  id         account_id   base_path
  ---------- ------------ -------------
  `URL-01`   `ACC-01`     `/clientes`

#### `ROUTE`

  id          account_id   application_id   url_id
  ----------- ------------ ---------------- ----------
  `ROT-AAA`   `ACC-01`     `APP-A`          `URL-01`
  `ROT-BBB`   `ACC-01`     `APP-B`          `URL-01`

#### `URL_VERSION`

  id         url_id     version_tag   schema_version_id
  ---------- ---------- ------------- -------------------
  `VER-V1`   `URL-01`   `v1`          `SV-1.0.0`
  `VER-V2`   `URL-01`   `v2`          `SV-2.0.0`

#### `ROUTE_ENVIRONMENT`

  ----------------------------------------------------------------------------------
  id          route_id    environment_id   url_version_id   active      Uso
  ----------- ----------- ---------------- ---------------- ----------- ------------
  `RE-01`     `ROT-AAA`   `ENV-DEV`        `VER-V1`         `true`      Consumidor
                                                                        legado da
                                                                        APP-A

  `RE-02`     `ROT-BBB`   `ENV-DEV`        `VER-V1`         `true`      APP-B
                                                                        continua na
                                                                        v1

  `RE-03`     `ROT-AAA`   `ENV-DEV`        `VER-V2`         `true`      Novo
                                                                        consumidor
                                                                        da APP-A
  ----------------------------------------------------------------------------------

### Estado lógico após a evolução

``` text
URL-01 /clientes
│
├── VER-V1
│   └── SV-1.0.0
│       ├── APP-A / DEV  → ativo
│       └── APP-B / DEV  → ativo
│
└── VER-V2
    └── SV-2.0.0
        └── APP-A / DEV  → ativo
```

A evolução da `APP-A` não altera a `APP-B` e não desativa
automaticamente a versão anterior.

------------------------------------------------------------------------

# 9. Ciclo 5 --- Promoção da versão v1 da APP-A para PROD

## Objetivo do ciclo

Demonstrar que o ambiente é uma disponibilização da versão e não exige a
criação de uma nova `URL_VERSION`.

Neste exemplo, `VER-V1` da `APP-A` é promovida de DEV para PROD.

### Dados recebidos pelo fluxo de promoção

  Dado               Valor
  ------------------ ------------
  Rota               `ROT-AAA`
  Ambiente destino   `ENV-PROD`
  URL Version        `VER-V1`

### Processamento do backend

1.  Valida a existência de `ROT-AAA`.
2.  Valida que `VER-V1` pertence à URL utilizada por `ROT-AAA`.
3.  Verifica se `ROT-AAA + ENV-PROD + VER-V1` já existe.
4.  Como não existe, cria a associação no ambiente destino.
5.  Nenhuma nova `URL`, `ROUTE` ou `URL_VERSION` é criada.

### Resultado da operação

**Versão disponibilizada em PROD.**

### Estado do banco após o Ciclo 5

#### `URL`

  id         account_id   base_path
  ---------- ------------ -------------
  `URL-01`   `ACC-01`     `/clientes`

#### `ROUTE`

  id          account_id   application_id   url_id
  ----------- ------------ ---------------- ----------
  `ROT-AAA`   `ACC-01`     `APP-A`          `URL-01`
  `ROT-BBB`   `ACC-01`     `APP-B`          `URL-01`

#### `URL_VERSION`

  id         url_id     version_tag   schema_version_id
  ---------- ---------- ------------- -------------------
  `VER-V1`   `URL-01`   `v1`          `SV-1.0.0`
  `VER-V2`   `URL-01`   `v2`          `SV-2.0.0`

#### `ROUTE_ENVIRONMENT`

  ---------------------------------------------------------------------------------
  id          route_id    environment_id   url_version_id   active      Uso
  ----------- ----------- ---------------- ---------------- ----------- -----------
  `RE-01`     `ROT-AAA`   `ENV-DEV`        `VER-V1`         `true`      APP-A
                                                                        legado em
                                                                        DEV

  `RE-02`     `ROT-BBB`   `ENV-DEV`        `VER-V1`         `true`      APP-B em
                                                                        DEV

  `RE-03`     `ROT-AAA`   `ENV-DEV`        `VER-V2`         `true`      APP-A nova
                                                                        versão em
                                                                        DEV

  `RE-04`     `ROT-AAA`   `ENV-PROD`       `VER-V1`         `true`      APP-A v1
                                                                        promovida
                                                                        para PROD
  ---------------------------------------------------------------------------------

------------------------------------------------------------------------

# 10. Matriz de decisão do backend

A decisão principal pode ser resumida pela existência ou não dos
registros.

  ----------------------------------------------------------------------------
  URL            Route da App   URL Version    Route          Ação
                                para o Schema  Environment    
  -------------- -------------- -------------- -------------- ----------------
  Não existe     Não existe     Não existe     Não existe     Criar tudo

  Existe         Não existe     Existe         Não existe     Reusar URL e
                                                              versão; criar
                                                              Route e Route
                                                              Environment

  Existe         Existe         Existe         Existe         `409 Conflict`

  Existe         Existe         Não existe     Não existe     Criar nova URL
                                                              Version e Route
                                                              Environment

  Existe         Existe         Existe         Não existe     Reusar versão e
                                                              criar Route
                                                              Environment
  ----------------------------------------------------------------------------

------------------------------------------------------------------------

# 11. Algoritmo resumido do cadastro

``` text
Entrada:
  accountId
  applicationId
  environmentId
  basePath
  schemaVersionId
  schemaData

1. URL = buscar(accountId, basePath)

2. se URL não existir:
      criar URL

3. ROUTE = buscar(accountId, applicationId, URL.id)

4. se ROUTE não existir:
      criar ROUTE

5. URL_VERSION = buscar(URL.id, schemaVersionId)

6. se URL_VERSION não existir:
      gerar próxima version_tag
      criar URL_VERSION

7. ROUTE_ENVIRONMENT =
      buscar(ROUTE.id, environmentId, URL_VERSION.id)

8. se ROUTE_ENVIRONMENT existir:
      retornar HTTP 409

9. criar ROUTE_ENVIRONMENT

10. retornar cadastro criado
```

------------------------------------------------------------------------

# 12. Regras de negócio consolidadas

1.  `URL` é compartilhável entre aplicações da mesma conta.
2.  O mesmo `base_path` não deve ser duplicado dentro da conta.
3.  Cada aplicação possui uma `ROUTE` própria para a URL.
4.  `ROUTE` não deve ser recriada quando a aplicação evolui o contrato
    da mesma URL.
5.  `URL_VERSION` é compartilhável entre aplicações quando
    `URL + SCHEMA_VERSION` forem iguais.
6.  Uma nova `SCHEMA_VERSION` para a mesma URL gera uma nova
    `URL_VERSION`.
7.  `version_tag` é gerada pelo backend e evolui dentro da URL.
8.  O usuário não escolhe manualmente `v1`, `v2`, `v3`.
9.  `ROUTE_ENVIRONMENT` disponibiliza uma versão específica da URL em um
    ambiente.
10. Uma rota pode possuir várias versões simultaneamente no mesmo
    ambiente.
11. O cadastro idêntico de `ROUTE + ENVIRONMENT + URL_VERSION` é
    duplicidade e retorna `409 Conflict`.
12. A evolução de uma aplicação não altera automaticamente as outras
    aplicações que compartilham a URL.
13. Criar uma nova versão não desativa automaticamente versões
    anteriores.
14. A promoção para outro ambiente reutiliza a `URL_VERSION`; não cria
    uma nova versão contratual.
15. A criação/evolução ocorre inicialmente em DEV e a promoção é tratada
    pelo fluxo responsável por ambientes.

------------------------------------------------------------------------

# 13. Unicidades recomendadas

``` sql
-- URL lógica única dentro da conta
UNIQUE (account_id, base_path)

-- Uma aplicação possui apenas uma casca de rota para a URL
UNIQUE (account_id, application_id, url_id)

-- O mesmo contrato não gera duas versões da mesma URL
UNIQUE (url_id, schema_version_id)

-- A tag não pode se repetir dentro da URL
UNIQUE (url_id, version_tag)

-- A mesma versão não pode ser cadastrada duas vezes
-- para a mesma rota e ambiente
UNIQUE (route_id, environment_id, url_version_id)
```

------------------------------------------------------------------------

# 14. Resultado final da simulação

Ao final dos ciclos:

``` text
ACC-01
│
├── URL-01 /clientes
│   │
│   ├── VER-V1 / SV-1.0.0
│   │   ├── APP-A
│   │   │   ├── DEV  → ativo
│   │   │   └── PROD → ativo
│   │   │
│   │   └── APP-B
│   │       └── DEV  → ativo
│   │
│   └── VER-V2 / SV-2.0.0
│       └── APP-A
│           └── DEV → ativo
```

O modelo permite que `/clientes` seja uma URL única e reutilizável
dentro da conta, enquanto cada aplicação mantém sua própria `ROUTE`. As
versões contratuais são centralizadas em `URL_VERSION`, e
`ROUTE_ENVIRONMENT` controla onde cada versão está efetivamente
disponibilizada.

Isso mantém separados os conceitos de **URL**, **aplicação**,
**contrato/versionamento** e **ambiente**, permitindo reuso sem perder
isolamento e evolução independente.


## Escopo das Entidades por Conta e Ambiente

No modelo consolidado da Feature de Rotas, `URL`, `URL_VERSION` e
`ROUTE` **não são entidades por ambiente**.

O ambiente passa a fazer parte do modelo somente em `ROUTE_ENVIRONMENT`.

Essa separação é importante para evitar a duplicação de URLs, rotas e
versões durante o processo de promoção entre ambientes.

### Responsabilidade por entidade

  ----------------------------------------------------------------------------
  Entidade              Escopo            Por ambiente?     Responsabilidade
  --------------------- ----------------- ----------------- ------------------
  `URL`                 Conta             Não               Representa a
                                                            identidade do
                                                            caminho lógico,
                                                            por exemplo
                                                            `/clientes`

  `URL_VERSION`         URL               Não               Representa uma
                                                            versão contratual
                                                            da URL, como `v1`,
                                                            `v2`, `v3`

  `ROUTE`               Conta + Aplicação Não               Representa o uso
                                                            daquela URL por
                                                            uma aplicação

  `ROUTE_ENVIRONMENT`   Rota + Ambiente   **Sim**           Define quais
                                                            versões da rota
                                                            estão
                                                            disponibilizadas
                                                            em determinado
                                                            ambiente
  ----------------------------------------------------------------------------

### Exemplo conceitual

``` text
ACCOUNT ACC-01
│
├── URL /clientes
│   │
│   ├── URL_VERSION v1 → Schema Version 1
│   └── URL_VERSION v2 → Schema Version 2
│
├── APP-A
│   └── ROUTE /clientes
│       │
│       ├── DEV
│       │   ├── v1 → ativo
│       │   └── v2 → ativo
│       │
│       ├── HML
│       │   └── v1 → ativo
│       │
│       └── PROD
│           └── v1 → ativo
│
└── APP-B
    └── ROUTE /clientes
        │
        └── DEV
            └── v1 → ativo
```

Nesse exemplo, `v2` **não é uma versão específica de DEV**.

`v2` é uma versão da URL `/clientes`. O ambiente apenas determina se
aquela versão está ou não disponibilizada para determinada rota.

Portanto:

``` text
URL_VERSION v2
```

é criada uma única vez e pode posteriormente ser disponibilizada em:

``` text
DEV
HML
PROD
```

sem que uma nova `URL_VERSION` seja criada em cada ambiente.

------------------------------------------------------------------------

### Estrutura das referências

A distribuição das principais chaves estrangeiras fica:

``` text
URL
────────────────────────
account_id


URL_VERSION
────────────────────────
url_id
schema_version_id


ROUTE
────────────────────────
account_id
application_id
url_id


ROUTE_ENVIRONMENT
────────────────────────
route_id
environment_id
url_version_id
schema_data
active
```

A relação pode ser visualizada como:

``` text
ACCOUNT
   │
   ├── URL
   │    │
   │    └── URL_VERSION
   │             │
   │             └── SCHEMA_VERSION
   │
   └── APPLICATION
          │
          └── ROUTE
                 │
                 └── ROUTE_ENVIRONMENT
                        │
                        ├── ENVIRONMENT
                        └── URL_VERSION
```

------------------------------------------------------------------------

### Unicidades recomendadas

#### URL

Uma URL é única dentro da conta:

``` text
UNIQUE(account_id, base_path)
```

#### URL_VERSION

O mesmo contrato não deve gerar duas versões diferentes para a mesma
URL:

``` text
UNIQUE(url_id, schema_version_id)
```

A tag da versão também é única dentro da URL:

``` text
UNIQUE(url_id, version_tag)
```

#### ROUTE

Uma aplicação possui apenas uma rota lógica para determinada URL:

``` text
UNIQUE(account_id, application_id, url_id)
```

#### ROUTE_ENVIRONMENT

Uma mesma versão não pode ser cadastrada duas vezes para a mesma rota e
ambiente:

``` text
UNIQUE(route_id, environment_id, url_version_id)
```

A presença de `url_version_id` nessa constraint permite a convivência:

``` text
ROUTE-A + DEV + v1
ROUTE-A + DEV + v2
```

e impede a duplicidade:

``` text
ROUTE-A + DEV + v1
ROUTE-A + DEV + v1  ← inválido
```

------------------------------------------------------------------------

### Impacto no fluxo de promoção

Essa separação simplifica o processo de promoção.

Considere inicialmente:

``` text
APP-A
└── ROUTE /clientes
    └── DEV
        └── v2
```

Ao promover `v2` para HML, o sistema **não cria**:

-   uma nova `URL`;
-   uma nova `URL_VERSION`;
-   uma nova `ROUTE`.

Ele apenas disponibiliza a versão existente no novo ambiente:

``` text
ROUTE_ENVIRONMENT

route       environment     url_version
────────────────────────────────────────
ROT-AAA     DEV             VER-V2
ROT-AAA     HML             VER-V2
```

Posteriormente, a promoção para PROD segue o mesmo princípio:

``` text
ROUTE_ENVIRONMENT

route       environment     url_version
────────────────────────────────────────
ROT-AAA     DEV             VER-V2
ROT-AAA     HML             VER-V2
ROT-AAA     PROD            VER-V2
```

Portanto, **promover uma rota significa disponibilizar uma `URL_VERSION`
existente em outro ambiente**, e não criar uma nova versão da URL.

------------------------------------------------------------------------

### Regra consolidada

A regra conceitual do modelo pode ser resumida da seguinte forma:

> **URL** identifica o caminho dentro da conta.\
> **URL_VERSION** representa a evolução contratual desse caminho.\
> **ROUTE** representa o uso da URL por uma aplicação.\
> **ROUTE_ENVIRONMENT** determina em quais ambientes e versões essa rota
> está efetivamente disponibilizada.

Dessa forma, somente `ROUTE_ENVIRONMENT` possui dependência direta de
`ENVIRONMENT`.
