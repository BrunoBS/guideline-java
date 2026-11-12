# Workspace MFE — Protótipo navegável

POC independente em Angular 22 com experiência visual **inspirada** em interfaces bancárias brasileiras (não utiliza marca, componentes proprietários ou credenciais reais do Itaú).

## Executar

```bash
cd workspace-mfe
npm install
npm start
```

Acesse http://localhost:4200.

## Jornadas simuladas

1. Home pública e comunicados.
2. Login Microsoft **visual e simulado**: informe qualquer e-mail de teste; nenhuma autenticação real ocorre.
3. Seleção de tipo MANAGER, ADMIN ou Catálogo.
4. Lista de contas e fallback para conta criada sem grupos; instrução para novo login.
5. Conta: Acessar, Configurar, Gerenciar (ações administrativas condicionais).
6. Acessar: carrossel de quatro indicadores, Ver todos, ambientes elegíveis com pendências.
7. Gerenciar: aplicações globais, ambientes, modais de cadastro e edição, tabelas paginadas (10).
8. Configuração de ambiente: campos obrigatórios e liberação somente após salvar.
9. Ambiente: Aplicações, Motor de promoção e Cadastro de MFEs (duas últimas áreas como placeholders).
10. Aplicação–ambiente: acesso bloqueado até configurar; opção de **copiar** dados de conta–ambiente, sem referência dinâmica.
11. Catálogo de features e tela simulada de MFE.

## Limitações intencionais

- Dados apenas em memória; reiniciar a página restaura o cenário inicial.
- A validação de JSON Schema é representada por campos obrigatórios, **sem engine real**.
- Sem BFF, Redis, Entra ID, grupos corporativos ou autorização real.
- Sem Native Federation: o protótipo representa Shell + Workspace + features em uma aplicação standalone para validar UX.
- O catálogo de ambientes simula a visão de elegibilidade equivalente a um LEFT JOIN com account_environment.
- Indicadores e dados de promoção são ilustrativos.
- Em produção, autenticação, autorização, vínculos e validação são responsabilidades do backend.

## Evolução

Separar Shell, Workspace MFE e remotes via Native Federation; substituir mocks por contratos do BFF; integrar o renderizador JSON Schema e o design system corporativo licenciado.
