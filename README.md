# Guideline Java — padrões de engenharia e Golden Platform

> **Estado vigente — 2026-10-20.** Este repositório reúne padrões de engenharia, governança, refinamentos e material de referência. Não é o código-fonte da Foundation nem do Workspace Service.

## Qual referência utilizar?

| Assunto | Fonte de verdade |
| --- | --- |
| Arquitetura executável do Workspace Service | [GoldenArchitectureTest](https://github.com/BrunoBS/account-service/blob/main/src/test/java/br/com/portalmanager/platform/workspace/GoldenArchitectureTest.java) e código da `main` |
| Contratos HTTP, regras de domínio e migrations | [workspace-service](https://github.com/BrunoBS/account-service) e [índice de documentação](https://github.com/BrunoBS/account-service/blob/main/docs/README.md) |
| Capabilities, APIs e configuração das libraries | [platform-libraries](https://github.com/BrunoBS/platform-libraries) e respectivos módulos |
| Parent Maven e BOM atuais | `platform-libraries/platform-parent`, `platform-libraries/platform-dependencies`, `platform-libraries/platform-libraries-bom` |
| Avaliação para Codex Skills | [Golden Reference Assessment](docs/skills/golden-reference-assessment.md) |
| Governança de trabalho e promoção | [Governança](docs/Governança/golden-governance-v1.md) |

## Baseline da Golden Reference (implementado)

- Java **25**, Spring Boot **4.1.1**, Maven **3.9.9+**.
- Parent: `br.com.portalmanager.platform.library:platform-parent:1.0.0`.
- BOM de capabilities importado separadamente: `br.com.portalmanager.platform.library:platform-libraries-bom:1.0.0`.
- Pacote raiz do serviço: `br.com.portalmanager.platform.workspace`.
- Zonas permitidas no Workspace Service: `config`, `foundation`, `core`, `feature` e `entrypoint`.
- Controllers REST em `entrypoint`; responsabilidades de domínio em `core` ou `feature`, conforme escopo.
- Organização interna por `domain`, `usecase`, `repository`, `facade` e `integration`, conforme responsabilidade. Não criar pacotes vazios por convenção.
- `foundation` não depende de `core`, `feature` ou `entrypoint`; `core` não depende de `feature` ou `entrypoint`; camadas internas não dependem de `entrypoint`.
- Endpoints recebem `AuthorizationContext`, segundo os testes de arquitetura atuais.
- `@AuthorizationRequired` controla autorização da operação; `@ResourceVisibility` controla visibilidade JPA da entidade, com exceções de compartilhamento explicitamente validadas.
- Validação estrutural de JSON por JSON Schema Draft 2020-12 quando aplicável; invariantes, lifecycle e permissão permanecem no domínio/caso de uso.
- Transações, locks e constraints são escolhidos por risco; schema físico é versionado via Flyway.
- Reutilizar `platform-testing-*`, `platform-messaging`, `platform-audit`, `platform-authorization` e demais capabilities conforme o caso.

## Como implementar

1. Consulte o código e os testes de arquitetura da `main` do serviço de referência.
2. Consulte o README e as APIs do módulo de `platform-libraries` que será utilizado.
3. Identifique os contratos de autorização, escopo, persistência e erros antes de codificar.
4. Preserve limites entre camadas; não coloque lógica de negócio em controllers.
5. Acrescente testes de domínio, HTTP, segurança, migrations e concorrência conforme risco.
6. Execute os gates disponíveis e reporte os resultados reais. Não declare sucesso sem executar.

## Distinção entre guia genérico e Golden

O modelo anterior de pastas `exception/shared/core/features/infra`, com `controller/service/repository/model` em cada feature, **não é a arquitetura mandatória da Golden Reference atual**. Também não é regra universal que um validador apenas retorne listas de erros: a Foundation oferece contratos de `ValidationResult` e exceptions padronizadas, conforme o contexto.

Essas orientações antigas foram substituídas nesta página para evitar geração de código incompatível. Padrões genéricos podem ser usados em outros projetos somente se o perfil arquitetural deles permitir.

## Documentação histórica

Os documentos versionados em `docs/refinamento/` (V1, V2, V3 etc.), propostas de features e POCs descrevem decisões ou hipóteses de suas épocas. **Não representam automaticamente comportamento implementado.** Para funcionalidades ainda não existentes no código, trate-os como propostas, não como APIs disponíveis.

## Compatibilidade e limites

O repositório [platform-build](https://github.com/BrunoBS/platform-build) mantém código histórico com coordenadas `com.empresa.platform`. **Não o utilize para configurar novos consumidores Golden**. A implementação vigente do parent está no `platform-libraries`.

Para inventário e riscos ainda abertos, consulte [a auditoria consolidada](docs/skills/golden-reference-assessment.md).
