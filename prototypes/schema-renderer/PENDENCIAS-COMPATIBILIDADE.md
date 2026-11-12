# Pendências de compatibilidade JSON Schema

Referência: Draft 2020-12. Atualizado em 19/10/2026.

Marcar `[x]` apenas após implementação e validação. Itens abertos representam
trabalho ainda necessário; este documento não declara compatibilidade integral.
Validação do contrato, resolução para o formulário e edição visual têm coberturas diferentes.

Estado atual: 1.302 casos core oficiais + quatro opcionais de format-assertion,
sem exclusões; testes próprios/DOM e E2E entre navegadores. Dispositivos físicos
continuam dependentes de acesso a equipamento/serviço. Consulte o ciclo final abaixo.

## Perfil de negócio — revisão da Construção

Os itens P1–P5 abaixo registram a evolução técnica. Recursos avançados implementados
não precisam estar expostos na Construção: agora são mantidos em **Para Dev**.

- [x] Verificar compatibilidade por contexto e combinação antes de permitir autoria visual.
- [x] Avisar motivos/caminhos, bloquear mutações e preservar JSON sem conversão.
- [x] Manter preview/exportação/Para Dev e desbloquear após correção compatível.
- [x] Remover dependências e padrões da Construção e dos modais de negócio.
- [x] Explicar os limites da Construção e separá-los da capacidade do renderer.
- [x] Validar regressões, build e fluxos nos seis perfis de navegador.

Evidências: `npm run check` aprovado (1.609 testes, zero falhas/omissões,
TypeScript/templates e build de produção); `npm run test:e2e` aprovado
(36 cenários, seis perfis). Capturas do bloqueio conferidas em desktop e mobile.
Escape do preview corrigido e coberto. A homologação em hardware físico segue pendente.

## P1 — Preservação e correções

- [x] Proteger o SE importado complexo contra substituição pela edição simplificada.
- [x] Informar na interface quando o SE deve ser editado em Para Dev.
- [x] Preservar anotações e a ausência de required ao editar um SE simples importado.
- [x] Permitir limites de propriedades em objetos com additionalProperties: false.
- [x] Preservar esses limites ao alternar propriedades adicionais.
- [x] Auditar importação → edição → exportação de todos os recursos, inclusive palavras-chave desconhecidas.
- [x] Proteger boolean schemas nos ramos ENTÃO/SENÃO e verificar preservação de referências locais, regras avançadas e anotações na edição de comparação, visibilidade e obrigatoriedade.
- [x] Atualizar regras do mesmo objeto e referências locais ao renomear; bloquear exclusões referenciadas e manutenção automática de escopos avançados.
- [x] Ampliar manutenção automática para regras que atingem objetos internos a partir de outros níveis e recursos com $id/anchors.

## P2 — Condições

- [x] Mostrar regras if/else sem then no editor de condições.
- [x] Oferecer seleção de enum no valor esperado do SE, preservando o tipo JSON.
- [x] Converter números e rejeitar frações para campos inteiros sem alterar a regra anterior.
- [x] Converter objetos e listas JSON e rejeitar estruturas do tipo incorreto.
- [x] Preservar null na leitura; aceitar null em enum e tipos que permitem null.
- [x] Criar controles específicos para objeto/lista e seleção explícita de null, distinguindo-o do texto "null".
- [x] Resolver referências locais por JSON Pointer antes de escolher controles e converter valores do SE; bloquear referências não resolvidas.
- [x] Oferecer seleção de tipo para uniões declaradas em type com vários tipos não nulos.
- [x] Escolher valores iniciais válidos por tipo ao criar condição ou trocar seu campo; preservar o schema quando não houver candidato válido.
- [x] Adicionar condições compostas: Todas (E), Qualquer uma (OU) e negação.
- [x] Adicionar operadores numéricos, de texto e presença/ausência no SE.
- [x] Permitir condições sobre caminhos de objetos internos.
- [x] Validar conflitos entre condições simultâneas e restrições da origem.

## P3 — Composição e estruturas

- [x] Auditar combinações aninhadas de allOf, anyOf, oneOf e not na resolução visual.
- [x] Explicar individualmente alternativas inválidas e sobreposição de alternativas oneOf.
- [x] Criar edição guiada de dependentRequired e dependentSchemas.
- [x] Criar edição guiada de prefixItems, contains, minContains e maxContains.
- [x] Conferir unevaluatedItems e unevaluatedProperties em composições e referências.
- [x] Ampliar edição guiada de propertyNames e patternProperties.
- [x] Definir importação de schemas booleanos na raiz (o motor já valida boolean schemas).

## P4 — Referências e apresentação

- [x] Definir e implementar cobertura de $id/$anchor e escopo dinâmico validado pela suíte core; manter fallback JSON explícito para apresentação dinâmica.
- [x] Definir política explícita para referências externas: recursos incorporados ou registro offline por documento, sem carregamento silencioso.
- [x] Auditar referências recursivas e limites da resolução; ciclos e profundidade visual têm diagnóstico/editor JSON.
- [x] Documentar e verificar presença obrigatória, texto vazio e null separadamente.
- [x] Documentar valores preservados em campos ocultos e conflitos de visibilidade.
- [x] Documentar format, default, readOnly, writeOnly e extensões x-ui.

## P5 — Evidência de compatibilidade

- [x] Adicionar regressões para proteção de SE complexo, if/else, tipos e limites de objeto fechado.
- [x] Validar o lote atual com npm run check: testes próprios/DOM, suíte oficial, formatação, tipos Angular e build de produção.
- [x] Integrar a JSON Schema Test Suite oficial Draft 2020-12, fixando sua versão e impedindo exclusões silenciosas (manifesto atual vazio).
- [x] Publicar matriz completa por keyword: validação, renderer, edição guiada e edição JSON.
- [x] Criar regressões de round-trip para o conjunto de recursos suportados e os 45 exemplos do catálogo.
- [x] Executar E2E e revisão visual em Chromium, Firefox, WebKit e emulações móveis.

O fechamento de P4/P5 refere-se ao perfil publicado em
[COMPATIBILIDADE-JSON-SCHEMA.md](docs/COMPATIBILIDADE-JSON-SCHEMA.md). As 98 exclusões
iniciais foram eliminadas no ciclo final. A aprovação da suíte selecionada não
significa suporte integral a todos os cenários da especificação.

## Evidências do lote atual

- `src/app/features/regras/condicoes/edicao-condicoes.test.ts`: preservação, if/else,
  enum tipado, integer, number, null, object e array, rejeição de entradas inválidas.
- `src/app/features/builder/editores-builder.test.ts`: limites em objeto fechado e
  preservação ao alternar additionalProperties.
- `src/app/features/campos/componentes-campos.dom.test.ts`: templates Angular reais;
  exemplo de compatibilidade agora verifica o seletor enum do SE.
- `npm run check` concluído sem falhas. Testes DOM usam jsdom, sem verificação de CSS.

## Segundo lote — valores das condições

- Objetos e listas usam textarea JSON, aplicado ao concluir a edição; entradas
  inválidas não substituem a comparação anterior.
- O seletor de tipo distingue explicitamente null do texto "null". Enum usa o
  valor original, sem confundir números, textos e objetos com rótulos semelhantes.
- Referências locais por JSON Pointer são resolvidas com as restrições vizinhas.
  Referências externas ou ausentes bloqueiam alterações com mensagem explícita;
  suporte a anchors e referências dinâmicas permanece pendente em P4.
- A seleção de valores iniciais verifica os candidatos com Ajv. Ela não sintetiza
  qualquer valor para qualquer schema: quando nenhum candidato atende, orienta
  cadastrar um exemplo ou default válido e mantém o contrato anterior.
- Evidências adicionais: `valores-condicao.test.ts`, novas regressões em
  `edicao-condicoes.test.ts` e teste DOM de null, união, JSON parcial e entrada numérica.
- `npm run check`: 130 testes passaram, tipos Angular e produção concluídos.

## Terceiro lote — preservação de ENTÃO/SENÃO

- Ramos `then: true/false` e `else: true/false` são mantidos literalmente. Seus
  controles de edição ficam desabilitados com orientação para Para Dev.
- Propriedades cujo schema é `true` ou `false` também são protegidas contra
  conversão implícita para objeto ao editar restrições, visibilidade ou required.
- Os comandos verificam a proteção além do bloqueio visual. Remover explicitamente
  uma regra/campo continua sendo uma ação distinta de editar sua restrição.
- Regressões verificam que comparar campos com referência local preserva `$ref`,
  `allOf` e anotações personalizadas; alternar visibilidade/required preserva regras
  `not` avançadas e referências dos ramos. Isso não conclui a auditoria global de
  round-trip, referências dinâmicas ou renomeação/exclusão, ainda pendentes.
- Evidências: `edicao-condicoes.test.ts`, `restricoes-unificadas.test.ts` e teste
  DOM de ramos booleanos e edição independente do SE.
- `npm run check`: 138 testes passaram, tipos Angular e build de produção concluídos.

## Ciclos 4 a 6 — manutenção de campos e operadores do SE

### Ciclo 4: nomes e exclusão

- Renomear atualiza properties/required em condições, alternativas e negações do
  mesmo objeto, gatilhos/listas de dependentRequired, dependentSchemas e $ref
  locais por JSON Pointer, inclusive ponteiros descendentes e segmentos escapados.
- Outros objetos, const/default/examples e extensões não são reinterpretados como
  regras. Valores fixos de objeto impedem renomeação automática.
- Colisões em regras bloqueiam a operação. Exclusão de campo referenciado exige
  ajustar as regras/referências antes. Exclusão de alternativas com ponteiros
  locais para a composição também é protegida contra deslocamento de índices.
- Recursos internos com $id, referências avançadas e objetos internos restringidos
  por regras de ancestrais orientam edição explícita em Para Dev. Não se promete
  reescrever automaticamente schemas de vocabulários desconhecidos.
- Evidências: `manutencao-referencias.test.ts` e `editores-builder.test.ts`, incluindo
  validação dos mesmos payloads antes/depois da renomeação e cancelamento do rascunho.
- Primeiro fechamento: 144 testes, tipos e build passaram. Revisão final inclui
  proteção de escopos e testes adicionais no fechamento integrado abaixo.

### Ciclo 5: comparações numéricas e texto

- O SE oferece maior, maior ou igual, menor e menor ou igual, gerando os keywords
  minimum/maximum e exclusiveMinimum/exclusiveMaximum.
- Texto oferece contém, começa/termina com e suas negações, gerando pattern com
  trecho literal escapado. Diferencia maiúsculas de minúsculas.
- Comparações simples importadas reconhecidas podem ser reabertas. Regras com
  múltiplas restrições ou regex não representável continuam protegidas como avançadas.
- Trocar campo ou tipo a partir de uma comparação especializada volta a igualdade
  com valor inicial válido. Trocar operador preserva os ramos ENTÃO/SENÃO.
- Evidências: `comparacoes-condicao.test.ts` (limites e texto literal com Ajv) e
  integração de controles reais em `componentes-campos.dom.test.ts`.
- Fechamento: 153 testes, tipos e build passaram.

### Ciclo 6: presença e ausência

- O SE oferece Está presente (required) e Está ausente (not/required).
- Esses operadores não exigem valor esperado. Null, false, zero e texto vazio
  contam como propriedade presente; presença é diferente de preenchimento.
- Trocar de presença para comparação de valor escolhe um candidato válido e exige
  a propriedade no if. Required vazio de uma comparação importada é preservado.
- Evidências: testes do controlador, avaliação com Ajv e integração Angular/DOM.
- Fechamento integrado, incluindo a revisão do ciclo 4: 159 testes, formatação,
  análise de tipos Angular e build de produção concluídos.

## Fechamento de P1, P2 e P3

Status: concluídos no escopo abaixo. Evidência final: `npm run check` com **233
testes aprovados**, formatação, compilação estrita Angular e build de produção.

### P1: preservação e manutenção

- Importação → edição pontual → exportação auditada nos **45 schemas do catálogo**
  e em fixtures com referências, boolean schemas, composições, dependências, tuplas,
  formatos, enums mistos, anotações e palavras-chave desconhecidas.
- Corrigida a inclusão global de minLength durante alterações não relacionadas:
  um texto obrigatório importado pode continuar aceitando vazio. A política de
  impedir vazio só é aplicada ao campo cujo controle de obrigatoriedade foi
  explicitamente alterado, ou pela configuração de tamanho/texto vazio.
- Renomeação planejada antes da mutação: regras de ancestrais sobre objetos
  internos, definições reutilizadas e seus consumidores, recursos internos $id,
  ponteiros relativos ao recurso e anchors estáveis. Colisões são recusadas;
  excluir referências/regras continua exigindo manutenção explícita, preservando o
  contrato anterior. Referências dinâmicas não são reescritas silenciosamente.
- Palavras-chave desconhecidas são preservadas como conteúdo opaco; sua semântica
  não é interpretada nem reescrita. A auditoria não equivale a homologar vocabulários
  externos, todas as combinações possíveis ou a suíte oficial de conformidade.

### P2: condições

- Editor recursivo de Todas (allOf), Qualquer uma (anyOf) e negação (not), com
  adição/remoção de condições e substituição guiada de folhas. Expressões importadas
  não representáveis continuam protegidas e editáveis em Para Dev.
- Campo interno selecionável por caminho, por exemplo `/grupo/ativo`. Os schemas
  gerados exigem a presença dos pais e do campo para comparações; ausência nega
  a presença do caminho inteiro. Nomes com `/` e `~` usam escape JSON Pointer.
- Diagnóstico de conflitos: valores fixos/enums incompatíveis, intervalos vazios,
  limites de texto e ramos simultâneos com sobreposição demonstrável. É diagnóstico
  conservador: ausência de aviso não prova satisfatibilidade de schemas arbitrários
  com regex, negações e vocabulários externos. Ajv e o formulário validam os payloads.
- Evidências: testes de expressões/controladores e eventos Angular reais no editor
  recursivo; os ramos ENTÃO/SENÃO e anotações permanecem preservados.

### P3: composição e estruturas

- Corrigida a interseção de limites e padrões coincidentes na resolução visual.
  Auditadas composições aninhadas e negações. A apresentação continua conservadora;
  a validade é determinada pelo contrato original, sem substituí-lo pelo snapshot.
- OneOf explica nenhuma alternativa válida, sobreposição (com índices) e erros por
  alternativa; o renderer oferece os detalhes de cada opção.
- Edição guiada de dependentRequired/dependentSchemas na etapa Regras (inclusive
  raiz) e nos objetos do modal de validações. Schemas dependentes completos usam
  um editor JSON específico, com validação antes de emitir a alteração.
- Edição de prefixItems por posição, schemas dos itens, contains/minContains/
  maxContains, propertyNames por padrão e patternProperties por padrão/tipo/schema.
  Subschemas complexos usam áreas JSON dedicadas. Erros preservam o valor anterior;
  remoção de posições referenciadas é recusada para não deslocar ponteiros.
- Conferidos unevaluatedItems/unevaluatedProperties com referências e composições.
  A validação complementar acompanha índices correspondentes a contains, impedindo
  que itens não correspondentes sejam indevidamente considerados avaliados.
- **Política de raiz booleana definida:** o motor valida true/false, mas o Studio
  importa documentos schema em forma de objeto JSON. A importação booleana é
  recusada com explicação e alternativas explícitas `{}` e `{"not":{}}`.
  Não há conversão silenciosa nem promessa de edição visual de raiz booleana.
- Evidências: `core/schema/compatibilidade-p123.test.ts`,
  `features/builder/compatibilidade-p123.test.ts`, testes de renomeação e testes DOM.

No fechamento anterior, P4 e P5 mantinham suas pendências: referências dinâmicas/externas e limites de recursão,
matriz completa por keyword, suíte oficial e homologação visual/E2E. Os testes DOM
usam jsdom e não verificam layout/CSS em navegador real.

## Consolidação após revisão de estrutura e layout

- [x] Corrigir a conversão de valores das condições compostas: usar valores tipados e
      rejeitar números/booleanos entre aspas, inteiros fracionários e JSON do tipo incorreto.
- [x] Exigir `type: object` em cada pai dos caminhos internos; comparação/presença
      não é satisfeita por pai nulo, escalar ou lista. A ausência nega a presença do
      caminho inteiro; valores nulos na propriedade final continuam contando como presença.
- [x] Compartilhar o controle de valor entre SE simples e composto: enum tipado,
      liga/desliga, número, texto, objeto/lista JSON e seleção explícita de nulo/tipo.
- [x] Separar operador E/OU do grupo, criação de subgrupos e envolvimento de expressão.
      Trocar o operador mantém os filhos e o nível do grupo, sem criar um grupo adicional.
- [x] Preservar rascunhos e identidade dos controles durante outras interações, erros
      de aplicação, edição de irmãos e troca E/OU. Deslocar rascunhos ao remover posições.
- [x] Organizar estruturas em seções recolhíveis e grids responsivos; reconhecer
      objetos e listas anuláveis sem alterar sua união de tipos.
- [x] Separar templates/estilos dos editores de expressão e estruturas em arquivos
      próprios, com conversão condicional compartilhada em módulo de domínio.

Evidências: `revisao-condicoes.test.ts`, `revisao-estruturas.test.ts` e regressões
Angular/DOM em `componentes-campos.dom.test.ts`. `npm run check`: **256 testes
aprovados**, formatação, análise de tipos Angular e build de produção concluídos.

### Inspeção inicial no Chrome — 19/10/2026

A conexão pela extensão foi restabelecida e a aplicação local foi inspecionada
na porta 4200, com um schema de teste criado nesta sessão.

- [x] Conferir a aba Para Dev com ações Validar JSON/Formatar JSON e sem preview embutido.
- [x] Conferir o SE booleano com liga/desliga e os ramos ENTÃO/SENÃO em linhas separadas.
- [x] Trocar o operador do grupo de E para OU e adicionar uma segunda condição.
- [x] Abrir as seções recolhíveis de dependências, nomes e propriedades dinâmicas.
- [x] Conferir no preview que `ativo: true` torna `email` visível e obrigatório.
- [x] Diferenciar na interface a ausência de um campo opcional e o valor explícito
      `null`: seletor Preenchimento com Não informar, Preencher e Nulo (null),
      respeitando obrigatoriedade, aceitação de null pelo contrato e somente leitura.
      Não informar remove a propriedade do payload; Nulo mantém a propriedade com null.
      Aplicado a escalares, objetos, listas e JSON livre. Enum iniciado por null cria
      um valor não nulo ao escolher Preencher; schemas somente null não oferecem essa opção.
      Layout do cabeçalho passa a usar flex com quebra de linha, sem sobreposição.
      Testes DOM verificam os estados e o payload para todos os tipos. Chrome desktop
      conferido com texto opcional, texto anulável e lista anulável.

Essa inspeção inicial cobriu viewport desktop. O ciclo P4/P5 abaixo acrescentou
E2E automatizado e revisão de screenshots em desktop e emulação móvel.

Validação deste ciclo: `npm run check`, **259 testes aprovados**; análise de tipos
Angular e build de produção.

## Fechamento inicial de P4 e P5 — histórico superado pelo ciclo final

- Registro Ajv isolado por documento, LRU de até 100 entradas e correção de boolean
  schemas no cache. Registro explícito de base para referências à raiz.
- Compilação normaliza enum vazio e chave própria `__proto__` sem modificar o schema
  do usuário. `multipleOf` usa aritmética decimal BigInt, sem divisão flutuante.
- Referências locais, recursos com $id e anchors preservam irmãos. Recursos ausentes
  e ciclos têm diagnóstico de apresentação; a importação não busca a rede.
- Documentos dinâmicos e limites visuais usam edição JSON mantendo a validação original.
- Suíte oficial fixada no commit `55719286c33ae0d1823bfb65fea10338a19bc37c`:
  naquele lote havia **1.302 casos core, 1.204 aprovados e 98 excluídos**.
  O ciclo final removeu essas exclusões; o manifesto atual está vazio.
  A compilação é exigida inclusive
  quando o payload esperado é inválido; erro de compilação não conta como acerto.
- E2E em `tests/e2e/schema-studio.spec.ts`: **10 testes aprovados** em Chromium
  desktop/emulação móvel; Dev/JSON inválido, grupos E/OU, ramos, null/ausência,
  fallback dinâmico, dados ocultos e erros de payload. Screenshots inspecionados.
- Corrigido overflow móvel nas ações de validar/formatar, com quebra de linha e
  largura flexível. O input booleano é acionado pelo controle visível nos E2E.
- `npm run check:all` reúne check completo e E2E. P4 tem regressões próprias em
  `compatibilidade-p45.test.ts`; a matriz documenta semântica, limites e autoria.

## Ciclo final — execução dos cinco próximos itens

- [x] **1. Referências e escopo dinâmico:** corrigir URNs/recursos relativos,
      anchors destacados, recuperação por alias, escopos por caminho, saída de
      ramos e independência de ordem. Casos core de ref/dynamicRef aprovados.
- [x] **2. Anotações:** unificar a avaliação de propriedades/índices com
      allOf/anyOf/oneOf/not/if, refs, contains e unevaluated. Remover a avaliação
      suplementar divergente. Casos core de unevaluated/contains/if aprovados.
- [x] **3. Políticas:** manter validação de formatos no perfil de produto,
      oferecer annotation na API e respeitar format-assertion explícito.
      Adicionar registro offline de recursos por documento, sem fetch, com URI
      de recuperação e $id canônico. Vocabulários conhecidos são selecionados;
      obrigatório desconhecido é recusado. Testes opcionais de format-assertion aprovados.
- [x] **4a. Navegadores:** executar 30 E2E em Chromium/Firefox/WebKit e emulações
      iPhone/Android. Relatórios, traces e screenshots são reproduzíveis.
- [ ] **4b. Dispositivos reais:** validar Safari em iPhone físico e Chrome em
      Android físico. Equipamento/serviço não disponibilizado. O roteiro está em
      [HOMOLOGACAO.md](docs/HOMOLOGACAO.md). Emulação não encerra este item.
- [x] **5. CI:** instalar `.github/workflows/schema-renderer-check.yml` na raiz
      para PRs/pushes e tornar `check:all` obrigatório no workflow de Pages,
      removendo `continue-on-error` e usando `npm ci`. A execução local passou;
      a execução remota ocorrerá no próximo push/PR. Não houve publicação.

Evidências: `avaliacao-documento.ts`, `vocabularios-schema.ts`,
`perfis-validacao.test.ts`, `suite-oficial.test.ts`, `tests/recursos-oficiais.ts`,
`playwright.config.ts` e a matriz publicada. O cache considera os perfis/recursos,
recusa IDs/anchors duplicados e falhas repetidas não passam silenciosamente.
A avaliação tem orçamento de 256 níveis/100.000 visitas, com erro explícito ao exceder.

Resultado do ciclo: **1.585 testes aprovados, zero falhas e zero exclusões**,
incluindo **1.302 casos core oficiais + quatro opcionais de format-assertion**.
`npm run check:all` também exige tipos Angular, build de produção e os 30 E2E.
Demais suites opcionais e certificação de dispositivos reais não são declaradas cobertas.

## Referências

- [JSON Schema Core 2020-12](https://json-schema.org/draft/2020-12/json-schema-core)
- [JSON Schema Validation 2020-12](https://json-schema.org/draft/2020-12/json-schema-validation)
- [JSON Schema Test Suite](https://github.com/json-schema-org/JSON-Schema-Test-Suite)

## Ciclo — condições em linguagem de negócio

- [x] Substituir botões Agrupar por Atender: Todas as condições / Pelo menos uma condição.
- [x] Disponibilizar Adicionar condição no fluxo principal, preservando a comparação existente.
- [x] Recolher grupos aninhados, inversão e consulta JSON em Condições avançadas.
- [x] Identificar inversão ativa e apresentar os ramos Então / Caso contrário.
- [x] Atualizar documentação e regressões de edição/troca de operador/preservação de ações.
- [x] Conferir layout final em desktop/mobile e executar validação completa após corrigir sobreposição do cabeçalho.

Evidência deste ciclo: `npm run check:all` aprovado, 1.610 testes sem falhas/omissões,
build de produção e 36 E2E nos seis perfis. Capturas `condicoes-negocio.png`
conferidas em desktop e mobile. Log: `/private/tmp/schema-condicoes-negocio-final.log`.

## Ciclo — IF somente com E/OU na Construção

Este ciclo substitui a proposta anterior de expor Condições avançadas recolhidas.

- [x] Remover da interface os controles de grupos aninhados, inversão e consulta JSON.
- [x] Manter comparação única ou lista plana: Todas as condições (E) / Pelo menos uma condição (OU).
- [x] Manter Diferente de, Não contém e Está ausente como comparações simples.
- [x] Preservar schemas avançados importados e bloquear sua edição na Construção, indicando Para Dev.
- [x] Atualizar documentação e regressões para o perfil simplificado.
- [x] Concluir check completo e conferência visual desktop/mobile.

Validação deste ciclo: `npm run check:all` aprovado, 1.615 testes sem falhas/omissões,
build de produção e 36 E2E em seis perfis. Capturas desktop/mobile conferidas.
Log local: `/private/tmp/schema-if-simples-final.log`.

## Ciclo — alinhamento das condições e propriedades

- [x] Exibir condições uma abaixo da outra, sem cards individuais, com SE na primeira e E/OU nas seguintes.
- [x] Atualizar os conectores ao trocar a combinação e preservar as ações dos ramos.
- [x] Colocar Tipo da propriedade acima do seletor e alinhar o botão de adicionar à mesma altura.
- [x] Dar estilos próprios ao seletor de propriedade, sem depender do carregamento do editor oneOf.
- [x] Concluir verificação de geometria, capturas desktop/mobile e validação completa.

Evidência do alinhamento: 1.616 testes, build de produção e 42 E2E aprovados;
capturas e geometria conferidas para objetos/listas em desktop/mobile.
Log local: `/private/tmp/schema-layout-propriedade.log`.

## Ciclo — revisão do CSS e ajuda da Construção

- [x] Remover 65 declarações CSS substituídas por declarações posteriores, preservando contexto e prioridade.
- [x] Separar ajuda e estados de compatibilidade em `construcao-ajuda.css`.
- [x] Reorganizar a ajuda em Campos e validações, Regras de negócio e Quando usar o Para Dev.
- [x] Explicar lista plana E/OU, preservação, desbloqueio e limites de visualização.
- [x] Concluir validação completa, interação da ajuda e conferência de capturas desktop/mobile.

Evidência da revisão: `npm run check:all` aprovado, 1.616 testes sem falhas/omissões,
build de produção e 48 E2E em seis perfis. Ajuda aberta/fechada, ausência de overflow,
alinhamento do seletor e conectores E/OU verificados. Capturas desktop/mobile conferidas.
Log local: `/private/tmp/schema-css-ajuda.log`.

## Ciclo — atributos discretos e ações das condições

- [x] Uniformizar superfície branca, seleção e foco azuis para atributos e objetos.
- [x] Isolar hover dos atributos internos do estilo laranja global.
- [x] Colocar Adicionar condição ao lado de Atender, Excluir à esquerda e Aplicar ao final da linha.
- [x] Atualizar conectores E/OU ao trocar Atender, preservando comparações e ramos.
- [x] Recolher a escolha do tipo em + Atributo e fechar após adicionar.
- [x] Oferecer objetos e listas no seletor de atributos e conferir navegação em objetos aninhados.
- [x] Concluir testes e capturas da versão final nos seis perfis.

## Ajuste — objetos aninhados no próprio card

- [x] Retirar Abrir atributos e manter a edição no contexto do objeto.
- [x] Renderizar atributos de objetos/listas de objetos dentro do card, com + Atributos em cada nível.
- [x] Reutilizar um componente recursivo de apresentação com limite de profundidade, preservando os comandos de edição do builder.
- [x] Verificar inclusão de objeto interno e campo dentro dele por eventos reais no navegador.
- [x] Concluir a rodada final de validação e conferência visual.

Objetos aninhados validados com `npm run check:all`: 1.616 testes sem falhas/omissões,
build e 54 E2E nos seis perfis. Capturas adicionais desktop/mobile conferidas.
Na revisão visual, o cabeçalho da Construção passou a acompanhar o fluxo normal
também em Componentes, evitando sobreposição durante edição de atributos no celular.

Validação final após a correção do cabeçalho: `npm run check:all` aprovado,
1.616 testes sem falhas/omissões, build e 54 E2E. Capturas de objetos aninhados
conferidas em desktop/mobile. Log: `/private/tmp/schema-inline-final.log`.

## Ciclo — aplicação única do Quando

- [x] Retirar aplicação individual das linhas e oferecer um único Aplicar condição no rodapé do Quando.
- [x] Manter campo/operador/valor, E/OU, inclusão e exclusão de linhas em rascunho até aplicar.
- [x] Validar todas as comparações antes de publicar uma única alteração; preservar a regra anterior em caso de erro.
- [x] Oferecer Descartar alterações sem reverter mudanças já salvas em Então/Caso contrário.
- [x] Preservar metadados e comparações sem alterações, incluindo ausência de required no schema de origem.
- [x] Evitar transferência de rascunhos ao excluir regras com IFs iguais e reiniciar a sessão ao receber outro IF.
- [x] Cobrir erros numéricos/JSON, aplicação atômica, descarte e alterações externas com testes.
- [x] Concluir check completo e conferência do rodapé em desktop/mobile.

Aplicação única validada: `npm run check:all` aprovado com 1.621 testes sem
falhas/omissões, build de produção e 54 E2E em seis perfis. Capturas desktop/mobile
conferidas e schema original comparado antes de aplicar.
Log local: `/private/tmp/schema-quando-atomico-check.log`.

### Criação direta de alternativas exclusivas

- [x] Remover a pergunta de modo: o botão adiciona conjuntos de campos diretamente.
- [x] Preservar oneOf por valor importado e orientar sua edição no Para Dev.
- [x] Atualizar a ajuda e a documentação do perfil Construção.

### Ocultação com valor nulo — consistência de origem, ramos e payload

- [x] Bloquear ocultação de campo obrigatório na origem ou no ramo.
- [x] Exigir null permitido pela definição completa da origem e pela comparação do ramo.
- [x] Gerar tipo não nulo no ramo visível e tipo null no oculto, preservando limites da origem.
- [x] Desabilitar o controle com tooltip quando a ocultação não é permitida.
- [x] Desabilitar comparações no ramo oculto e respeitar o tipo ativo no controle de preenchimento.
- [x] Normalizar campos ocultos para null, incluindo objetos internos e itens de lista.
- [x] Validar no atributo da condição sem bloquear cadastro, salvamento ou edição geral.
- [x] Preservar schemas técnicos antigos sem migração automática e mostrar incompatibilidades no próprio atributo, permitindo corrigir sua visibilidade.
- [x] Cobrir texto, inteiro, decimal, booleano, objeto e lista com testes de regressão e DOM.
- [x] Concluir suíte E2E nos seis perfis de navegador: 66 cenários aprovados.

Validação de ocultação: `npm run check:all` aprovado com 1.645 testes, tipos Angular,
build de produção e 66 E2E nos seis perfis. Cadastro e edição geral permanecem disponíveis.

### Navegação e cabeçalho da Construção

- [x] Posicionar título e descrição abaixo do card de etapas.
- [x] Manter Anterior à esquerda e Próximo à direita, ocupando toda a largura do rodapé.
- [x] Mostrar os dois botões e desativar Anterior na primeira etapa e Próximo na segunda.
- [x] Validar navegação, posição, largura e limites nos seis perfis; capturas desktop e mobile conferidas.

Validação: 1.645 testes e 66 E2E aprovados; após o ajuste final de largura/margem,
os seis cenários de navegação foram repetidos e aprovados. Build de produção aprovado.
