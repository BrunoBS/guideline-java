# Homologação do Schema Studio

## Automatizada e executada

`npm run check:all` executa testes próprios/DOM, suíte oficial, tipos Angular,
build de produção e os E2E em `tests/e2e/schema-studio.spec.ts`.

| Perfil Playwright | Motor                        | Estado   |
| ----------------- | ---------------------------- | -------- |
| desktop           | Chromium                     | Aprovado |
| mobile            | Chromium, emulação iPhone 13 | Aprovado |
| firefox           | Firefox desktop              | Aprovado |
| webkit            | WebKit desktop               | Aprovado |
| webkit-mobile     | WebKit, emulação iPhone 13   | Aprovado |
| android           | Chromium, emulação Pixel 7   | Aprovado |

São onze fluxos por perfil, 66 E2E: JSON/erro de importação, E/OU e estruturas,
null/ausência e campos condicionais, edição JSON de referência dinâmica e
preservação de valores ocultos/validação da resposta. Os testes verificam overflow
horizontal do formulário e registram screenshots. Relatórios e traces ficam em
`playwright-report/` e `test-results/`. Inspecionar as capturas complementa as asserções;
não substitui uma auditoria de acessibilidade completa.

## CI e publicação

Na raiz do monorepositório:

- `.github/workflows/schema-renderer-check.yml`: verifica PRs e pushes da branch
  `feature/poc-schema-renderer`; publica relatórios de teste por sete dias.
- `.github/workflows/schema-renderer-pages.yml`: usa `npm ci`, instala os três motores
  e exige `npm run check:all` antes do build com base href e da publicação de Pages.

Não há `continue-on-error` na validação do Studio. Uma falha bloqueia a publicação.
A execução foi validada localmente; a execução no GitHub exige o próximo push/PR.
Nenhuma publicação foi realizada neste ciclo.

## Dispositivos reais — dependência externa

| Equipamento    | Navegador | Estado                                            |
| -------------- | --------- | ------------------------------------------------- |
| iPhone físico  | Safari    | Pendente: dispositivo/serviço não disponibilizado |
| Android físico | Chrome    | Pendente: dispositivo/serviço não disponibilizado |

WebKit do Playwright não é o aplicativo Safari, e emulação não é hardware físico.
O roteiro abaixo está preparado para quando houver um dispositivo ou serviço de teste:

1. Abrir uma URL de homologação da versão que contém estas alterações, acessível no dispositivo.
2. Repetir os onze fluxos da suíte E2E, incluindo colar JSON, formatar e corrigir JSON inválido.
3. Verificar teclado virtual, toque, selects nativos, scroll do modal e rotação da tela.
4. Alternar ausência/null, ativar o booleano da condição e conferir o campo obrigatório.
5. Conferir que ocultação com ramo nulo envia null para os seis tipos; schemas técnicos antigos preservam os valores e os erros de validação.
6. Registrar versão do sistema/navegador, orientação, resultado e capturas antes de marcar a aprovação.

Enquanto esse acesso não existir, a homologação em dispositivos reais permanece aberta.

## Revisão do perfil de negócio — 19/10/2026

- `npm run check`: 1.609 testes aprovados, zero falhas/omissões; formatação, templates e build de produção aprovados.
- `npm run test:e2e`: 36 cenários aprovados, seis perfis de navegador.
- Novo fluxo: importar contrato com dependência, verificar aviso/motivos e controles desabilitados, abrir formulário, fechar com Escape, conferir JSON integral no Para Dev e desbloquear após remover a incompatibilidade.
- Capturas `construcao-bloqueada.png` inspecionadas em desktop e mobile; documentação dos limites disponível dentro da Construção.
- Testes unitários adicionais cobrem combinações/contextos, tipos, comparação incompatível, preservação, JSON inválido, campos anuláveis e bloqueio de mutações programáticas.

Logs locais: `/private/tmp/schema-design-revisao.log` e `/private/tmp/schema-design-e2e-final.log`.
A aprovação acima usa navegadores e emulação do Playwright; não encerra os itens de hardware físico.

## Revisão visual da Construção e ajuda

`npm run check:all` aprovado com 1.616 testes, zero falhas/omissões, build de produção
e 48 E2E nos seis perfis. Condições ficam em linhas com conectores SE/E/OU;
Tipo da propriedade tem rótulo acima e seletor/botão alinhados independentemente
da etapa Regras. A ajuda foi reorganizada em campos, regras e uso de Para Dev,
com layout de duas colunas no desktop e uma no celular. Capturas
`condicoes-negocio.png`, `tipo-propriedade.png` e `ajuda-construcao.png` conferidas.

Logs: `/private/tmp/schema-layout-propriedade.log` e `/private/tmp/schema-css-ajuda.log`.
A homologação em hardware físico continua pendente conforme o roteiro acima.

## Objetos aninhados sem navegação

`npm run check:all` aprovado: 1.616 testes sem falhas/omissões, build de produção e
54 E2E em seis perfis. Cada objeto possui + Atributos no próprio card, incluindo
os níveis internos e listas de objetos. Não há botão Abrir atributos. Os testes
incluem adicionar um objeto dentro de outro e um campo no objeto interno, preservando
a estrutura exportada. Capturas `objetos-aninhados.png` conferidas em desktop e mobile.

Também validados: Atender/Adicionar na mesma barra, Excluir à esquerda,
Aplicar ao final da linha, atualização dos conectores E/OU, superfície branca
e seleção/foco azuis dos atributos. O cabeçalho acompanha o fluxo normal no celular.
Log: `/private/tmp/schema-inline-final.log`.

## Aplicação única do bloco Quando

`npm run check:all` aprovado: 1.621 testes sem falhas/omissões, build de produção e
54 E2E nos seis perfis. Há um único Aplicar condição no final de cada Quando.
Comparações, E/OU, inclusão/exclusão ficam em rascunho; erros impedem publicar
qualquer parte do bloco. Descartar mantém os ramos já salvos. Testes também cobrem
atualização externa do IF e exclusão de regras com predicados iguais.
O E2E compara o schema original durante a edição e confirma a publicação após aplicar.
Rodapé conferido nas capturas desktop/mobile `condicoes-negocio.png`.
Log: `/private/tmp/schema-quando-atomico-check.log`.

## Ocultação consistente com o contrato

- Testes próprios/DOM verificam os seis tipos: nulabilidade completa, enums, comparações,
  limites, obrigatoriedade, objetos internos, listas e preservação do schema de origem.
- A validação de ocultação fica no atributo: tooltip e aviso local, sem bloquear cadastro
  ou edição geral. Campos já ocultos podem ser tornados visíveis para corrigir a configuração.
- O ramo visível usa o tipo não nulo; o oculto usa `type: "null"`. A resposta normalizada
  envia null, descartando o valor anterior. O modo JSON continua validando o documento digitado.
- O novo E2E alterna a condição com seis campos preenchidos e verifica a resposta nula
  e a ausência dos controles ocultos, mantendo a cobertura de schemas técnicos antigos.

- Novo fluxo adicional: importar ocultação sem null na origem, manter Construção e cadastro
  disponíveis, mostrar aviso no atributo e permitir corrigir sua visibilidade.

## Organização das etapas e navegação

O fluxo de atributos também verifica o título abaixo do indicador de etapas e os
dois botões no rodapé, alinhados à esquerda/direita. Confere os estados desativados
na primeira/segunda etapa e a navegação de ida e volta nos seis perfis.

Validação: 1.645 testes próprios/DOM e oficiais, build e 66 E2E aprovados.
O ajuste final de largura do rodapé foi verificado novamente nos seis perfis, com
seis cenários aprovados e capturas desktop/mobile inspecionadas.
