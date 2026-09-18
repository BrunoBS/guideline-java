# Configuration Platform — Protótipo V1

Protótipo estático e navegável da jornada inicial do portal.

## Como executar

Não exige instalação:
1. Abra `index.html` no navegador.

Para servir localmente (opcional):
```bash
python3 -m http.server 8080
```
Depois acesse `http://localhost:8080`.

## Fluxo implementado
Login conceitual → Tipo de acesso → Contas Manager → Conta → Ambientes → Recursos → Aplicações.

Inclui breadcrumbs progressivos, cards responsivos, busca de contas, ambientes default/personalizado, estados configurado/pendente, aplicações Java/Go/.NET e modais ilustrativos para criação/configuração e herança.
