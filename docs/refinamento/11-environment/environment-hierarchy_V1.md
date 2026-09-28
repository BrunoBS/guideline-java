# Refinamento — Evolução da Feature Environment para Topologia Hierárquica

> Baseline técnica analisada: `BrunoBS/account-service`, branch `main`.

## 1. Objetivo

Evoluir a feature `core/environment` do `account-service` para suportar topologias hierárquicas por workspace, mantendo o conceito único de `Environment` e preservando o comportamento atual para workspaces sem segmentação.

O modelo deve suportar inicialmente ambientes `DEFAULT`, `SHARD` e `CELL`, sem criar features, controllers ou fluxos de publicação específicos para shard/cell.

## 2. Baseline atual

A implementação atual já fornece uma base adequada para evolução incremental: domínio `Environment`, `EnvironmentRepository`, inputs/outputs, `EnvironmentCommandService`, `EnvironmentQueryService`, `EnvironmentFinder`, `EnvironmentNormalizer`, validação centralizada em `EnvironmentValidator`, controllers para default/workspace, catálogo `foundation/catalog/environmenttype`, migration de environments e `EnvironmentApiIT`.

A evolução deve ampliar a feature existente, não substituí-la.

## 3. AS-IS

A estrutura atual é essencialmente plana:

```text
Workspace
├── DEV
├── HML
└── PRD
```

O catálogo `EnvironmentType` já existe no Foundation. Não existe ainda conceito explícito de árvore, descendentes/folhas ou regras de integridade hierárquica.

## 4. TO-BE

`Environment` continuará sendo a única entidade de ambiente:

```text
Workspace
├── DEV
│   └── SHARD A
├── HML
│   ├── SHARD A
│   └── SHARD B
└── PRD
    ├── SHARD A
    ├── SHARD B
    └── SHARD C
        └── CELL 01
```

`SHARD` e `CELL` não são novas features. São tipos de `Environment` organizados por relacionamento pai/filho.

## 5. Modelagem

Direção conceitual:

```text
Environment
├── identifier
├── workspaceIdentifier
├── environmentType
├── parentIdentifier   // nullable
├── name
├── order
└── lifecycle/active
```

`parentIdentifier` é `null` para raízes e preenchido para ambientes subordinados.

Não criar `ShardEnvironment`, `CellEnvironment`, `ShardController` ou `CellController`.

## 6. EnvironmentType

Reaproveitar o catálogo existente.

Tipos iniciais:

```text
DEFAULT
SHARD
CELL
```

Compatibilidade inicial:

```text
DEFAULT → SHARD
SHARD   → CELL
```

A necessidade de persistir `parentType` no catálogo deve ser validada. A regra pode permanecer inicialmente na feature se não houver necessidade real de parametrização dinâmica. A arquitetura deve continuar extensível a tipos futuros sem alterar o fluxo principal.

## 7. Defaults e customizados

Os ambientes default continuam disponibilizados automaticamente conforme o comportamento atual. Workspaces sem customização continuam funcionando normalmente.

Ambientes customizados expandem a árvore e pertencem ao contexto do workspace. Pai e filho devem pertencer à mesma topologia acessível. Um customizado não pode usar como pai um ambiente customizado de outro workspace.

## 8. Validação

Evoluir o `EnvironmentValidator`, evitando criar uma segunda camada paralela.

Validar:

- pai existe;
- self-parent é proibido;
- pai pertence à topologia válida;
- tipo filho/pai é compatível;
- ciclos são proibidos;
- nó não pode ser movido para descendente;
- nome é único entre irmãos;
- alteração de tipo com filhos;
- exclusão com filhos;
- inativação considerando descendentes;
- regras atuais de default/workspace permanecem válidas.

Constraint lógica:

```text
UNIQUE(workspace, parent, normalized_name)
```

## 9. Repository e consultas

Ampliar `EnvironmentRepository`, não substituir:

```text
findChildren(parentIdentifier)
hasChildren(identifier)
findByWorkspaceAndParent(...)
existsSiblingByName(...)
```

`EnvironmentQueryService` pode evoluir com:

```text
findChildren(environmentIdentifier)
findTree(workspaceIdentifier)
findRoots(workspaceIdentifier)
```

Não introduzir cache antecipadamente. Read models, projeções e otimizações SQL ficam para o refinamento específico de consultas do Golden.

## 10. Command Service

Preservar `EnvironmentCommandService` como orquestrador:

```text
normalizar
→ resolver workspace
→ resolver EnvironmentType
→ resolver parent
→ validar hierarquia
→ persistir
```

Não colocar navegação de árvore ou SQL dentro do domínio.

## 11. API

Manter Environment como recurso único. Não criar `/shards` ou `/cells`.

Exemplo conceitual:

```json
{
  "name": "SHARD A",
  "environmentTypeCode": "SHARD",
  "parentIdentifier": "<DEV>"
}
```

A separação atual entre `DefaultEnvironmentController` e `WorkspaceEnvironmentController` pode ser preservada. A hierarquia entra prioritariamente no contexto de workspace.

## 12. Persistência e migration

Não alterar migration já aplicada. Criar migration incremental posterior à baseline atual para adicionar a relação pai/filho, FK e índices necessários.

Direção conceitual:

```sql
ALTER TABLE environment
    ADD COLUMN parent_identifier ... NULL;
```

Índices esperados:

```text
(parent_identifier)
(workspace_identifier, parent_identifier)
```

Não introduzir closure table, nested set ou materialized path inicialmente. Adjacência por `parent_identifier` é suficiente para a necessidade funcional inicial.

## 13. Nó folha

```text
leaf(environment) = !hasChildren(environment)
```

Exemplo:

```text
PRD
├── SHARD A
│   ├── CELL 01
│   └── CELL 02
└── SHARD B
```

Folhas:

```text
CELL 01
CELL 02
SHARD B
```

## 14. Configuração por folha — decisão pendente

A hipótese de que um ambiente com filhos deixe de receber configuração diretamente é coerente com o desenho, mas não deve ser implementada implicitamente na primeira evolução estrutural.

Ela impacta configuração existente, promoção, rollback e mudança de topologia. Primeiro implementar a árvore; depois fechar a semântica de configuração por folha.

## 15. Destination Resolver

Componente posterior responsável exclusivamente por transformar destino solicitado em destinos efetivos:

```text
destino solicitado
+
topologia
↓
Destination Resolver
↓
folhas efetivas
```

Exemplo:

```text
resolve(PRD)

PRD
├── SHARD A
└── SHARD B

=> [SHARD A, SHARD B]
```

Com células:

```text
PRD
├── SHARD A
│   ├── CELL 01
│   └── CELL 02
└── SHARD B

=> [CELL 01, CELL 02, SHARD B]
```

O resolver não publica configuração.

## 16. Publicação

O motor de promoção/publicação não deve conhecer `SHARD`, `CELL` nem tipo de cliente:

```text
publicar em PRD
→ resolver destinos
→ publicar nos destinos resolvidos
```

Não introduzir condicionais do tipo `workspace.isShard()`.

Publicação seletiva de algumas folhas permanece decisão de produto posterior.

## 17. Application e Publisher

A relação Application × árvore precisa de refinamento posterior: referência, cópia, subconjunto e propagação de mudanças ainda precisam ser decididos.

Publisher deve continuar referenciando `Environment`; não criar relacionamento específico com shard/cell. Deve-se decidir posteriormente se associação ocorre na raiz, folha ou por herança/topologia.

## 18. Exclusão e lifecycle

Na primeira implementação, bloquear exclusão de ambiente com filhos. Não introduzir cascade delete automático.

Para inativação, decidir posteriormente entre bloquear pai com descendentes ativos ou executar uma operação explícita de subárvore. Não criar cascata silenciosa.

## 19. Mensagens

Seguir `EnvironmentMessageKeys` e bundles existentes. Novas mensagens conceituais:

```text
environment.parent.not-found
environment.parent.invalid
environment.parent.self
environment.hierarchy.cycle
environment.hierarchy.invalid-type
environment.children.exists
environment.sibling.name-already-exists
```

## 20. Testes

Cobrir pelo menos:

- SHARD sob DEFAULT;
- CELL sob SHARD;
- rejeição de combinação inválida;
- customizado sem pai;
- pai inexistente;
- pai de outro workspace;
- self-parent;
- ciclo indireto;
- nome duplicado entre irmãos;
- mesmo nome sob pais diferentes;
- delete com filhos;
- consulta de filhos/árvore;
- regressão do CRUD atual;
- upgrade de banco existente.

## 21. GAP analysis

| Área | AS-IS | TO-BE | Ação |
|---|---|---|---|
| Environment | plano | hierárquico | adicionar parent |
| EnvironmentType | catálogo existente | DEFAULT/SHARD/CELL | evoluir sem duplicar catálogo |
| Repository | CRUD/queries atuais | pai/filho | ampliar interface |
| Validator | centralizado | regras de árvore | ampliar validator existente |
| Command | CRUD atual | orquestra parent | evoluir serviço existente |
| Query | consultas atuais | filhos/raízes/árvore | ampliar serviço existente |
| API | default/workspace | mesmo recurso + parent | evoluir contratos |
| Migration | baseline aplicada | incremental | nova migration |
| Testes | integração atual | hierarquia + upgrade | ampliar cobertura |
| Publicação | fora da feature | resolver folhas | onda posterior |
| Application | independente | integração a definir | refinamento posterior |
| Publisher | independente | continua Environment | refinamento posterior |

## 22. Ondas

### E0 — Proteção da baseline

- registrar comportamento atual;
- testes de regressão;
- garantir upgrade Flyway.

### E1 — Persistência hierárquica

- migration incremental;
- `parent_identifier`;
- FK/índices;
- entidade e contratos;
- sem alterar publicação.

### E2 — Validação e CRUD

- parent;
- regras de tipo;
- ciclos;
- unicidade entre irmãos;
- delete com filhos;
- testes.

### E3 — Consultas hierárquicas

- children;
- roots;
- tree;
- sem cache antecipado.

### E4 — Semântica de folha

Após decisão funcional:

- nó agrupador configurável ou não;
- transição folha → pai;
- pai → folha;
- configurações existentes.

### E5 — Destination Resolver

- resolver folhas;
- sem publicação;
- sem tipo de cliente;
- testes determinísticos.

### E6 — Promoção/publicação

- múltiplos destinos;
- total vs seletiva;
- estado por destino;
- falha parcial;
- retry/idempotência;
- auditoria;
- rollback.

### E7 — Application e Publisher

- fechar herança/cópia/referência da topologia;
- fechar Publisher;
- evitar duplicação da árvore.

## 23. Critérios de aceite estrutural

1. CRUD atual continua funcionando.
2. Workspace sem customização não muda comportamento.
3. SHARD pode ser criado sob DEFAULT.
4. CELL pode ser criada sob SHARD.
5. Ciclos são impossíveis.
6. Pai inválido/outro workspace é rejeitado.
7. Nomes de irmãos são únicos.
8. Delete de pai com filhos é bloqueado.
9. Árvore pode ser consultada.
10. Não existe regra específica por tipo de cliente.
11. Não existe feature paralela de shard/cell.
12. Migrations aplicadas permanecem imutáveis.
13. Upgrade de base existente é testado.

## 24. Pendências antes de E4+

- nó com filhos deixa obrigatoriamente de ser configurável?
- nó com filhos deixa obrigatoriamente de ser publicável?
- profundidade fica limitada a DEFAULT → SHARD → CELL ou será genérica?
- mover nós será permitido?
- como tratar configuração existente quando folha ganha filhos?
- publicação parcial será permitida?
- como Application consome a árvore?
- como Publisher é resolvido?
- como lifecycle propaga na subárvore?
- como promoção consolida sucesso parcial?

Não transformar esses pontos em comportamento por suposição.

## 25. Resultado esperado

```text
Publicar em PRD
```

Workspace simples:

```text
PRD => PRD
```

Segmentado:

```text
PRD
├── SHARD A
└── SHARD B

=> SHARD A, SHARD B
```

Com células:

```text
PRD
├── SHARD A
│   ├── CELL 01
│   └── CELL 02
└── SHARD B

=> CELL 01, CELL 02, SHARD B
```

A complexidade fica encapsulada em `Environment` e, posteriormente, no `Destination Resolver`. O restante da plataforma trabalha com ambientes/destinos, não com regras específicas de shard, cell ou tipo de cliente.
