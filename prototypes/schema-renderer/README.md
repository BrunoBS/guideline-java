# Schema Renderer

Aplicação Angular standalone para construir contratos JSON Schema Draft 2020-12,
gerar formulários e validar o JSON resultante com Ajv. Funciona no navegador, sem
backend, chamadas HTTP ou persistência dos documentos.

## Desenvolvimento

Use Node.js 22.12+ (linha 22 LTS) e npm. As versões aceitas estão em `package.json`.

```bash
npm ci
npm start
```

Abra <http://localhost:4200>. O servidor de desenvolvimento escuta apenas na máquina
local; para acesso pela rede, use `npm start -- --host 0.0.0.0` explicitamente.

```bash
npm test                   # regressões do motor, editores e integração Angular/DOM
npm run typecheck          # TypeScript e templates Angular em modo estrito
npm run build:development  # build sem otimização, com source maps
npm run format             # formatação de código, HTML e CSS
npm run check              # formatação, testes, typecheck e build de produção
```

Use `npm ci` no CI e versione `package-lock.json` para instalações reproduzíveis.
Os testes usam o runner do Node com tsx; não dependem de serviços externos.

## Edição de contratos no Schema Studio

A aba **Construção** concentra a montagem visual dos campos e regras. Para
colar ou editar um contrato JSON Schema, use a aba **Para Dev**, com o editor
ocupando toda a largura disponível. Para testar os campos, use o botão
**Visualizar formulário**, que abre o formulário em um modal. Não há prévia
lateral em Para Dev nem formulário de importação separado na aba Construção.

### Limites da Construção

- Raiz do tipo objeto; campos de texto, inteiro, decimal, booleano, objeto e listas homogêneas. Campos podem aceitar também `null`.
- Validações básicas e enums de texto/número. Listas de objetos permitem editar seus campos; restrições avançadas dos itens exigem Para Dev.
- Condições SE / ENTÃO / SENÃO com operadores guiados, E/OU em uma lista plana e comparações nos ramos; oneOf por conjuntos de campos, adicionados diretamente. Para condicionar campos por valor, use Quando / Então / Caso contrário; oneOf por valor importado é preservado e editado no Para Dev.
- Referências, dependências, propriedades por padrão, tuplas, uniões de vários tipos, interseções gerais e recursos sem controle visual bloqueiam a edição da Construção.

O aviso **Edição visual indisponível** explica os motivos e seus caminhos no schema.
Adicionar, remover, reordenar ou configurar campos/regras fica desabilitado para
preservar o documento integral. Visualizar formulário, consultar/exportar schema e
Para Dev permanecem disponíveis. A correção no Para Dev desbloqueia automaticamente
a Construção. Um JSON inválido também bloqueia a edição visual do último documento válido.
O perfil é verificado por contexto e combinação de regras, não apenas pelo nome da keyword.

**Renderizar é uma capacidade separada de construir.** Um schema fora desse perfil
pode continuar gerando controles e sendo validado pelo contrato original. Referências
dinâmicas e limites de expansão têm fallback JSON com aviso. Não há garantia de
converter qualquer schema complexo em controles convencionais; referências externas
precisam estar incorporadas ou registradas offline. Consulte a
[cobertura e os limites](docs/COMPATIBILIDADE-JSON-SCHEMA.md).

Nos objetos e nas listas de objetos, **+ Atributos** abre um seletor compacto apenas
quando necessário. Ele oferece os seis tipos, incluindo Objeto e Lista. Após
adicionar, o seletor se recolhe. Os campos de objetos aninhados aparecem dentro
do próprio card, com **+ Atributos** em cada nível, sem botão de navegação.
Isso cria estruturas finitas; schemas autorreferentes por
`$ref` continuam no Para Dev.

Em condições compostas, **Adicionar condição** fica ao lado de **Atender**,
**Excluir** à esquerda de cada linha e um único **Aplicar condição** no final do bloco
**Quando**. Campo, operador, valor, E/OU e inclusão/exclusão de linhas ficam em rascunho.
O formulário, a visualização e a exportação do schema continuam usando a última regra
aplicada. Aplicar valida o bloco inteiro e salva todas as comparações de uma vez;
um erro mantém a regra anterior. **Descartar alterações** restaura apenas o IF,
preservando mudanças já salvas em Então/Caso contrário. A troca de Atender atualiza
os conectores imediatamente, sem publicar o rascunho.
Primitivos e objetos usam fundo branco, seleção com contorno azul e foco azul;
o hover dos atributos internos não herda o fundo laranja dos botões globais.

A seção **O que posso criar na Construção?** organiza a orientação em **Campos e
validações**, **Regras de negócio** e **Quando usar o Para Dev**, com um exemplo de
aprovação. Ela explica o bloqueio e a preservação do documento. Seus estilos e os
dos avisos de compatibilidade ficam em `features/builder/construcao-ajuda.css`;
os estilos do layout da Construção permanecem em `schema-builder.component.css`.

Em **Para Dev**, **Validar JSON** verifica a sintaxe e o contrato com Ajv;
**Formatar JSON** aplica indentação de dois espaços a um contrato válido.
Esses botões preservam os valores preenchidos no formulário. Se o conteúdo for
inválido, o texto é mantido para correção e a mensagem de erro aparece no editor.
O botão **Visualizar formulário** continua usando o último schema válido.

O exemplo **45. Compatibilidade de tipos · SE/ENTÃO e valores proibidos** está
no catálogo do renderer. O contrato ajustado fica em
[`src/app/data/environment-type-compatibility.schema.json`](src/app/data/environment-type-compatibility.schema.json)
e também pode ser colado em **Para Dev**. Cada `if` exige `parentTypeCode`,
preservando a regra de pai e filho diferentes sem ativar condições antes do
preenchimento do pai. `campo` continua sendo um inteiro opcional.

## Organização

```text
src/app/
  app.component.{ts,html,css}       # navegação e estado da sessão
  core/schema/
    schema-engine.ts               # API pública do motor
    tipos-schema.ts                # tipos, nulabilidade e compatibilidade
    referencias-schema.ts          # resolução de referências locais
    combinacao-schemas.ts          # interseção de contratos
    resolucao-schema.ts            # condições e alternativas aplicáveis
    estrutura-schema.ts            # propriedades dinâmicas e itens
    valores-iniciais.ts            # criação do payload inicial
    reconciliacao-valores.ts       # ajuste do payload após mudanças
    validacao-schema.ts            # validação e mensagens de erro
    schema-validator.ts            # parser, Ajv e cache de validadores
    caminhos-json.ts               # segmentos JSON Pointer
    json-value.ts                  # igualdade estrutural de valores JSON
  data/                            # exemplos de contratos
  features/
    builder/
      schema-builder.component.*   # interação, seleção e confirmação do rascunho
      contexto-editor.ts           # acesso explícito dos editores à sessão
      editor-propriedades.ts       # renomear e excluir propriedades
      editor-validacoes.ts         # limites, formatos, enum e regras avançadas
      estrutura-builder.ts         # árvore de nós e navegação por caminhos
      restricoes-texto.ts           # política de texto obrigatório do builder
      valores-permitidos.ts        # conversão de valores de enum
      transferencia-schema.ts      # clipboard e download
    regras/
      condicoes/
        editor-condicoes.component.*    # interface SE / ENTÃO / SENÃO
        edicao-condicoes.ts              # criação e manutenção das condições
      alternativas/
        editor-alternativas.component.* # interface de alternativas exclusivas
        edicao-alternativas.ts           # criação e manutenção de oneOf
      compartilhado/
        contexto-regra.ts                # contrato mínimo de edição de regras
        editor-regra-base.ts             # entradas e eventos comuns
        editor-regra.css                 # apresentação comum dos cartões
    campos/
      catalogo-campos.ts            # catálogo e criação dos seis tipos de campo
      texto/
        definicao-texto.ts         # contrato inicial e identificação na paleta
        editor-texto.component.*   # formato, tamanho, pattern e texto vazio
        campo-texto.component.*    # preenchimento de texto e formatos
      numero/                      # editor e controle compartilhados por Inteiro/Decimal
      booleano/                    # editor e controle Sim / Não
      objeto/                      # propriedades fixas/dinâmicas e filhos recursivos
      lista/
        editor-lista.component.*   # configuração de itens e opções
        campo-lista.component.*    # itens, seleção múltipla e filhos recursivos
        edicao-lista.ts            # alterações das regras no rascunho
        configuracao-lista.ts      # leitura compartilhada da configuração
      compartilhado/
        definicao-campo.ts         # contrato das definições de campo
        campo-base.ts              # entradas, eventos, nulo e mensagens comuns
        editor-campo-base.ts       # entradas e eventos comuns dos editores
        alteracao-campo.ts         # comandos tipados aplicados pelo builder
        contexto-campo-filho.ts    # contrato do template de recursão
        editor-campo.css           # estilos comuns, limitados ao construtor
    renderer/field/
      field.component.*            # escolhe o controle e coordena a recursão
      formatacao-campos.ts          # formatos, exemplos e conversão de datas
```

As funções da aplicação usam português sem acentos nos identificadores, por
exemplo `ajustarValorAoSchema`, `resolverSchemaDoCampo` e
`renomearPropriedadeSelecionada`. Nomes do Angular e keywords JSON Schema
permanecem no padrão original (`ngOnChanges`, `required`, `properties`).

Cada pasta em `campos` reúne a definição inicial, o editor de configuração e o
controle de preenchimento daquele tipo. Inteiro e Decimal compartilham `numero`.
A paleta e a criação de propriedades usam o mesmo catálogo; uma definição retorna
um schema novo a cada chamada, sem estruturas mutáveis compartilhadas.

Os componentes `editor-*.component` recebem o schema e emitem comandos tipados.
Eles não recebem o componente pai nem modificam diretamente a sessão. O builder
aplica esses comandos pelos editores de domínio e pelo `ContextoEditor`,
preservando o fluxo único de cópia, regras, árvore e emissão. Enquanto o modal
está aberto, alterações ficam no rascunho; cancelar descarta o rascunho e salvar
emite o contrato uma vez. Título, descrição, obrigatoriedade e enum continuam
compartilhados.

`EditorQuandoComponent` mantém uma sessão de rascunho por regra. Ele reaproveita o
editor de domínio sobre uma cópia do documento e coleta as comparações antes de emitir
uma única alteração do IF. Identidades estáveis impedem que excluir uma regra transfira
seu rascunho para a regra seguinte. Mudanças nos ramos preservam o rascunho; uma nova
versão externa do IF reinicia a sessão.

As regras têm componentes de configuração e lógica de edição separados em
`regras/condicoes` e `regras/alternativas`. Seus componentes recebem `schema` e
`caminhoObjeto`, emitem a intenção de alteração pelo evento `alteracao` e
comunicam mensagens pelo evento `erro`. O builder aplica a função de edição
sobre uma cópia do contrato pelo mesmo fluxo de commit usado pelos campos.
`ContextoRegra` mantém a lógica independente do componente pai e só expõe as
operações necessárias à edição de regras. Os estilos dos cartões ficam junto
das regras e são limitados ao ancestral `.builder`.

Condições e alternativas restringem outros campos. A interpretação das regras
continua em `core/schema/resolucao-schema.ts`, e a validação completa continua
com o motor de validação; os componentes das regras cuidam da configuração visual.

Os componentes `campo-*.component` recebem schema, valor e metadados, e emitem
`valueChange`. `FieldComponent` escolhe qual renderizador usar e mantém os
controles comuns de tipo, alternativas, nulabilidade e valores permitidos.
Objeto e Lista recebem um `TemplateRef` de campo filho; esse template instancia
novamente o dispatcher. Eles não importam `FieldComponent` nem uns aos outros,
evitando dependências circulares.

Mantenha regras de JSON Schema em `core/schema` e formatação dos controles em
`formatacao-campos.ts`. Os estilos compartilhados do construtor são carregados
junto do builder e limitados ao ancestral `.builder`; isso permite estilizar os
novos componentes filhos sem aplicar essas regras no renderer.

Os módulos internos do motor importam uns aos outros diretamente; os componentes
consomem a API pública de `schema-engine.ts`. Isso mantém as dependências em uma
direção e evita um motor monolítico. Templates e estilos ficam junto dos
componentes, e o builder é carregado sob demanda com `@defer`.

O motor combina Ajv para restrições básicas com avaliação de aplicadores, referências e anotações do documento completo. A resolução usada para
apresentar campos é heurística e não deve ser usada como validação de servidor.
O cache LRU armazena até 100 contratos, usa snapshots para suportar mutações e
permite editar documentos que reutilizam o mesmo `$id`.

## Apresentação das restrições condicionais

ENTÃO e SENÃO usam um único editor de **Comparação**, com **Igual a**, **Diferente de**
e **Sem comparação** para todos os tipos. Texto também oferece **Contém**, **Não
contém**, **Começa com**, **Não começa com**, **Termina com** e **Não termina com**.
O valor fica desativado em **Sem comparação**. Campos com enum oferecem seleção;
booleanos usam liga/desliga, números usam entrada numérica, objetos e listas usam
JSON. Use **Aplicar restrição** para salvar a comparação.

Mínimo e máximo são configurados apenas no **campo de origem** e continuam valendo
nas condições, inclusive ao escolher **Igual a**. A condicional oferece comparação,
visibilidade e obrigatoriedade, sem controles para editar limites. Um valor exato
que não atende às validações da origem é rejeitado; comparações de texto também
respeitam o tamanho máximo do campo.

Limites que já existam em ramos de schemas importados são preservados e podem ser
consultados em **Ver restrições do campo**; sua edição continua disponível em
**Para dev**. Aplicar ou remover uma comparação não apaga esses limites.
Comparações avançadas ou combinadas importadas também são preservadas e continuam
editáveis pela aba Para dev. Obrigatoriedade, visibilidade e outras validações são
preservadas ao aplicar a comparação.

No **SE (IF)**, um campo booleano apresenta um controle liga/desliga em
**Valor esperado**, com **Sim (ligado)** e **Não (desligado)**. A escolha grava
`true` ou `false` no schema, inclusive com o operador **É diferente de** e com
tipos booleanos que também permitem `null`. Outros tipos mantêm seu controle de valor.

Cada ramo tem um único seletor **Adicionar campo ao ramo**. O campo entra visível
e opcional quando não há obrigatoriedade na origem, sem alterar o `required` global.
A inclusão mantém o campo visível também no outro ramo, até configurar explicitamente
sua ocultação. **Visível neste ramo** e **Obrigatório neste ramo** são controles separados.
Campos obrigatórios na origem ou no ramo precisam permanecer visíveis. Campos obrigatórios
na origem têm os dois controles desativados, com tooltip explicativo.

Para ocultar um campo, a definição completa da origem precisa aceitar `null`: habilite
**Permitir nulo**; quando houver enum, esse controle sincroniza também `null` nos valores permitidos, preservando os rótulos. Uma comparação
que rejeite `null` precisa ser removida antes de ocultar. O controle fica desativado com
tooltip quando a origem ou a obrigatoriedade impedem a ação. Comparações ficam indisponíveis
no ramo oculto. Isso vale para texto, inteiro, decimal, booleano, objeto e lista.

Para **SE precisa de aprovação → justificativa obrigatória e visível**, configure a origem
como `type: ["string", "null"]`, mantendo `minLength` e `maxLength`. Adicione `justificativa`
em Então e marque **Obrigatório neste ramo**. Em Caso contrário, desative **Visível neste ramo**.
A Construção gera `type: "string"` no ramo visível e `type: "null"` no oculto, com
`x-ui.visible` em ambos. Os limites continuam definidos na origem e valem para os valores
do tipo correspondente. Objetos nulos não precisam preencher seus filhos; listas nulas
não precisam cumprir `minItems`.

O renderer substitui o valor por `null` ao ativar esse ramo oculto, inclusive em objetos
internos e itens de listas. O valor anterior é descartado. Ao reaparecer, o campo precisa
ser preenchido novamente; o controle não oferece `null` quando o ramo exige valor não nulo.
A validação acontece no atributo da condição: ela não bloqueia o cadastro nem a edição geral da Construção.

`x-ui.visible` continua sendo uma anotação visual: quem impõe o tipo é o JSON Schema gerado.
Schemas técnicos antigos com apenas visibilidade preservam os valores e seguem a validação
integral do contrato; não são migrados silenciosamente. Importações com ocultação incompatível permanecem editáveis na Construção: o aviso aparece
no atributo, e o controle impede apenas uma nova ocultação incompatível. Um campo já oculto
pode ser tornado visível para corrigir a configuração.
Schemas antigos sem essa anotação mantêm a visibilidade baseada no `required` condicional.
Restrições de valor ou texto isoladas em schemas importados não ocultam campos.

As comparações de texto diferenciam maiúsculas e minúsculas e tratam os caracteres
especiais como texto literal. O padrão é gerado em `pattern`. Uma nova comparação
simples substitui a comparação simples anterior em vez de acumular seletores.

O editor também mostra as restrições de cada propriedade em ENTÃO e SENÃO,
além da obrigatoriedade naquele ramo. Por exemplo, `not: { const: "DEFAULT" }`
aparece como **Não pode ser igual a "DEFAULT"**. A opção **Ver restrições do
campo** permite consultar o JSON exato; regras importadas são preservadas.

Nos seletores de valores permitidos, opções incompatíveis com o schema efetivo
do campo ficam desabilitadas. Alterar o campo que controla uma condição recalcula
essas opções. Um valor já selecionado que se torne inválido é preservado para
correção e continua sujeito à validação do contrato completo.

Em JSON Schema, `if` com apenas `properties` também pode ser satisfeito quando a
propriedade não existe. Para exigir sua presença na condição, inclua `required`
dentro de `if`. A obrigatoriedade na raiz continua válida, mas não altera essa
avaliação isolada durante a edição de um payload incompleto. O renderer preserva
o contrato recebido e combina as negações de todos os ramos aplicáveis.

## Alternativas exclusivas (oneOf)

**Por conjunto de campos** separa alternativas por campos exigidos e proibidos.
A criação usa dois campos opcionais na origem, exigindo um e proibindo o outro em
cada alternativa. São necessários pelo menos dois campos opcionais para iniciar.
Os campos obrigatórios na origem continuam obrigatórios em todas as alternativas
e não podem ser proibidos nem ter sua obrigatoriedade removida pelo editor de regras.
Também não é permitido exigir e proibir o mesmo campo em uma alternativa.

**Por valor de um campo** é um formato técnico de `oneOf`, disponível por JSON
na aba Para Dev. Schemas importados nesse formato são preservados e bloqueiam a
edição na Construção. Para mostrar ou exigir campos conforme um valor, como EMAIL
ou SMS, use Quando / Então / Caso contrário na Construção. O renderizador e a
validação continuam processando alternativas por valor.

As operações de criar, editar, adicionar e remover alternativas usam o objeto
selecionado, incluindo objetos internos e objetos em itens de listas, preservando
as regras dos outros níveis. Regras `not` avançadas importadas permanecem preservadas
e precisam ser editadas pela aba Para dev. O payload completo continua sujeito à
validação do contrato: exatamente uma alternativa deve ser satisfeita.

## Build e publicação

```bash
npm ci
npm run check
```

Publique o conteúdo de `dist/schema-renderer-poc/browser/` em um servidor estático
com HTTPS. `npm start` é destinado ao desenvolvimento. Nenhuma publicação é feita
por estes comandos.

O build de produção usa otimização, nomes de arquivos com hash, extração de
licenças e desativa source maps. Os orçamentos são de 750 kB/1 MB para o bundle
inicial e 45 kB/50 kB por estilo de componente (aviso/erro). O limite de CSS atual
acomoda o editor visual; não aumente os limites automaticamente ao adicionar recursos.
Ajv e ajv-formats são dependências CommonJS aceitas explicitamente na configuração.

No servidor de hospedagem:

- Sirva arquivos com o MIME correto e HTTPS (necessário também para clipboard).
- Use cache longo com `immutable` nos assets com hash; revalide `index.html`.
- Se hospedar em um subdiretório, gere o build com
  `npm run build -- --base-href /seu-caminho/`.
- Preserve os arquivos de licenças gerados pelo build.

Valide a política CSP do ambiente: o Ajv compila contratos em runtime com geração
de funções e exige permissão equivalente a `unsafe-eval`. Ambientes que proíbem
isso precisam de uma estratégia diferente, como contratos precompilados ou
validação em serviço separado. Não adicione `unsafe-eval` indiscriminadamente.

## Suporte e limites

Suporta tipos primitivos, enum, objetos, arrays, `$ref` local, `oneOf`, `anyOf`,
`allOf` e `if/then/else`, com interpretação conservadora. Estruturas ambíguas
continuam editáveis como JSON. Referências a recursos internos e anchors locais são resolvidas; referências remotas não são baixadas e a resolução
recursiva tem limites de profundidade. O editor visual aceita documentos cuja
raiz é um objeto; o motor também valida boolean schemas.

Contratos extremamente grandes ou expressões regulares custosas podem bloquear
a thread do navegador. Use contratos de fontes confiáveis; importação pública de
schemas não confiáveis exige isolamento e limites de execução adicionais.

Antes de liberar no seu ambiente, faça homologação dos contratos reais e dos
fluxos de importação, edição, preview, validação e exportação. Os testes atuais
cobrem o domínio, os controladores, a formatação e a integração dos templates
Angular em jsdom; não substituem uma suíte E2E de interface nem homologação da
infraestrutura de destino.

Os testes `componentes-campos.dom.test.ts` renderizam os templates reais com
Angular TestBed e jsdom. Exercitam os eventos dos controles, a recursão de objetos
e listas, nulabilidade, alternativas, erros, Salvar/Cancelar e criação, edição
e exclusão de regras SE/ENTÃO/SENÃO e oneOf. Essa suíte ignora
CSS e não substitui uma verificação visual em navegador.

## Acompanhamento de compatibilidade

Veja [PENDENCIAS-COMPATIBILIDADE.md](PENDENCIAS-COMPATIBILIDADE.md) para as prioridades,
os itens implementados e suas evidências de validação. O checklist diferencia
correções concluídas de ampliações ainda pendentes.

O SE oferece seleção para enum e preserva os tipos dos valores. Números inteiros
rejeitam frações; objetos e listas usam uma área de edição JSON, aplicada ao concluir a edição.
Campos com vários tipos declarados têm seleção de tipo, distinguindo `null` do
texto `"null"`. Enums preservam valores tipados mesmo quando seus rótulos coincidem.
O SE resolve referências locais por JSON Pointer e bloqueia mudanças quando a
referência não pode ser resolvida. Ao criar uma condição ou trocar seu campo,
o editor escolhe um candidato validado pela origem. Se não encontrar, solicita
um exemplo ou default válido e preserva o contrato.
Condições importadas complexas ficam protegidas contra edição simplificada do SE,
com orientação para usar Para Dev. Regras if/else sem then também são listadas.
A edição simples preserva anotações e a presença ou ausência de required do if.
Limites de propriedades podem ser configurados em objetos fechados e não são
apagados ao alternar additionalProperties.

Ramos ENTÃO/SENÃO importados como schemas booleanos (`true` ou `false`) têm a
edição visual desabilitada e permanecem preservados ao editar o SE. Para mudar
seu significado, use Para Dev. A proteção também se aplica a propriedades
boolean schemas dentro dos ramos, evitando conversão implícita para objeto.

## Manutenção dos campos e operadores do SE

Renomear um campo atualiza seus usos nas regras do mesmo objeto e referências
locais por JSON Pointer. Colisões e exclusões que deixariam regras ou referências
quebradas são recusadas. A renomeação também atualiza regras de ancestrais sobre objetos internos e consumidores
de definições com `$id`/anchors. Referências dinâmicas e objetos com valores fixos
exigem ajuste explícito em Para Dev.

Além de igualdade/diferença, o SE oferece comparações numéricas e comparações
literais de texto. Está presente e Está ausente verificam a existência da
propriedade e não exibem valor esperado: `false`, `null`, `0` e `""` contam como
presença. Em **Quando**, escolha **Atender → Todas as condições (E)** ou
**Pelo menos uma condição (OU)** e use **+ Adicionar condição**. Os ramos são
apresentados como **Então** e **Caso contrário**. O editor recursivo permite incluir/remover condições e escolher
campos internos por caminho, como `/endereco/pais`. Os pais precisam existir para
a comparação ser atendida. Avisos destacam conflitos demonstráveis; sua ausência
não prova que um schema arbitrário é satisfatível.

## Estruturas avançadas e fechamento de P1–P3

A Construção é voltada à autoria de negócio. Dependências, padrões de propriedades,
tuplas, contains e outros recursos avançados são editados em JSON na aba **Para Dev**.
O bloco “Dependências e padrões do objeto selecionado” foi retirado da Construção.
Os componentes técnicos internos continuam preservados e testados, sem ampliar o
perfil de autoria visual exposto ao usuário.

A auditoria de preservação cobre os 45 exemplos do catálogo, além de fixtures com
recursos internos, regras avançadas e anotações desconhecidas. Editar uma descrição
não acrescenta mais limites a outros campos obrigatórios importados.

O renderer explica falhas por alternativa de oneOf e sobreposição entre opções.
A avaliação de unevaluatedItems acompanha os índices correspondentes a contains.
A apresentação continua conservadora; valide sempre o contrato completo.

O Studio exige que o documento schema seja um **objeto JSON**. O motor valida
schemas booleanos, mas importar `true`/`false` na raiz apresenta uma orientação:
use explicitamente `{}` para aceitar qualquer valor ou `{"not":{}}` para rejeitar
todos. O documento original nunca é convertido silenciosamente.

P1, P2 e P3 estão concluídos conforme os critérios e evidências do
[checklist](PENDENCIAS-COMPATIBILIDADE.md). O histórico de P4/P5 acompanha a ampliação
de referências, a suíte oficial e a homologação em navegador real.

## Consistência dos editores de regras

O SE simples e o composto compartilham o controle de valor por tipo. Enums mantêm
o tipo JSON original; booleanos usam liga/desliga; uniões oferecem seleção de tipo;
objetos/listas usam JSON. Entradas incompatíveis são recusadas antes de emitir a
comparação. Caminhos internos exigem que os pais sejam objetos, evitando que um
pai nulo satisfaça a condição.

No seletor **Atender**, **Todas as condições** exige que cada condição seja verdadeira;
**Pelo menos uma condição (OU)** exige apenas uma. A troca preserva as condições existentes.
**+ Adicionar condição** inclui outra linha, com os valores da anterior para edição.
As comparações ficam uma abaixo da outra, sem cards individuais: a primeira é
identificada por **SE** e as seguintes por **E** ou **OU**, conforme a combinação escolhida.

A Construção não oferece grupos aninhados, inversão da expressão nem consulta JSON
dentro da condição. Esses recursos ficam no **Para Dev**. Contratos importados que
precisam desses recursos são preservados e bloqueiam a edição visual, com aviso.
As comparações **É diferente de**, **Não contém** e **Está ausente** continuam
disponíveis. Um IF aceita uma comparação ou uma lista plana combinada por **E** ou **OU**.

Os testes dos componentes técnicos continuam cobrindo rascunhos e preservação
para uso interno. Na interface de negócio, esses recursos exigem **Para Dev**.

### Ausência e valor nulo no formulário

O seletor **Preenchimento** distingue três estados: **Não informar** remove a
propriedade opcional do payload, **Preencher** abre o controle do tipo do campo e
**Nulo (null)** mantém a propriedade com o valor JSON `null`. As opções respeitam
a obrigatoriedade e a aceitação de `null` pelo schema. Campos somente leitura
não permitem trocar o estado. O comportamento é compartilhado por texto, números,
booleanos, objetos, listas e valores JSON livres.

### Perfil de compatibilidade e homologação

A [matriz por keyword](docs/COMPATIBILIDADE-JSON-SCHEMA.md) descreve referências,
limites de recursão, presença/null, visibilidade, anotações e os recursos disponíveis
em validação, renderer e edição. Documentos com referências dinâmicas usam edição
JSON com diagnóstico explícito; recursos externos precisam ser incorporados em `$defs`.

`npm run check` inclui os 1.302 casos core oficiais Draft 2020-12 e quatro opcionais
format-assertion em versão fixa, sem exclusões. O perfil da suíte usa formatos como
anotações e recursos registrados offline; o perfil padrão do produto continua validando
formatos conhecidos. Consulte a matriz para as diferenças entre validação e apresentação.

`npm run test:e2e` cobre Chromium, Firefox e WebKit em seis perfis desktop/móveis.
Prepare os navegadores com `npx playwright install chromium firefox webkit`.
`npm run check:all` reúne as validações e é obrigatório no CI e antes da publicação.
A [homologação](docs/HOMOLOGACAO.md) registra o que foi executado e o que ainda exige
um dispositivo físico. Não há declaração de conformidade integral com JSON Schema.

Na Construção, o título e a descrição ficam abaixo do indicador de etapas. O rodapé
sempre mostra Anterior à esquerda e Próximo à direita: Anterior fica desativado na
etapa Componentes e Próximo na etapa Regras e condições, inclusive em telas pequenas.
