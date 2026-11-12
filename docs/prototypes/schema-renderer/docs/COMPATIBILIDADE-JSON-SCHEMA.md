# Cobertura JSON Schema Draft 2020-12

Este documento define o perfil do Studio. Validação do contrato, geração de controles
e autoria guiada são capacidades distintas. Não há declaração de conformidade integral.

## Perfil de negócio da Construção

O perfil visual é deliberadamente menor que o perfil do validador e do renderer.
`compatibilidade-construcao.ts` examina tipos, posições e combinações. Se houver
recurso não representável, toda mutação visual é bloqueada, com motivos e caminhos;
o documento original é preservado e a edição deve continuar em **Para Dev**.
A remoção do recurso incompatível desbloqueia automaticamente a Construção.
Texto JSON inválido também impede editar o último schema válido visualmente.

São permitidos: objeto raiz, seis tipos de campo, um tipo com null nos campos,
limites básicos, enums de texto/número, listas homogêneas de tipos simples ou objetos,
SE com comparação única ou lista plana E/OU em allOf e oneOf por conjuntos de campos. Alternativas por valor importadas exigem o Para Dev.
Grupos aninhados e inversão da expressão ficam no Para Dev e bloqueiam a Construção;
comparações diferente/não contém/ausente continuam disponíveis. Listas aninhadas, itens com
união/restrições sem controles, referências, dependências, padrões de propriedades,
booleans schemas e composições gerais ficam no Para Dev. Anotações conhecidas
(title/description/examples/$comment) são preservadas sem interpretar seus valores
como regras. Recursos desconhecidos bloqueiam o perfil visual conservador.

O bloco de dependências e padrões não é exposto na Construção, inclusive nos modais.
Componentes técnicos preservados no código têm testes próprios, mas isso não implica
acesso de negócio nem suporte visual a todo schema que usa as mesmas keywords.
Os limites do perfil se aplicam também às linhas “Sim”/“Parcial” da matriz abaixo.

Visualização e exportação permanecem disponíveis durante o bloqueio. O renderer
suporta contratos mais amplos; partes complexas podem usar JSON com aviso. Ele
valida o documento original e não promete controles convencionais para qualquer
composição. As referências externas não são buscadas automaticamente na rede.

## Referências e limites

- `$id` resolve bases absolutas/relativas de recursos incorporados. `$ref` aceita JSON
  Pointer (incluindo escapes), URI de recurso e `$anchor`. Irmãos de `$ref` são mantidos.
- `$dynamicRef` avalia o primeiro `$dynamicAnchor` aplicável no caminho dinâmico,
  inclusive anchors destacados, URNs, recursos intermediários e retorno de ramos.
  A validação usa o documento original; a apresentação dinâmica continua em JSON com
  aviso. Renomeações através dessas referências permanecem bloqueadas no editor guiado.
- Recursos externos podem ser incorporados em `$defs` ou fornecidos no registro
  explícito `PerfilValidacao.recursos`. O registro é isolado por compilação, aceita
  URI de recuperação diferente do `$id` canônico e não altera o contrato recebido.
  Não existe fetch, `compileAsync` ou registro global. A ausência de um recurso
  necessário gera erro; nenhum endereço autoriza acesso à rede.
- O Studio usa o perfil de produto, com formatos conhecidos validados. A API também
  oferece o perfil `formatos: 'anotacao'`, usado pela suíte core 2020-12. Um metaschema
  registrado com `format-assertion` exige assertion mesmo nesse perfil; o booleano
  no mapa `$vocabulary` controla reconhecimento, não desativa o vocabulário conhecido.
- Metaschemas registrados devem declarar `$vocabulary`. Os vocabulários conhecidos
  2020-12 são selecionados por recurso. Um vocabulário obrigatório desconhecido é
  recusado; um opcional desconhecido é ignorado. Outros drafts não são prometidos.
- Ajv valida as restrições básicas. Referências e `unevaluated*` compartilham uma
  avaliação de aplicadores que acompanha propriedades/índices avaliados, sem a antiga
  avaliação suplementar divergente. O cache LRU mantém até 100 perfis/documentos e
  inclui formatos e recursos na chave. IDs/anchors duplicados são recusados.
- A avaliação composta tem orçamento de 256 níveis e 100.000 visitas por payload;
  ciclo sem avanço e limite excedido retornam erro, sem aceitação silenciosa.
  Resolução/profundidade visual têm limite 20; composição/reconciliação, 30.
  O limite visual usa JSON e preserva o contrato. A inicialização para em 20 níveis,
  podendo produzir `null` que ainda precisa ser corrigido pela validação.
- O uso de Number limita a precisão da entrada numérica. A aprovação da suíte core
  não garante números arbitrários, qualquer dialeto, toda extensão ou conformidade
  integral. O manifesto de exclusões core está vazio e possui proteção de regressão.

### Exemplo do registro e do perfil

```typescript
validarValor({ $ref: 'https://schemas.example/tipos#/$defs/codigo' }, 42, {
  formatos: 'anotacao',
  recursos: {
    'https://schemas.example/tipos': { $defs: { codigo: { type: 'integer' } } },
  },
});
```

A API `lerDocumentoSchema(texto, perfil)` também aceita esse registro. A interface
atual mantém o comportamento de produto e usa recursos incorporados no schema;
não há carregamento por URL nem seletor de registro externo no formulário.

## Presença, vazio, nulo e visibilidade

`required` exige que a chave exista, sem impedir `""`. `minLength: 1` proíbe o texto vazio.
`null` é um valor distinto: precisa ser aceito pelo contrato e ainda conta como presença.
O seletor Preenchimento oferece Não informar somente para campos opcionais; isso remove
a chave. Nulo mantém a chave com `null`. Preencher cria um valor editável do tipo escolhido.

Ao marcar texto obrigatório no Builder, a convenção de autoria pode criar `minLength: 1`,
exceto com `x-ui.allowEmpty`. Essa convenção não faz parte da semântica de `required` e
não é aplicada silenciosamente a schemas importados ao editar outros atributos.

`x-ui.visible` é extensão de apresentação. Na Construção, ocultar exige que a origem
aceite `null` em todas as restrições, inclusive enum/const/not. O ramo oculto recebe
`type: "null"`; o visível usa o tipo não nulo da origem. Limites de texto, números,
objetos e listas são preservados na origem. Campos obrigatórios não podem ser ocultados.
O renderer atribui `null` ao campo quando esse ramo explícito é ativado, descartando o
valor anterior. A reconciliação é recursiva para objetos e itens de listas, sem modificar
o documento. O editor de valores JSON continua validando exatamente o payload digitado,
sem corrigir silenciosamente seus dados.

Schemas técnicos antigos que apenas ocultam visualmente mantêm os valores e a validação
integral. Não há migração automática nem bloqueio geral por nulabilidade: a validação fica no
atributo da condição, com aviso e controle de ocultação desabilitado quando necessário.
Um atributo já oculto pode ser tornado visível para corrigir a configuração. Campos introduzidos exclusivamente por um ramo desativado
continuam sendo removidos pela reconciliação. Um ramo ativo que exige o campo deve mantê-lo
visível; tipos/restrições incompatíveis de condições simultâneas continuam produzindo erros
de contrato, sem ignorar validações. O aviso de conflitos é conservador e não prova
satisfatibilidade de contratos arbitrários.

## Anotações e formatos

- `format`: formatos conhecidos de `ajv-formats` são assertions neste produto, embora
  o vocabulário padrão da especificação trate `format` como annotation. Tipos de controle
  para email, data/hora e senha são adaptações de UI. Formatos desconhecidos não recebem
  um validador específico; são preservados. `password` é uma convenção de apresentação.
- `default`: sugere o valor inicial e é copiado ao iniciar campos; o validador não usa
  `useDefaults`, não preenche dados nem muda o payload. Um default inválido continua
  inválido quando usado. `examples` fornece exemplos/dicas; não cria uma restrição.
- `readOnly`: desabilita controles e troca de preenchimento no formulário. O validador
  não proíbe dados recebidos por JSON; a anotação é preservada na exportação.
- `writeOnly`: aparece como anotação; não remove o valor do payload nem da resposta.
  `format: password` é o controle que mascara texto. Não há filtragem automática de saída.
- `title`/`description`: rótulos e dicas. `deprecated`: preservado, sem regra de validação
  ou destaque dedicado. `$comment`: preservado sem apresentação.
- `x-ui.visible`: visibilidade dos ramos; `x-ui.allowEmpty`: convenção de autoria de texto;
  `x-ui.groups`: agrupamento; `x-ui.widget`: list/checkboxes/multiselect;
  `x-ui.options`: rótulos de opções; `x-ui.savedOptions`: estado de opções do editor.
  `x-enumLabels` associa rótulos aos índices do enum. Extensões não mudam a validação padrão.

## Matriz por keyword

Legenda: **sim** = suportado no perfil descrito; **parcial** = subconjunto/limites explícitos;
**annotation** = sem assertion; **JSON** = edição pela aba Para Dev. Todas as keywords
listadas são preservadas na edição JSON; raiz booleana possui política própria abaixo.
Uma linha com várias keywords se aplica individualmente a cada uma.

| Keyword                                                | Validação                                                           | Renderer                                                        | Edição guiada                              | Edição JSON |
| ------------------------------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------ | ----------- |
| `$schema`                                              | Draft 2020-12 e metaschemas registrados com vocabulários conhecidos | Sem controle                                                    | Não                                        | Sim         |
| `$vocabulary`                                          | Vocabulários conhecidos; obrigatório desconhecido é recusado        | Sem controle                                                    | Não                                        | Sim         |
| `$id`                                                  | Bases e IDs de recursos incorporados/registrados                    | Resolve recursos                                                | Não                                        | Sim         |
| `$anchor`                                              | Anchors por recurso, com detecção de duplicação                     | Resolve anchors                                                 | Não                                        | Sim         |
| `$ref`                                                 | Casos core oficiais aprovados, incluindo URNs e registro offline    | Resolve; ciclo/ausência usa JSON com aviso                      | Renomeação preserva referências suportadas | Sim         |
| `$dynamicAnchor`                                       | Escopo dinâmico; casos core oficiais aprovados                      | Indexado; contratos com dynamicRef usam JSON                    | Não                                        | Sim         |
| `$dynamicRef`                                          | Escopo dinâmico; casos core oficiais aprovados                      | JSON com aviso                                                  | Não                                        | Sim         |
| `$defs`                                                | Sim                                                                 | Reutiliza definições                                            | Não                                        | Sim         |
| `$comment`                                             | Annotation                                                          | Sem controle                                                    | Não                                        | Sim         |
| `type`                                                 | Sim                                                                 | Texto, inteiro, decimal, booleano, objeto, lista, null e uniões | Tipos e uniões no perfil do editor         | Sim         |
| `enum`                                                 | Sim                                                                 | Select; valores mantêm o tipo JSON                              | Sim                                        | Sim         |
| `const`                                                | Sim                                                                 | Valor constante/select                                          | Comparações em regras                      | Sim         |
| `multipleOf`                                           | Divisibilidade decimal, precisão da entrada limitada a Number       | Step numérico                                                   | Sim                                        | Sim         |
| `minimum`, `maximum`                                   | Sim                                                                 | Controles numéricos e erros                                     | Sim                                        | Sim         |
| `exclusiveMinimum`, `exclusiveMaximum`                 | Sim                                                                 | Validação, sem garantia HTML equivalente                        | Sim                                        | Sim         |
| `minLength`, `maxLength`                               | Sim                                                                 | Texto e validação                                               | Sim                                        | Sim         |
| `pattern`                                              | Regex ECMAScript                                                    | Texto e validação                                               | Sim                                        | Sim         |
| `format`                                               | Perfil configurável; format-assertion explícito prevalece           | Controles adaptados parcialmente                                | Formatos oferecidos no editor              | Sim         |
| `properties`                                           | Sim, incluindo chave própria `__proto__`                            | Campos nomeados                                                 | Sim                                        | Sim         |
| `required`                                             | Presença própria; não conta propriedades herdadas                   | Obrigatoriedade/visibilidade                                    | Sim                                        | Sim         |
| `minProperties`, `maxProperties`                       | Sim                                                                 | Limita inclusão/remoção e valida                                | Sim                                        | Sim         |
| `patternProperties`                                    | Sim                                                                 | Propriedades dinâmicas; combina padrões coincidentes            | Não — Para Dev                             | Sim         |
| `additionalProperties`                                 | Sim                                                                 | Campos dinâmicos/objeto fechado                                 | Sim                                        | Sim         |
| `propertyNames`                                        | Sim                                                                 | Valida chaves                                                   | Não — Para Dev                             | Sim         |
| `dependentRequired`                                    | Sim                                                                 | Recalcula obrigatoriedade                                       | Não — Para Dev                             | Sim         |
| `dependentSchemas`                                     | Sim                                                                 | Resolve condições do objeto                                     | Não — Para Dev                             | Sim         |
| `prefixItems`                                          | Sim                                                                 | Tuplas por posição                                              | Não — Para Dev                             | Sim         |
| `items`                                                | Sim                                                                 | Lista homogênea/restante da tupla                               | Sim                                        | Sim         |
| `minItems`, `maxItems`                                 | Sim                                                                 | Inclusão/remoção e validação                                    | Sim                                        | Sim         |
| `uniqueItems`                                          | Sim                                                                 | Diagnóstico de duplicação                                       | Sim                                        | Sim         |
| `contains`, `minContains`, `maxContains`               | Casos core oficiais aprovados, incluindo interações com unevaluated | Contagem e itens correspondentes                                | Não — Para Dev                             | Sim         |
| `allOf`                                                | Sim                                                                 | Interseção conservadora                                         | Múltiplas regras e grupos E                | Sim         |
| `anyOf`                                                | Sim                                                                 | Combinação conservadora das alternativas                        | Grupos OU no SE                            | Sim         |
| `oneOf`                                                | Sim                                                                 | Exclusividade, nenhuma/sobreposição, diagnóstico por opção      | Conjuntos de campos                        | Sim         |
| `not`                                                  | Sim                                                                 | Restrição/validação                                             | Negação, diferente e campos proibidos      | Sim         |
| `if`, `then`, `else`                                   | Sim                                                                 | Ramos e obrigatoriedade/visibilidade                            | SE simples, lista plana E/OU e ramos       | Sim         |
| `unevaluatedProperties`                                | Casos core oficiais aprovados, com orçamento explícito              | Propriedades dinâmicas conservadoras                            | Sem editor dedicado                        | Sim         |
| `unevaluatedItems`                                     | Casos core oficiais aprovados, com orçamento explícito              | Lista/tupla e validação                                         | Sem editor dedicado                        | Sim         |
| `title`, `description`                                 | Annotation                                                          | Rótulos e dicas                                                 | Sim                                        | Sim         |
| `default`                                              | Annotation, sem mutação na validação                                | Inicialização do campo                                          | Não — Para Dev                             | Sim         |
| `examples`                                             | Annotation                                                          | Dicas/candidatos em editores                                    | Sem editor dedicado                        | Sim         |
| `deprecated`                                           | Annotation                                                          | Sem destaque dedicado                                           | Não                                        | Sim         |
| `readOnly`                                             | Annotation                                                          | Desabilita edição guiada do valor                               | Não — Para Dev                             | Sim         |
| `writeOnly`                                            | Annotation                                                          | Identifica, sem remover dados                                   | Não — Para Dev                             | Sim         |
| `contentEncoding`, `contentMediaType`, `contentSchema` | Annotation, sem decodificação/assertion automática                  | JSON/texto, sem decodificador                                   | Não                                        | Sim         |
| `x-ui`, `x-enumLabels`                                 | Extensões ignoradas pelo validador padrão                           | Comportamentos descritos acima                                  | Parcial                                    | Sim         |
| Outras keywords/extensões                              | Preservadas; sem promessa de semântica                              | Sem promessa de controle                                        | Não                                        | Sim         |

Schemas booleanos são validados pelo motor em qualquer posição. O Studio exige objeto
na importação da raiz e explica os equivalentes `{}` e `{"not":{}}`; não converte silenciosamente.
Subschemas booleanos são preservados mesmo quando não possuem editor guiado específico.

## Evidências reproduzíveis

- `npm ci`: restaura as dependências do lockfile.
- `npm run check`: formatação, testes próprios/DOM + suíte oficial, tipos Angular e build.
- `npx playwright install chromium firefox webkit`: prepara o navegador de E2E.
- `npm run test:e2e`: Chromium, Firefox e WebKit; emulações iPhone/Android, servidor isolado na porta 4300.
- `npm run check:all`: executa as duas etapas. Relatório HTML em `playwright-report/`,
  traces de falhas e screenshots em `test-results/`; esses artefatos não são versionados.

Snapshot oficial: commit `55719286c33ae0d1823bfb65fea10338a19bc37c`, licença preservada.
São **1.302 casos core e quatro casos opcionais de format-assertion aprovados**, sem
exclusões, usando formatos como anotações e os recursos oficiais registrados offline.
A compilação precisa ser bem-sucedida inclusive quando o payload esperado é inválido.
A suíte verifica contagens fixas e impede introduzir exclusões silenciosamente. Os demais
arquivos optional permanecem preservados, mas não fazem parte dessa aprovação.

Há 30 E2E: cinco fluxos em seis perfis (Chromium desktop/iPhone, Firefox desktop,
WebKit desktop/iPhone e Chromium Android). São emulações e navegadores de teste,
não uma certificação de Safari/Chrome em hardware físico. O roteiro e o estado de
homologação estão em [HOMOLOGACAO.md](HOMOLOGACAO.md).

O CI executa `check:all` em PRs e no fluxo de publicação. O workflow de Pages não usa
mais `continue-on-error` para os testes do Studio e instala as dependências via `npm ci`.
O deploy depende do sucesso dessa etapa. Os workflows ficam em `.github/workflows`
na raiz do monorepositório; sua execução remota ocorre no próximo push/PR aplicável.

Referências: [Core 2020-12](https://json-schema.org/draft/2020-12/json-schema-core),
[Validation 2020-12](https://json-schema.org/draft/2020-12/json-schema-validation) e
[suíte oficial](https://github.com/json-schema-org/JSON-Schema-Test-Suite).
