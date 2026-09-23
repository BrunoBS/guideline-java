# Resource Reference — Referências Transversais entre Recursos

> **Versão V1 — refinamento consolidado para implementação.**
>
> Este documento define a feature transversal responsável por registrar e consultar referências entre recursos de diferentes domínios da plataforma.
>
> O objetivo é permitir que qualquer desenvolvedor implemente a feature sem precisar redescobrir regras de integridade, escopo ambiental, comportamento de criação/alteração/exclusão, índices, transação ou integração com lifecycle.
>
> **Fora do escopo desta versão:** motor de promoção, scheduler, reconciliação automática/manual e rebuild periódico.

---

## 1. Objetivo

A plataforma possui recursos de domínios diferentes que podem referenciar uns aos outros.

Exemplos:

```text
MENU -> RULE
MENU -> ROUTE
MENU -> MFE
MENU -> SCHEMA
ROUTE -> SCHEMA
CONFIG -> RULE
```

O domínio referenciado não deve precisar conhecer todos os consumidores possíveis.

Exemplo:

```text
Menu conhece que usa uma Rule.
Rule não deve conhecer Menu.
```

A feature **Resource Reference** mantém um índice transversal das referências atuais para responder principalmente:

1. Este recurso está sendo utilizado?
2. Quem utiliza este recurso?
3. Em qual ambiente ele está sendo utilizado?
4. Em qual contexto/campo do recurso consumidor a referência existe?

A feature deve impedir que um recurso ambiental seja removido enquanto outro domínio ainda o utiliza naquele mesmo ambiente.

---

## 2. Princípio de arquitetura

A feature é uma capacidade transversal da plataforma.

Ela não pertence funcionalmente ao domínio Workspace, Menu, Rule, Route, MFE ou Schema.

A implementação reutilizável deve ficar em módulo próprio da `platform-libraries`.

Estrutura conceitual:

```text
platform-libraries
└── platform-resource-reference
    ├── contracts
    ├── model
    ├── service
    ├── repository
    └── migrations
```

A persistência deve ficar em schema próprio e com responsabilidade explícita:

```text
platform_reference.resource_reference
```

O schema `platform_reference` não é um schema genérico para tabelas sem domínio.

Regra:

> Somente estruturas cuja responsabilidade seja manter referências transversais entre recursos de domínios diferentes podem pertencer a este schema.

Nesta V1 existe apenas a tabela `resource_reference`.

---

## 3. Implantação física

A V1 considera que os serviços participantes e a tabela transversal utilizam o **mesmo banco MySQL**, embora possam estar em schemas diferentes.

Exemplo:

```text
MySQL
├── workspace.*
├── navigation.*
├── rules.*
└── platform_reference.*
    └── resource_reference
```

A separação de schema é arquitetural.

A principal consequência de manter a persistência no mesmo banco é permitir que a alteração do recurso e a atualização de suas referências participem da **mesma transação local**.

---

## 4. Conceitos

### 4.1. Resource / Source

É o recurso que possui a referência.

Exemplo:

```text
MENU-01 -> RULE-01
```

`MENU-01` é o resource/source.

### 4.2. Referenced Resource / Target

É o recurso utilizado pelo source.

No exemplo:

```text
MENU-01 -> RULE-01
```

`RULE-01` é o referenced resource/target.

### 4.3. Reference Context

Indica **onde ou com qual finalidade** o recurso é utilizado pelo source.

Exemplos do domínio Menu:

```text
EXHIBITION
ROUTING
PRIMARY_TARGET
SECONDARY_TARGET
SCHEMA
```

Exemplo:

```text
MENU-01 -> RULE-01 -> EXHIBITION
MENU-01 -> RULE-02 -> ROUTING
```

O contexto descreve o uso da referência dentro do recurso consumidor. Ele não altera o tipo do recurso referenciado.

### 4.4. Environment

Toda referência da V1 é ambiental.

`environment_id` é **obrigatório**.

Não existe referência global sem ambiente nesta versão.

---

## 5. Modelo de dados

### 5.1. Tabela `resource_reference`

Estrutura de referência:

```text
platform_reference.resource_reference
────────────────────────────────────────
id
account_id

resource_type
resource_identifier
resource_name

referenced_type
referenced_identifier

reference_context
environment_id

created_at
```

### 5.2. Definição dos campos

| Campo | Regra |
|---|---|
| `id` | PK técnica, numérica e autoincremento. |
| `account_id` | Contexto obrigatório da Account. |
| `resource_type` | Tipo do recurso que possui a referência, por exemplo `MENU`, `ROUTE`, `CONFIG`. |
| `resource_identifier` | Identifier público do recurso que possui a referência. |
| `resource_name` | Nome/label de apresentação do resource no momento do último replace. |
| `referenced_type` | Tipo do recurso referenciado, por exemplo `RULE`, `ROUTE`, `MFE`, `SCHEMA`. |
| `referenced_identifier` | Identifier público do recurso referenciado. |
| `reference_context` | Contexto/campo lógico no qual a referência é utilizada. |
| `environment_id` | Ambiente obrigatório em que a relação é válida. |
| `created_at` | Data/hora de criação da relação atual. |

### 5.3. Tipos sugeridos

Exemplo físico inicial:

```sql
CREATE TABLE platform_reference.resource_reference (
    id BIGINT NOT NULL AUTO_INCREMENT,
    account_id BIGINT NOT NULL,

    resource_type VARCHAR(50) NOT NULL,
    resource_identifier VARCHAR(36) NOT NULL,
    resource_name VARCHAR(255) NOT NULL,

    referenced_type VARCHAR(50) NOT NULL,
    referenced_identifier VARCHAR(36) NOT NULL,

    reference_context VARCHAR(50) NOT NULL,
    environment_id BIGINT NOT NULL,

    created_at DATETIME(6) NOT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uk_resource_reference UNIQUE (
        account_id,
        resource_type,
        resource_identifier,
        referenced_type,
        referenced_identifier,
        reference_context,
        environment_id
    ),

    INDEX idx_resource_reference_source (
        account_id,
        resource_type,
        resource_identifier
    ),

    INDEX idx_resource_reference_target (
        account_id,
        referenced_type,
        referenced_identifier,
        environment_id
    )
);
```

O DDL definitivo deve seguir as convenções de naming, timestamp e charset da Golden Reference.

---

## 6. Índices

A V1 deve possuir somente os índices necessários aos acessos já definidos.

### 6.1. Source

```text
(account_id, resource_type, resource_identifier)
```

Usado para:

- buscar todas as referências de um recurso;
- remover todas as referências atuais antes de recriá-las;
- limpar referências quando o source for removido.

### 6.2. Target

```text
(account_id, referenced_type, referenced_identifier, environment_id)
```

Usado para:

- verificar se um recurso ambiental está em uso;
- bloquear exclusão;
- listar os consumidores de um recurso em determinado ambiente.

### 6.3. Unique

A relação não pode ser persistida duas vezes para o mesmo contexto:

```text
account
+ source type
+ source identifier
+ target type
+ target identifier
+ reference context
+ environment
```

Como `environment_id` é obrigatório, a V1 não depende de comportamento de `NULL` em unique constraints.

---

## 7. Regra fundamental: a tabela é um índice transversal

A verdade funcional continua pertencendo ao domínio originador.

Exemplo:

```text
Menu
= verdade sobre as referências configuradas no Menu

resource_reference
= índice transversal materializado das referências atuais
```

A feature não deve implementar regra funcional específica de Menu, Rule, Route, MFE ou qualquer outro domínio.

Cada domínio sabe quais referências possui.

A library sabe registrar, substituir, remover e consultar essas referências.

---

## 8. Operações da library

Contrato conceitual mínimo:

```text
replaceReferences(...)
removeReferences(...)
existsReferencesTo(...)
findReferencesTo(...)
removeByAccount(...)
```

Os nomes definitivos podem seguir as convenções Java da plataforma, preservando as responsabilidades abaixo.

### 8.1. `replaceReferences`

Substitui integralmente as referências de um source em determinado escopo.

A operação deve executar conceitualmente:

```text
DELETE referências atuais do source
INSERT snapshot atual informado pelo domínio
```

A API principal não deve obrigar o consumidor a calcular manualmente diferenças entre:

- referências adicionadas;
- referências removidas;
- referências alteradas.

O consumidor entrega o estado atual.

### 8.2. `removeReferences`

Remove todas as referências de saída pertencentes ao source.

Uso principal:

- delete/purge do source;
- remoção de uma configuração ambiental.

### 8.3. `existsReferencesTo`

Responde se existe pelo menos uma referência de entrada para determinado target no ambiente informado.

Uso principal:

- validação de exclusão.

### 8.4. `findReferencesTo`

Lista quem referencia determinado target.

Uso:

- mensagem de bloqueio;
- API administrativa/owner;
- diagnóstico operacional.

### 8.5. `removeByAccount`

Remove todas as referências pertencentes a uma Account.

Uso:

- purge físico da Account.

A operação deve ser idempotente.

---

## 9. Fluxo de CREATE

Ao criar ou configurar um recurso que possua referências:

```text
BEGIN

cria recurso
registra suas referências atuais

COMMIT
```

Exemplo:

```text
Menu Clientes / DEV
    -> RULE-01 / DEV
```

Resultado:

```text
resource_type          = MENU
resource_identifier    = MENU-01
resource_name          = Clientes
referenced_type        = RULE
referenced_identifier  = RULE-01
reference_context      = EXHIBITION
environment_id         = DEV
```

---

## 10. Fluxo de UPDATE

Toda atualização de um recurso que possa alterar suas referências deve executar `replaceReferences`.

Exemplo inicial:

```text
MENU-01 / Clientes / DEV
    -> RULE-01 / EXHIBITION
    -> ROUTE-10 / PRIMARY_TARGET
```

Após atualização:

```text
MENU-01 / Clientes Corporativos / DEV
    -> RULE-02 / EXHIBITION
    -> ROUTE-10 / PRIMARY_TARGET
```

A operação deve executar:

```text
BEGIN

UPDATE recurso

DELETE referências atuais do source/ambiente

INSERT referências do novo estado
- MENU-01 -> RULE-02
- MENU-01 -> ROUTE-10
- resource_name = Clientes Corporativos

COMMIT
```

O `resource_name` não possui sincronização própria.

Ele é atualizado naturalmente porque faz parte do novo snapshot gravado pelo `replaceReferences`.

---

## 11. Transação obrigatória

Quando a alteração do domínio e a tabela `resource_reference` estão no mesmo banco, devem participar da **mesma transação**.

Exemplo:

```text
UPDATE Menu                 OK
DELETE referências antigas OK
INSERT novas referências   FALHOU
                            ↓
ROLLBACK DE TUDO
```

Não é válido persistir o recurso e atualizar a referência em uma transação independente.

Requisito técnico:

```text
mesmo DataSource
mesmo TransactionManager
mesma transaction
```

A library não deve iniciar uma transação independente que permita commit parcial.

---

## 12. Exclusão: source x target

Existem duas situações diferentes.

### 12.1. Excluir o source

Exemplo:

```text
MENU-01 -> RULE-01
```

Ao remover `MENU-01`, suas referências de saída devem ser eliminadas.

```text
DELETE MENU-01
    ↓
removeReferences(MENU, MENU-01, environment)
```

A relação deixa de existir porque o resource que a possuía foi removido.

### 12.2. Excluir o target

Ao tentar remover `RULE-01`, a plataforma deve consultar referências de entrada.

```text
existsReferencesTo(
    account,
    RULE,
    RULE-01,
    environment
)
```

Se existir referência:

```text
DELETE BLOQUEADO
```

Se não existir:

```text
o domínio pode seguir seu fluxo normal de lifecycle/exclusão
```

Regra:

> O source pode remover suas próprias relações. O target não pode ser removido enquanto existirem relações apontando para ele no mesmo ambiente.

---

## 13. Referências ambientais

A referência deve representar o recurso **no ambiente em que é consumido**.

Exemplo:

```text
RULE-01
├── DEV
├── HML
└── PRD
```

Possíveis referências:

```text
MENU-01 / DEV -> RULE-01 / DEV
MENU-01 / PRD -> RULE-01 / PRD
```

Neste caso:

- `RULE-01 / DEV` está protegida;
- `RULE-01 / PRD` está protegida;
- `RULE-01 / HML` pode ser removida se não houver outra referência naquele ambiente.

Não é permitido utilizar uma configuração ambiental de outro ambiente.

Exemplo inválido:

```text
MENU / HML -> RULE / DEV
```

Exemplo válido:

```text
MENU / HML -> RULE / HML
```

---

## 14. Rule x RuleEnvironment

A identidade lógica da Rule pode ser única por Application, enquanto sua configuração operacional existe por ambiente.

Conceitualmente:

```text
RULE-01
├── RULE_ENVIRONMENT / DEV
├── RULE_ENVIRONMENT / HML
└── RULE_ENVIRONMENT / PRD
```

Uma referência ambiental do Menu deve apontar funcionalmente para a Rule no mesmo ambiente.

A tabela transversal não precisa armazenar o identificador técnico interno de `RULE_ENVIRONMENT`.

Ela registra:

```text
referenced_type       = RULE
referenced_identifier = RULE-01
environment_id        = DEV
```

Assim:

- a identidade transversal continua sendo `RULE-01`;
- o `environment_id` determina a configuração operacional protegida.

### 14.1. Exclusão de RuleEnvironment

Para remover somente `RULE-01 / HML`:

```text
target = RULE-01
environment = HML
```

Se não houver referência em HML, a configuração ambiental pode seguir o lifecycle de remoção.

Uma referência existente em DEV não bloqueia, por si só, a remoção de HML.

### 14.2. Exclusão da Rule lógica

A Rule raiz não deve ser fisicamente removida enquanto ainda possuir configurações ambientais ou enquanto seu fluxo de lifecycle ainda não tiver eliminado essas configurações.

A proteção de referência atua sobre cada existência ambiental.

---

## 15. Integração com Lifecycle

Resource Reference e Lifecycle possuem responsabilidades diferentes.

```text
Resource Reference
= este recurso está sendo utilizado?

Lifecycle
= qual é o estado e como o recurso é inativado/removido?
```

Antes de permitir uma transição de exclusão de uma configuração ambiental, o domínio deve consultar a Resource Reference.

Exemplo:

```text
RULE-01 / DEV
    ↓
solicitação de exclusão
    ↓
existsReferencesTo(RULE-01, DEV)?
    ├── SIM -> bloqueia
    └── NÃO -> lifecycle pode prosseguir
```

A Resource Reference não altera lifecycle diretamente.

---

## 16. Purge de Account

As referências possuem `account_id` obrigatório.

Enquanto a Account estiver apenas `INACTIVE` ou `PENDING_DELETION`, suas referências devem ser preservadas.

Somente no purge físico da Account:

```text
ACCOUNT -> PURGE
      ↓
remove dados dos domínios
      ↓
removeByAccount(account)
```

A limpeza deve ser idempotente:

```text
0 linhas removidas  -> sucesso
N linhas removidas  -> sucesso
```

A V1 não depende de `ON DELETE CASCADE` para esta regra.

O purge é explícito e controlado pelo fluxo de lifecycle.

---

## 17. Integridade entre contas

Uma relação não pode cruzar Accounts indevidamente.

Regra base:

```text
source.account == reference.account
target.account == reference.account
```

Quando um domínio suporta explicitamente algum tipo de consumo compartilhado entre Accounts, essa regra deve ser tratada pelo domínio responsável e refinada antes de utilizar esta estrutura.

A V1 assume referência interna ao contexto da mesma Account.

---

## 18. Foreign Keys

A tabela é transversal e pode apontar para recursos de diferentes domínios.

Por isso, a V1 **não cria foreign keys físicas para os recursos heterogêneos** representados por:

```text
resource_identifier
referenced_identifier
```

A integridade desses identificadores é responsabilidade das operações do domínio e dos contratos da library.

Também não se deve utilizar FK como substituição da validação de exclusão por referência.

---

## 19. Auditoria

A feature deve integrar-se ao mecanismo geral de auditoria da plataforma quando a operação de negócio auditada exigir registro.

Não será criada uma tabela própria de histórico de referências.

`resource_reference` representa somente o estado atual.

A auditoria é responsável por histórico/eventos; Resource Reference é responsável por integridade transversal.

---

## 20. Mensagens de bloqueio

Quando uma exclusão for impedida, a API deve conseguir informar pelo menos:

- tipo do recurso consumidor;
- identifier do consumidor;
- nome do consumidor;
- contexto da referência;
- ambiente.

Exemplo:

```text
RULE-01 não pode ser removida do ambiente DEV.

Referenciada por:
Tipo: MENU
Identifier: MENU-01
Nome: Clientes
Contexto: EXHIBITION
Ambiente: DEV
```

A mensagem final deve utilizar o catálogo de mensagens/padrão de erro da plataforma.

---

## 21. Cenários de negócio

### 21.1. Criar associação

```text
Menu Clientes / DEV
    -> Rule 01 / DEV
```

Resultado:

```text
referência criada
```

### 21.2. Renomear Menu

Antes:

```text
MENU-01 | Clientes | RULE-01 | DEV
```

Depois:

```text
MENU-01 | Clientes Corporativos | RULE-01 | DEV
```

O update do Menu executa `replaceReferences` e o nome é atualizado no mesmo fluxo.

### 21.3. Trocar Rule

Antes:

```text
MENU-01 / DEV -> RULE-01 / DEV
```

Depois:

```text
MENU-01 / DEV -> RULE-02 / DEV
```

O replace remove o estado anterior e grava o novo.

### 21.4. Remover Menu

```text
DELETE/PURGE MENU-01 / DEV
    ↓
remove referências de saída
```

Não existe bloqueio causado pelas próprias referências que o Menu possui.

### 21.5. Remover Rule em uso

```text
MENU-01 / DEV -> RULE-01 / DEV
```

Tentativa:

```text
remover RULE-01 / DEV
```

Resultado:

```text
bloqueado
```

### 21.6. Remover Rule em ambiente não utilizado

```text
MENU-01 / DEV -> RULE-01 / DEV
MENU-01 / PRD -> RULE-01 / PRD
```

Tentativa:

```text
remover RULE-01 / HML
```

Resultado:

```text
permitido, desde que nenhuma outra referência exista em HML
```

---

## 22. Concorrência

A validação de existência de referência deve ocorrer dentro do fluxo transacional de exclusão.

O domínio não deve assumir que uma consulta realizada muito antes da operação continua válida.

A implementação deve respeitar as estratégias de lock/concorrência adotadas pela Golden Reference para impedir condições de corrida relevantes entre:

```text
criar referência
x
remover target
```

A V1 não define mecanismo distribuído de lock.

Como os dados estão no mesmo banco, a implementação deve priorizar consistência transacional local.

---

## 23. Migrations

As migrations da feature pertencem ao módulo/capacidade `platform-resource-reference`.

Elas devem:

- criar o schema `platform_reference` quando aplicável à estratégia da plataforma;
- criar `resource_reference`;
- criar PK, unique e índices definidos;
- seguir convenções da Golden Reference;
- ser versionadas;
- não depender de criação manual da tabela.

O fato de a tabela compartilhar a mesma instância MySQL com Workspace ou outros domínios não transfere ownership funcional para esses domínios.

---

## 24. Observabilidade

A V1 deve permitir observabilidade das operações principais:

```text
replaceReferences
removeReferences
existsReferencesTo
findReferencesTo
removeByAccount
```

Não registrar payloads excessivos ou dados funcionais desnecessários.

Falhas de atualização de referência dentro de uma transação devem provocar rollback da operação de negócio.

---

## 25. Fora do escopo da V1

Explicitamente fora do escopo:

- scheduler de reconciliação;
- reconciliação automática;
- reconciliação manual por Account;
- rebuild completo da tabela;
- comparação periódica entre domínios e referências;
- eventos/Kafka/outbox para manutenção da tabela;
- banco dedicado;
- microserviço dedicado;
- motor de promoção;
- pacote de promoção;
- pacote de exclusão;
- lógica DEV -> HML -> PRD;
- métricas de divergência;
- autocorreção de registros;
- customização da estrutura da tabela por Account/usuário.

Esses itens podem ser refinados em evolução futura sem alterar a responsabilidade central desta feature.

---

## 26. Critérios de aceite

- [ ] Existe módulo dedicado `platform-resource-reference` na `platform-libraries`.
- [ ] Existe schema dedicado `platform_reference`.
- [ ] Existe tabela `resource_reference`.
- [ ] `environment_id` é obrigatório.
- [ ] Identifiers transversais utilizam o identifier público dos recursos.
- [ ] `resource_name` é atualizado pelo snapshot de replace.
- [ ] Existe unique da relação.
- [ ] Existe índice de source.
- [ ] Existe índice de target + environment.
- [ ] Create registra as referências atuais.
- [ ] Update substitui integralmente as referências atuais do source.
- [ ] Delete/purge do source remove suas referências de saída.
- [ ] Delete de target consulta referências de entrada.
- [ ] Target referenciado no mesmo ambiente não pode ser removido.
- [ ] Referência em DEV não bloqueia automaticamente remoção em HML.
- [ ] Alteração do domínio e replace de referências participam da mesma transação.
- [ ] Falha no replace provoca rollback da operação funcional.
- [ ] Purge da Account remove suas referências.
- [ ] Não existe scheduler/reconciliação na V1.
- [ ] Não existe histórico próprio na tabela.
- [ ] Integração de auditoria utiliza o mecanismo central da plataforma.
- [ ] Mensagem de bloqueio consegue identificar quem está utilizando o recurso.

---

## 27. Testes mínimos

### 27.1. Persistência

- criar uma referência;
- impedir duplicidade pela unique;
- buscar por source;
- buscar por target + environment;
- remover por source;
- remover por Account.

### 27.2. Replace

- substituir uma referência por outra;
- remover referência que deixou de existir;
- adicionar nova referência;
- atualizar `resource_name`;
- executar novamente o mesmo snapshot e manter o mesmo estado lógico.

### 27.3. Transação

- falha no insert de referência deve fazer rollback do recurso;
- falha na alteração do recurso não deve modificar referências;
- delete + insert do replace não pode gerar commit parcial.

### 27.4. Exclusão

- bloquear target em uso no mesmo ambiente;
- permitir target sem referência;
- não considerar referência de outro ambiente como bloqueio da configuração ambiental atual;
- remover referências de saída quando source for removido.

### 27.5. Account

- manter referências durante `INACTIVE`;
- manter referências durante `PENDING_DELETION`;
- remover referências somente no purge;
- `removeByAccount` deve ser idempotente.

---

## 28. Resumo das decisões

1. Resource Reference é uma capacidade transversal.
2. A implementação reutilizável fica em módulo próprio da `platform-libraries`.
3. A persistência fica no schema `platform_reference`.
4. O schema não é um depósito genérico de tabelas.
5. A V1 possui uma única tabela: `resource_reference`.
6. Toda referência é contextualizada por Account.
7. Toda referência é obrigatoriamente contextualizada por Environment.
8. Source representa quem usa.
9. Target representa quem é utilizado.
10. `reference_context` representa em qual campo/finalidade a referência é usada.
11. `resource_name` é um snapshot de apresentação e é atualizado no replace.
12. Create registra o estado atual das referências.
13. Update executa replace completo: delete + insert.
14. Delete do source remove suas referências de saída.
15. Delete do target é bloqueado se houver referência de entrada no mesmo ambiente.
16. O domínio originador continua sendo a fonte da verdade.
17. A tabela é um índice transversal/materialização de referências.
18. Alteração do recurso e atualização das referências usam a mesma transação local.
19. Não existem FKs físicas para os recursos heterogêneos.
20. Purge da Account remove suas referências de forma explícita e idempotente.
21. Resource Reference não substitui Lifecycle.
22. Lifecycle consulta Resource Reference antes de exclusões ambientais.
23. Auditoria continua sendo responsabilidade da capacidade central de auditoria.
24. Scheduler e reconciliação ficam fora da V1.
25. Motor de promoção fica totalmente fora deste refinamento.
