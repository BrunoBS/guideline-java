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

São cinco fluxos por perfil, 30 E2E: JSON/erro de importação, E/OU e estruturas,
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
2. Repetir os cinco fluxos da suíte E2E, incluindo colar JSON, formatar e corrigir JSON inválido.
3. Verificar teclado virtual, toque, selects nativos, scroll do modal e rotação da tela.
4. Alternar ausência/null, ativar o booleano da condição e conferir o campo obrigatório.
5. Conferir que valores ocultos de origem permanecem na resposta e que dados inválidos mostram erros.
6. Registrar versão do sistema/navegador, orientação, resultado e capturas antes de marcar a aprovação.

Enquanto esse acesso não existir, a homologação em dispositivos reais permanece aberta.
