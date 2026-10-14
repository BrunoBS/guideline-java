# Refinamento V1 — Segmentos e Categorias (Workspace Service)

**Status:** refinado para implementação pelo Worker. **Escopo:** CRUD do catálogo global; integração/distribuição para toggles fora desta entrega.

## Objetivo e limites
Implementar no `workspace-service` um catálogo global de segmentos e suas categorias. Apenas a owner da plataforma administra os cadastros. Não vincular a account, workspace ou aplicação. Outros usuários poderão consultar conforme a autorização existente. Não implementar nesta fase cache, HTTP entre serviços, views de integração, publicação, tabelas de associação com toggle ou regras de avaliação de toggle.

## Modelo relacional — MySQL 8 / Flyway
### `segment`
- `id BIGINT` PK, auto incremento, identificador interno;
- `identifier` UUID persistido conforme convenção Golden (por exemplo `BINARY(16)` ou `CHAR(36)` conforme padrão existente), NOT NULL, UNIQUE, imutável;
- `name VARCHAR(150)` NOT NULL;
- `code VARCHAR(100)` NOT NULL, UNIQUE global, imutável;
- `lifecycle` NOT NULL, valores `ACTIVE` / `INACTIVE` conforme catálogo Golden;
- campos de auditoria já padronizados no projeto, sem criar padrão paralelo.

### `segment_category`
- `id BIGINT` PK, auto incremento;
- `identifier` UUID NOT NULL UNIQUE, imutável;
- `segment_id BIGINT` NOT NULL FK `segment(id)`;
- `name VARCHAR(150)` NOT NULL;
- `code VARCHAR(100)` NOT NULL, imutável;
- `lifecycle` NOT NULL, `ACTIVE` / `INACTIVE`;
- UNIQUE (`segment_id`, `code`), preservada também para inativos;
- campos de auditoria conforme convenções existentes.

Não implementar DELETE físico nem `ON DELETE CASCADE`. A categoria pertence a um segmento durante toda a vida: `segment_id` não pode mudar. Os UUIDs não são reutilizados. Segmentos e categorias possuem identificadores públicos globalmente únicos em suas respectivas tabelas; UUIDs gerados novos em cada criação.

## Validações
- `code` em minúsculas, somente `[a-z0-9]+(?:-[a-z0-9]+)*`; sem espaços, pontos ou prefixo de segmento armazenado na categoria. Normalização e política de rejeição devem seguir padrão Golden existente, sem alterar código silenciosamente após cadastro.
- `name` obrigatório, não vazio após trim. Aplicar limites definidos pelo schema.
- Códigos únicos e imutáveis; atualizar permite modificar nome, mas não código, UUID ou segmento.
- Criar segmento: nasce `ACTIVE`. Criar categoria: nasce `ACTIVE` **somente se o segmento estiver ACTIVE**; caso contrário lançar erro de negócio padronizado.
- Ativar/inativar segmento: altera apenas lifecycle do segmento, nunca altera categorias em cascata.
- Ativar/inativar categoria: permitido independentemente do lifecycle do segmento; a disponibilidade efetiva para novos vínculos é `segment.lifecycle == ACTIVE && category.lifecycle == ACTIVE`.
- Consultas administrativas devem permitir visualizar inativos.
- Unicidade aplicada por constraints no banco e tratada com mensagens de negócio, incluindo concorrência.

## APIs / Casos de uso
Dois controllers independentes: `SegmentController` e `SegmentCategoryController`, seguindo rotas, autenticação, Request/Response, paginação e nomenclatura existentes no workspace-service.
- Segmentos: Create, Update, FindByIdentifier, FindAll (filtro opcional lifecycle e code/name se compatível com padrão), PatchActivate, PatchInactivate.
- Categorias: Create (recebe `segmentIdentifier`), Update, FindByIdentifier, FindAll (filtro por `segmentIdentifier` e lifecycle), PatchActivate, PatchInactivate.
- Não expor Delete; não implementar fluxo de aprovação. Mutação owner-only via autorização Golden; leitura conforme política de catálogo global do serviço.
- IDs numéricos nunca entram nos contratos públicos. Responses administrativos retornam `identifier`, `name`, `code`, `lifecycle`; categoria inclui referência pública ao segmento.
- Separar Command/Query, use cases, domain, infra, web, sem abstrações genéricas novas; reutilizar Messenger, chaves de mensagens e bundles pt_BR/en_US existentes.

## Integração futura — contexto, NÃO implementar agora
Toggle pode ter zero ou várias categorias, inclusive de segmentos diferentes; cada segmento escolhido na interface exige pelo menos uma categoria. Relação futura muitos-para-muitos `toggle_category` com FK interna para toggle e categoria (se serviços separados, definir estratégia de persistência sem FK cross-service). Categorias são metadados, não regras de ativação. Nas APIs administrativas selecionar por UUID; no payload publicado ao consumidor enviar códigos compostos `segmentCode.categoryCode`, montados dinamicamente. Exemplo: `mobile-pf.premium`, `internet-pf.premium`. Não armazenar código composto. Distribuição/cache local do catálogo no serviço de toggles será refinada depois.

## Testes / critérios de aceite do Worker
1. Flyway cria tabelas, FKs e constraints; migration e rollback operacional conforme padrão do repositório.
2. CRUD sem DELETE; apenas owner altera, leituras autorizadas.
3. Segment code duplicado falha inclusive quando anterior INACTIVE; category code duplicado falha dentro do mesmo segmento, mas é permitido em segmentos distintos.
4. UUID único, imutável e público; código imutável; mudança de segmento da categoria proibida.
5. Categoria não pode ser criada com segmento INACTIVE; pode ser ativada ou inativada mesmo assim.
6. Inativar segmento não modifica lifecycle de suas categorias; disponibilidade efetiva exige ambos ACTIVE.
7. Paginação, filtros, validação, mensagens traduzidas, testes unitários/integrados e architecture tests seguem Golden.
8. Não adicionar dependências sem autorização, não modificar outros serviços nem implementar publicação/cache.

## Orientação de execução
Worker deve primeiro inspecionar implementações equivalentes de catálogo e lifecycle no `workspace-service`, respeitar nomes reais de tabelas e padrões existentes, e ajustar detalhes técnicos de mapeamento sem mudar regras funcionais. Executar build e testes; apresentar evidências, arquivos alterados e eventuais decisões pendentes.