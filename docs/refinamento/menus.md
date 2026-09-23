# Feature de Menu

## 1. Visão geral

A feature de Menu representa a navegação de uma Account.

O Menu pertence à Account e seus itens podem apontar para Routes de qualquer Application pertencente à mesma Account.

A estrutura lógica do Menu é independente da Route. A Route é um recurso de navegação reutilizável e pode posteriormente ser consumida por outras configurações além do Menu.

A configuração do Menu é separada em:

- identidade do Menu;
- identidade do Menu Item;
- configuração do Menu Item por Environment;
- Target do Menu Item por Environment;
- Schema e `schema_data`;
- árvore recursiva por Environment;
- promoção entre Environments.

---

# 2. Estrutura geral

```text
ACCOUNT
│
├── APPLICATION
│    │
│    └── ROUTE
│
└── MENU
     │
     ├── SCHEMA
     │
     └── MENU_ITEM
           │
           └── MENU_ITEM_ENVIRONMENT
                  │
                  └── MENU_ITEM_TARGET
                         │
                         ├── ROUTE
                         ├── MFE
                         └── ROUTING_RULE
3. Tabela menu

Representa o Menu da Account.

menu
────────────────────────
id
account_id
name
schema_id
created_at
updated_at
Responsabilidades
Identificar o Menu.
Definir a Account proprietária.
Definir o Schema utilizado pelo Menu.
Permitir múltiplos Menus por Account.
Relacionamentos
menu.account_id
    ↓
account.id

menu.schema_id
    ↓
schema.id

O Menu não é vinculado diretamente a uma Application.

Isso permite que um único Menu utilize Routes de diferentes Applications da mesma Account.

4. Tabela menu_item

Representa a identidade de um nó do Menu.

menu_item
────────────────────────
id
menu_id
created_at
updated_at
Relacionamento
menu_item.menu_id
    ↓
menu.id

O menu_item representa a identidade do item.

A configuração que pode mudar entre Environments fica em menu_item_environment.

A hierarquia também é definida no contexto do Environment.

5. Tabela menu_item_environment

Representa a configuração de um Menu Item em determinado Environment.

menu_item_environment
────────────────────────────
id
menu_item_id
environment_id
parent_id
name
sort_order
active
schema_data
created_at
updated_at
Responsabilidades
Definir o nome do item naquele Environment.
Definir se o item está ativo.
Definir a posição do item.
Definir o pai do item.
Permitir árvores diferentes por Environment.
Armazenar os metadados específicos do item.
Permitir evolução independente entre DEV, HML e PROD.
Relacionamentos
menu_item_environment.menu_item_id
    ↓
menu_item.id

menu_item_environment.environment_id
    ↓
environment.id

menu_item_environment.parent_id
    ↓
menu_item_environment.id
6. Árvore recursiva

A árvore do Menu é definida através do parent_id de menu_item_environment.

Um item raiz possui:

parent_id = NULL

Um filho possui:

parent_id = ID do item pai

Exemplo:

Clientes
│
├── Listar
├── Cadastrar
└── Relatórios
    │
    ├── Mensal
    └── Anual

Representação:

id    parent_id    name
────────────────────────────
1     NULL         Clientes
2     1            Listar
3     1            Cadastrar
4     1            Relatórios
5     4            Mensal
6     4            Anual

A profundidade da árvore não é limitada pelo modelo.

No MySQL 8, a árvore pode ser carregada utilizando WITH RECURSIVE.

7. Integridade da árvore

O parent_id deve apontar para um registro do mesmo Environment.

Conceitualmente:

child.environment_id
=
parent.environment_id

Não deve ser possível criar:

DEV
└── Item A
     └── parent → Item B de PROD

A relação pai/filho deve permanecer dentro do mesmo Environment.

8. Tabela menu_item_target

Representa o destino de navegação de um Menu Item.

O Target pertence ao menu_item_environment, pois o destino pode mudar entre Environments.

menu_item_target
────────────────────────────
id
menu_item_environment_id
target_type
target_role
route_id
mfe_id
routing_rule_id
created_at
updated_at
Relacionamento
menu_item_target.menu_item_environment_id
    ↓
menu_item_environment.id
9. target_type

Define o tipo do destino.

Exemplos:

ROUTE
MFE

Possíveis extensões futuras:

EXTERNAL_URL
ACTION
...

A referência utilizada depende do target_type.

Route
target_type = ROUTE
route_id = ...
mfe_id = NULL
MFE
target_type = MFE
mfe_id = ...
route_id = NULL
Routing Rule
routing_rule_id = ...
10. target_role

Representa o papel que o Target exerce dentro da navegação.

Exemplo conceitual:

PRIMARY
SECONDARY

A definição final dos valores deve ser feita como regra de domínio.

11. Relação Menu → Route

Um Menu Item pode apontar para uma Route de qualquer Application da mesma Account.

Exemplo:

ACCOUNT 10
│
├── APPLICATION Portal
│   ├── ROUTE Dashboard
│   └── ROUTE Clientes
│
├── APPLICATION Financeiro
│   ├── ROUTE Faturas
│   └── ROUTE Pagamentos
│
└── MENU Principal
    ├── Dashboard  → Portal / Dashboard
    ├── Clientes   → Portal / Clientes
    ├── Faturas    → Financeiro / Faturas
    └── Pagamentos → Financeiro / Pagamentos

Regra:

menu.account_id = route.account_id

O Menu não precisa armazenar application_id.

A Application já é determinada através da própria Route.

12. Route é independente do Menu

A Route não depende do Menu.

A dependência é unilateral:

MENU_ITEM
    │
    └── TARGET
          │
          └── ROUTE

E não:

ROUTE
   ↓
MENU

Isso permite que a Route seja posteriormente consumida por outras configurações:

ROUTE
 │
 ├── MENU_ITEM
 ├── SHORTCUT
 ├── OUTRA_CONFIGURAÇÃO
 └── ...
13. Schema do Menu

O Menu possui um Schema:

menu.schema_id
    ↓
schema.id

Para a feature de Menu:

scope = ACCOUNT
type = MENU

O Schema define o contrato dos metadados dos Menu Items.

14. schema_data

Os metadados específicos do Menu Item ficam em:

menu_item_environment.schema_data

Exemplo:

{
  "icon": "users",
  "badge": "Novo",
  "permission": "CUSTOMER_READ",
  "openInNewTab": false
}

O conteúdo de schema_data deve ser validado pelo Schema definido pelo Menu.

Conceitualmente:

MENU
 │
 └── schema_id
       │
       ▼
     SCHEMA
       │
       │ define contrato
       ▼
MENU_ITEM_ENVIRONMENT
       │
       └── schema_data
15. Exemplo completo
Menu
Menu Principal
Schema: menu-v1
Árvore
Dashboard

Clientes
├── Listar
├── Cadastrar
└── Relatórios
    ├── Mensal
    └── Anual

Financeiro
├── Faturas
└── Pagamentos
Targets
Dashboard
└── Route /dashboard

Clientes
└── sem target

Listar
└── Route /clientes

Cadastrar
└── Route /clientes/novo

Relatórios
└── sem target

Mensal
└── Route /clientes/relatorios/mensal

Anual
└── Route /clientes/relatorios/anual

Financeiro
└── sem target

Faturas
└── Route /faturas

Pagamentos
└── Route /pagamentos
16. Configuração por Environment

O mesmo Menu pode possuir árvores diferentes.

DEV
Dashboard

Clientes
├── Listar
├── Cadastrar
├── Relatórios
│   ├── Mensal
│   └── Anual
└── Experimental

Financeiro
├── Faturas
└── Pagamentos
HML
Dashboard

Clientes
├── Listar
├── Cadastrar
└── Relatórios

Financeiro
├── Faturas
└── Pagamentos
PROD
Dashboard

Clientes
└── Listar

Financeiro
└── Faturas

A entidade menu continua sendo a mesma.

A configuração de cada Environment é representada por menu_item_environment.

17. Evolução de nome

Exemplo:

DEV:

Cliente

Depois de uma alteração:

Clientes

HML e PROD continuam:

Cliente

até que a alteração seja promovida.

Isso ocorre porque o name pertence a:

menu_item_environment

e não a:

menu_item
18. Evolução da árvore

DEV:

Clientes
├── Listar
└── Relatórios

Nova versão:

Clientes
├── Listar
└── Relatórios
    └── Exportar

A alteração ocorre através do parent_id de menu_item_environment.

HML e PROD permanecem com a estrutura anterior até a promoção.

19. Evolução do Target

O Target também pode ser diferente por Environment.

Exemplo:

DEV
Clientes
└── Route V2

Enquanto:

PROD
Clientes
└── Route V1

Isso é possível porque:

menu_item_target
    ↓
menu_item_environment

e não diretamente:

menu_item
20. Promoção

O Menu suporta promoção entre Environments.

DEV
 │
 │ PROMOTE
 ▼
HML
 │
 │ PROMOTE
 ▼
PROD

Podem ser promovidas:

alterações de nome;
alterações de schema_data;
alterações de active;
alterações de sort_order;
alterações de parent_id;
inclusão de novos itens;
remoção/desativação de itens;
alterações de Target;
alterações de Route utilizada pelo item.

Exemplo:

DEV
Cliente
   │
   │ promoção
   ▼
HML
Cliente
   │
   │ promoção
   ▼
PROD
Cliente

Depois:

DEV
Clientes

HML e PROD permanecem:

Cliente

até a promoção.

21. Modelo relacional
ACCOUNT
   │
   ├───────────────────────────────┐
   │                               │
   ▼                               ▼
APPLICATION                      MENU
   │                               │
   ▼                               │
ROUTE                              │
   ▲                               ▼
   │                         MENU_ITEM
   │                               │
   │                               ▼
   │                     MENU_ITEM_ENVIRONMENT
   │                               │
   │                               ├── environment_id
   │                               │
   │                               ├── parent_id
   │                               │
   │                               └── schema_data
   │                               │
   │                               ▼
   │                       MENU_ITEM_TARGET
   │                               │
   └───────────────────────────────┤
                                   │
                                   ├── route_id
                                   ├── mfe_id
                                   └── routing_rule_id
22. Estrutura final das tabelas
menu
id
account_id
name
schema_id
created_at
updated_at
menu_item
id
menu_id
created_at
updated_at
menu_item_environment
id
menu_item_id
environment_id
parent_id
name
sort_order
active
schema_data
created_at
updated_at
menu_item_target
id
menu_item_environment_id
target_type
target_role
route_id
mfe_id
routing_rule_id
created_at
updated_at
23. Princípios do modelo
Menu pertence à Account.
Uma Account pode possuir vários Menus.
Menu não pertence diretamente a uma Application.
Um Menu Item pode apontar para uma Route de qualquer Application da mesma Account.
Route é independente de Menu.
Menu Item possui identidade própria.
Configuração do Menu Item pertence ao Environment.
A árvore é definida por parent_id no contexto do Environment.
Cada Environment pode possuir uma árvore diferente.
Nome pode variar por Environment.
Ordem pode variar por Environment.
Ativação pode variar por Environment.
schema_data pode variar por Environment.
Target pode variar por Environment.
O Schema do Menu é scope = ACCOUNT e type = MENU.
O Schema define o contrato de schema_data.
Target pode apontar para Route, MFE ou Routing Rule.
Route não conhece Menu.
Alterações em DEV não alteram HML/PROD antes da promoção.
A estrutura permite evolução independente dos Environments.
A árvore pode ser carregada no MySQL utilizando WITH RECURSIVE.
O modelo permite que futuras configurações também consumam Routes sem depender da feature de Menu.