# Inventário documental multi-repositório — 2026-10-20

Este inventário enumera arquivos Markdown/MDX/AsciiDoc presentes nas árvores `main` de `account-service`, `guideline-java`, `platform-libraries` e `platform-build`. **Classificação por função e localização, não homologação linha a linha.** O conteúdo dos arquivos históricos não foi automaticamente reescrito; a fonte vigente está identificada nos READMEs e baselines.

Critério de precedência: código, POM, migrations e testes de arquitetura atuais → documentação de implementação do mesmo commit → ADR vigente → refinamento/POC histórico. Divergência requer correção explícita, não interpretação silenciosa.

Total antes das edições: 76 + 50 + 50 + 1 = 177 documentos; esta revisão acrescentou `account-service/docs/IMPLEMENTATION-BASELINE.md`, portanto o inventário atual contém 178 documentos.

## account-service — 77 documentos

| Arquivo | Classificação |
| --- | --- |
| [\`PLANO_GOLDEN_REFERENCE_V1.md\`](https://github.com/BrunoBS/account-service/blob/main/PLANO_GOLDEN_REFERENCE_V1.md) | Registro histórico / revisar |
| [\`README.md\`](https://github.com/BrunoBS/account-service/blob/main/README.md) | Atual |
| [\`docs/IMPLEMENTATION-BASELINE.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/IMPLEMENTATION-BASELINE.md) | Atual |
| [\`docs/README.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/README.md) | Atual |
| [\`docs/REVIEW-STANDARD.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/REVIEW-STANDARD.md) | Atual |
| [\`docs/golden/ACCOUNT-BEHAVIOR-MATRIX.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/ACCOUNT-BEHAVIOR-MATRIX.md) | Registro histórico / revisar |
| [\`docs/golden/ADEQUACAO-POS-G4-EXECUCAO.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/ADEQUACAO-POS-G4-EXECUCAO.md) | Registro histórico / revisar |
| [\`docs/golden/ADR-001-ACCOUNT-SERVICE-NAMESPACE.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/ADR-001-ACCOUNT-SERVICE-NAMESPACE.md) | Decisão histórica |
| [\`docs/golden/ADR-002-G2-PERSISTENCE-BASELINE.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/ADR-002-G2-PERSISTENCE-BASELINE.md) | Decisão histórica |
| [\`docs/golden/ADR-003-G3-ACCOUNT-API.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/ADR-003-G3-ACCOUNT-API.md) | Decisão histórica |
| [\`docs/golden/ADR-004-G4-TRANSVERSAL-CAPABILITIES.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/ADR-004-G4-TRANSVERSAL-CAPABILITIES.md) | Decisão histórica |
| [\`docs/golden/ADR-005-FOUNDATION-PLATFORM-NAMESPACE-MIGRATION.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/ADR-005-FOUNDATION-PLATFORM-NAMESPACE-MIGRATION.md) | Decisão histórica |
| [\`docs/golden/ADR-006-COMPOSITION-ROOT-E-SUPERFICIE-PUBLICA.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/ADR-006-COMPOSITION-ROOT-E-SUPERFICIE-PUBLICA.md) | Decisão histórica |
| [\`docs/golden/ADR-007-CATALOG-PACKAGE-ORDER.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/ADR-007-CATALOG-PACKAGE-ORDER.md) | Decisão histórica |
| [\`docs/golden/ADR-008-CATALOG-TYPE-PACKAGE-NAMING.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/ADR-008-CATALOG-TYPE-PACKAGE-NAMING.md) | Decisão histórica |
| [\`docs/golden/ADR-ADEQUACAO-ARQUITETURAL-POS-G4.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/ADR-ADEQUACAO-ARQUITETURAL-POS-G4.md) | Decisão histórica |
| [\`docs/golden/API-CONVENTIONS.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/API-CONVENTIONS.md) | Atual |
| [\`docs/golden/FOUNDATION-GAPS.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/FOUNDATION-GAPS.md) | Registro histórico / revisar |
| [\`docs/golden/FOUNDATION-USAGE.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/FOUNDATION-USAGE.md) | Atual |
| [\`docs/golden/G0-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/G0-REVIEW.md) | Registro histórico / revisar |
| [\`docs/golden/G1-CHECKPOINT.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/G1-CHECKPOINT.md) | Registro histórico / revisar |
| [\`docs/golden/G2-PREPARATION.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/G2-PREPARATION.md) | Registro histórico / revisar |
| [\`docs/golden/G2-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/G2-REVIEW.md) | Registro histórico / revisar |
| [\`docs/golden/G3-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/G3-REVIEW.md) | Registro histórico / revisar |
| [\`docs/golden/G4-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/G4-REVIEW.md) | Registro histórico / revisar |
| [\`docs/golden/GOLDEN-INVENTORY.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/GOLDEN-INVENTORY.md) | Registro histórico / revisar |
| [\`docs/golden/MIGRACAO-CATALOGOS-FOUNDATION-EXECUCAO.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/MIGRACAO-CATALOGOS-FOUNDATION-EXECUCAO.md) | Registro histórico / revisar |
| [\`docs/golden/PLANO-ADEQUACAO-ARQUITETURAL-POS-G4.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/PLANO-ADEQUACAO-ARQUITETURAL-POS-G4.md) | Registro histórico / revisar |
| [\`docs/golden/PLANO-MIGRACAO-CATALOGOS-FOUNDATION.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/PLANO-MIGRACAO-CATALOGOS-FOUNDATION.md) | Registro histórico / revisar |
| [\`docs/golden/REVIEW-ADEQUACAO-POS-G4.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/REVIEW-ADEQUACAO-POS-G4.md) | Registro histórico / revisar |
| [\`docs/golden/REVIEW-MIGRACAO-CATALOGOS-FOUNDATION.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/golden/REVIEW-MIGRACAO-CATALOGOS-FOUNDATION.md) | Registro histórico / revisar |
| [\`docs/refinamentos/application/APPLICATION-CODE-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/application/APPLICATION-CODE-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/configuration/CONFIGURATION-CHECKPOINT-1.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/configuration/CONFIGURATION-CHECKPOINT-1.md) | Refinamento / verificar código |
| [\`docs/refinamentos/configuration/CONFIGURATION-CHECKPOINT-2.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/configuration/CONFIGURATION-CHECKPOINT-2.md) | Refinamento / verificar código |
| [\`docs/refinamentos/configuration/CONFIGURATION-CHECKPOINT-3.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/configuration/CONFIGURATION-CHECKPOINT-3.md) | Refinamento / verificar código |
| [\`docs/refinamentos/configuration/CONFIGURATION-PLATFORM-REDIS.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/configuration/CONFIGURATION-PLATFORM-REDIS.md) | Refinamento / verificar código |
| [\`docs/refinamentos/configuration/WORKSPACE-PAUSE-PLATFORM-REDIS-V3.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/configuration/WORKSPACE-PAUSE-PLATFORM-REDIS-V3.md) | Refinamento / verificar código |
| [\`docs/refinamentos/dynamic-bundle/DYNAMIC-BUNDLE.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/dynamic-bundle/DYNAMIC-BUNDLE.md) | Refinamento / verificar código |
| [\`docs/refinamentos/dynamic-parameter/DYNAMIC-PARAMETER.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/dynamic-parameter/DYNAMIC-PARAMETER.md) | Refinamento / verificar código |
| [\`docs/refinamentos/environment/ENVIRONMENT-CODE-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/environment/ENVIRONMENT-CODE-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/environment/ENVIRONMENT-DATA-FLOW-SIMULATION.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/environment/ENVIRONMENT-DATA-FLOW-SIMULATION.md) | Refinamento / verificar código |
| [\`docs/refinamentos/environment/ENVIRONMENT-FULL-CODE-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/environment/ENVIRONMENT-FULL-CODE-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/environment/ENVIRONMENT-OPERATIONAL-LIMITS.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/environment/ENVIRONMENT-OPERATIONAL-LIMITS.md) | Refinamento / verificar código |
| [\`docs/refinamentos/environment/ENVIRONMENT-TYPE-CODE-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/environment/ENVIRONMENT-TYPE-CODE-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/environment/ENVIRONMENT-TYPE-COMPATIBILITY-CODE-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/environment/ENVIRONMENT-TYPE-COMPATIBILITY-CODE-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/features-golden/EXECUCAO.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/features-golden/EXECUCAO.md) | Refinamento / verificar código |
| [\`docs/refinamentos/foundation/GOVERNANCA_CATALOGOS_FEATURE_RUNTIME.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/foundation/GOVERNANCA_CATALOGOS_FEATURE_RUNTIME.md) | Refinamento / verificar código |
| [\`docs/refinamentos/foundation/MICROSERVICE-MIGRATION-V19.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/foundation/MICROSERVICE-MIGRATION-V19.md) | Refinamento / verificar código |
| [\`docs/refinamentos/foundation/RESOURCE-SCHEMA-VALIDATION-ADOPTION.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/foundation/RESOURCE-SCHEMA-VALIDATION-ADOPTION.md) | Refinamento / verificar código |
| [\`docs/refinamentos/foundation/RESOURCE-SCHEMA-VALIDATION.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/foundation/RESOURCE-SCHEMA-VALIDATION.md) | Refinamento / verificar código |
| [\`docs/refinamentos/foundation/SCHEMA-BINDING-V28.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/foundation/SCHEMA-BINDING-V28.md) | Refinamento / verificar código |
| [\`docs/refinamentos/lifecycle/LIFECYCLE-LISTING-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/lifecycle/LIFECYCLE-LISTING-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/message/MESSAGE-CODE-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/message/MESSAGE-CODE-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/message/MESSAGE-INTEGRATION.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/message/MESSAGE-INTEGRATION.md) | Refinamento / verificar código |
| [\`docs/refinamentos/onboarding/ONBOARDING-CODE-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/onboarding/ONBOARDING-CODE-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/onboarding/ONBOARDING.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/onboarding/ONBOARDING.md) | Refinamento / verificar código |
| [\`docs/refinamentos/persistence/SAVE-AND-FLUSH-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/persistence/SAVE-AND-FLUSH-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/platform/CONTEXT-CODE-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/platform/CONTEXT-CODE-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/platform/FEATURE-CODE-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/platform/FEATURE-CODE-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/platform/FEATURE-CONTEXT-RELATIONS.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/platform/FEATURE-CONTEXT-RELATIONS.md) | Refinamento / verificar código |
| [\`docs/refinamentos/platform/LOCAL-VERIFY-RECOVERY.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/platform/LOCAL-VERIFY-RECOVERY.md) | Refinamento / verificar código |
| [\`docs/refinamentos/platform/MICROSERVICE-CODE-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/platform/MICROSERVICE-CODE-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/platform/PLATFORM-ENDPOINTS-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/platform/PLATFORM-ENDPOINTS-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/platform/PLATFORM-FINAL-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/platform/PLATFORM-FINAL-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/platform/PLATFORM-LIFECYCLE-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/platform/PLATFORM-LIFECYCLE-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/platform/PLATFORM-STRUCTURE-REFACTOR.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/platform/PLATFORM-STRUCTURE-REFACTOR.md) | Refinamento / verificar código |
| [\`docs/refinamentos/publisher/PUBLISHER-CODE-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/publisher/PUBLISHER-CODE-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/resource-sharing/RESOURCE-SHARING.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/resource-sharing/RESOURCE-SHARING.md) | Refinamento / verificar código |
| [\`docs/refinamentos/segment/SEGMENT-CATEGORIES-V1.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/segment/SEGMENT-CATEGORIES-V1.md) | Refinamento / verificar código |
| [\`docs/refinamentos/segmentation/SEGMENTATION.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/segmentation/SEGMENTATION.md) | Refinamento / verificar código |
| [\`docs/refinamentos/service-context/SERVICE-CONTEXT.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/service-context/SERVICE-CONTEXT.md) | Refinamento / verificar código |
| [\`docs/refinamentos/shared/SHARED-CODE-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/shared/SHARED-CODE-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/shared/SHARED-PARTICIPANT-API.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/shared/SHARED-PARTICIPANT-API.md) | Refinamento / verificar código |
| [\`docs/refinamentos/shared/SHARED-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/shared/SHARED-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/workspace/ONBOARDING-IMPLEMENTATION-ANALYSIS.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/workspace/ONBOARDING-IMPLEMENTATION-ANALYSIS.md) | Refinamento / verificar código |
| [\`docs/refinamentos/workspace/WORKSPACE-CLASS-METHOD-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/workspace/WORKSPACE-CLASS-METHOD-REVIEW.md) | Refinamento / verificar código |
| [\`docs/refinamentos/workspace/WORKSPACE-CODE-REVIEW.md\`](https://github.com/BrunoBS/account-service/blob/main/docs/refinamentos/workspace/WORKSPACE-CODE-REVIEW.md) | Refinamento / verificar código |

## guideline-java — 50 documentos

| Arquivo | Classificação |
| --- | --- |
| [\`README.md\`](https://github.com/BrunoBS/guideline-java/blob/main/README.md) | Atual |
| [\`docs/Governança/golden-governance-v1-parte-2-feature-promotion-release.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/Governan%C3%A7a/golden-governance-v1-parte-2-feature-promotion-release.md) | Governança |
| [\`docs/Governança/golden-governance-v1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/Governan%C3%A7a/golden-governance-v1.md) | Governança |
| [\`docs/documentacao-feature-compartilhamento.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/documentacao-feature-compartilhamento.md) | Projeto/POC / verificar implementação |
| [\`docs/feature_rotas_cenarios.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/feature_rotas_cenarios.md) | Projeto/POC / verificar implementação |
| [\`docs/menus.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/menus.md) | Projeto/POC / verificar implementação |
| [\`docs/metricas-eventos.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/metricas-eventos.md) | Projeto/POC / verificar implementação |
| [\`docs/modelo_dados_chaves.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/modelo_dados_chaves.md) | Projeto/POC / verificar implementação |
| [\`docs/modelo_dados_menus.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/modelo_dados_menus.md) | Projeto/POC / verificar implementação |
| [\`docs/modelo_dados_rotas.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/modelo_dados_rotas.md) | Projeto/POC / verificar implementação |
| [\`docs/modelo_dados_rotas_v2.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/modelo_dados_rotas_v2.md) | Projeto/POC / verificar implementação |
| [\`docs/onboarding_documentacao.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/onboarding_documentacao.md) | Projeto/POC / verificar implementação |
| [\`docs/onboarding_documentacao_tecnica.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/onboarding_documentacao_tecnica.md) | Projeto/POC / verificar implementação |
| [\`docs/refinamento/01-schema/schema-feature-refinamento_V1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/01-schema/schema-feature-refinamento_V1.md) | Refinamento / proposta |
| [\`docs/refinamento/01-schema/schema-feature-refinamento_V2.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/01-schema/schema-feature-refinamento_V2.md) | Refinamento / proposta |
| [\`docs/refinamento/01-schema/schema-feature-refinamento_V3.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/01-schema/schema-feature-refinamento_V3.md) | Refinamento / proposta |
| [\`docs/refinamento/02-chaves/modelo_dados_chaves_V1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/02-chaves/modelo_dados_chaves_V1.md) | Refinamento / proposta |
| [\`docs/refinamento/03-rotas/feature_rotas_cenarios_V1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/03-rotas/feature_rotas_cenarios_V1.md) | Refinamento / proposta |
| [\`docs/refinamento/03-rotas/feature_rotas_regras_negocio_V2.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/03-rotas/feature_rotas_regras_negocio_V2.md) | Refinamento / proposta |
| [\`docs/refinamento/04-menus/menu-regras-negocio-modelo_V2.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/04-menus/menu-regras-negocio-modelo_V2.md) | Refinamento / proposta |
| [\`docs/refinamento/04-menus/menus_V1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/04-menus/menus_V1.md) | Refinamento / proposta |
| [\`docs/refinamento/05-auditoria/audit-service_V1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/05-auditoria/audit-service_V1.md) | Refinamento / proposta |
| [\`docs/refinamento/05-auditoria/audit-service_V2.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/05-auditoria/audit-service_V2.md) | Refinamento / proposta |
| [\`docs/refinamento/05-auditoria/audit-service_V3.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/05-auditoria/audit-service_V3.md) | Refinamento / proposta |
| [\`docs/refinamento/06-compartilhamento/compartilhamento-negocio_V1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/06-compartilhamento/compartilhamento-negocio_V1.md) | Refinamento / proposta |
| [\`docs/refinamento/06-compartilhamento/compartilhamento-negocio_V2.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/06-compartilhamento/compartilhamento-negocio_V2.md) | Refinamento / proposta |
| [\`docs/refinamento/07-lifecycle/workspace-lifecycle-orchestration_V1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/07-lifecycle/workspace-lifecycle-orchestration_V1.md) | Refinamento / proposta |
| [\`docs/refinamento/08-transferencia-copia/transferencia-copia-configuracoes_V1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/08-transferencia-copia/transferencia-copia-configuracoes_V1.md) | Refinamento / proposta |
| [\`docs/refinamento/09-messaging/message-catalog-plano-implementacao_V1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/09-messaging/message-catalog-plano-implementacao_V1.md) | Refinamento / proposta |
| [\`docs/refinamento/10-resource-reference/resource-reference_V1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/10-resource-reference/resource-reference_V1.md) | Refinamento / proposta |
| [\`docs/refinamento/11-environment/environment-hierarchy_V1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/11-environment/environment-hierarchy_V1.md) | Refinamento / proposta |
| [\`docs/refinamento/11-environment/environment-hierarchy_V2.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/11-environment/environment-hierarchy_V2.md) | Refinamento / proposta |
| [\`docs/refinamento/12-message-queue/platform-message-queue-refinamento_V1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/12-message-queue/platform-message-queue-refinamento_V1.md) | Refinamento / proposta |
| [\`docs/refinamento/13-contratos-shared-participantes.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/13-contratos-shared-participantes.md) | Refinamento / proposta |
| [\`docs/refinamento/13-shared-especificacao-tecnica-draft.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/13-shared-especificacao-tecnica-draft.md) | Refinamento / proposta |
| [\`docs/refinamento/14-configuration/configuration-refinement-v1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/14-configuration/configuration-refinement-v1.md) | Refinamento / proposta |
| [\`docs/refinamento/15-segmentos/segmentos-categorias-refinement-v1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/15-segmentos/segmentos-categorias-refinement-v1.md) | Refinamento / proposta |
| [\`docs/refinamento/16-platform-redis/platform-redis-refinamento_V3.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/16-platform-redis/platform-redis-refinamento_V3.md) | Refinamento / proposta |
| [\`docs/refinamento/16-platform-redis/platform-redis-refinamento_V4.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/16-platform-redis/platform-redis-refinamento_V4.md) | Refinamento / proposta |
| [\`docs/refinamento/16-platform-redis/platform-redis-refinamento_V5.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/16-platform-redis/platform-redis-refinamento_V5.md) | Refinamento / proposta |
| [\`docs/refinamento/17-notification/notification-service_V1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/17-notification/notification-service_V1.md) | Refinamento / proposta |
| [\`docs/refinamento/18-micro-frontends/README.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/18-micro-frontends/README.md) | Refinamento / proposta |
| [\`docs/refinamento/README.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/README.md) | Refinamento / proposta |
| [\`docs/refinamento/compactacao/REFINAMENTO_COMPRESSION_ENGINE_V1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/compactacao/REFINAMENTO_COMPRESSION_ENGINE_V1.md) | Refinamento / proposta |
| [\`docs/refinamento/foundation/REFINAMENTO_CATALOG_CODE_SERVICE_FEATURE_RUNTIME.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/foundation/REFINAMENTO_CATALOG_CODE_SERVICE_FEATURE_RUNTIME.md) | Refinamento / proposta |
| [\`docs/refinamento/platform/REFINAMENTO_FEATURE_CONTEXT_PLATFORM_V1.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/refinamento/platform/REFINAMENTO_FEATURE_CONTEXT_PLATFORM_V1.md) | Refinamento / proposta |
| [\`docs/skills/golden-reference-assessment.md\`](https://github.com/BrunoBS/guideline-java/blob/main/docs/skills/golden-reference-assessment.md) | Atual |
| [\`icones.md\`](https://github.com/BrunoBS/guideline-java/blob/main/icones.md) | Projeto/POC / verificar implementação |
| [\`prototipo/README.md\`](https://github.com/BrunoBS/guideline-java/blob/main/prototipo/README.md) | Projeto/POC / verificar implementação |
| [\`teste.md\`](https://github.com/BrunoBS/guideline-java/blob/main/teste.md) | Projeto/POC / verificar implementação |

## platform-libraries — 50 documentos

| Arquivo | Classificação |
| --- | --- |
| [\`README.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/README.md) | Atual por módulo |
| [\`docs/adr/ADR-001-CONSOLIDATE-FOUNDATION-REPOSITORIES.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/adr/ADR-001-CONSOLIDATE-FOUNDATION-REPOSITORIES.md) | Decisão histórica |
| [\`docs/adr/ADR-002-PORTALMANAGER-NAMESPACE.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/adr/ADR-002-PORTALMANAGER-NAMESPACE.md) | Decisão histórica |
| [\`docs/adr/ADR-003-SPRING-BOOT-TESTCONTAINERS.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/adr/ADR-003-SPRING-BOOT-TESTCONTAINERS.md) | Decisão histórica |
| [\`docs/adr/ADR-004-PLATFORM-NAMESPACE-AND-MODULE-NAMING.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/adr/ADR-004-PLATFORM-NAMESPACE-AND-MODULE-NAMING.md) | Decisão histórica |
| [\`docs/foundation/CATALOG-REFACTOR.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/foundation/CATALOG-REFACTOR.md) | Plano/registro de evolução |
| [\`docs/foundation/CRUD-REMOVAL.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/foundation/CRUD-REMOVAL.md) | Plano/registro de evolução |
| [\`docs/foundation/FOUNDATION-ARCHITECTURE.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/foundation/FOUNDATION-ARCHITECTURE.md) | Atual por módulo |
| [\`docs/foundation/FOUNDATION-CHECKPOINT.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/foundation/FOUNDATION-CHECKPOINT.md) | Plano/registro de evolução |
| [\`docs/foundation/FOUNDATION-CONSOLIDATION-INVENTORY.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/foundation/FOUNDATION-CONSOLIDATION-INVENTORY.md) | Plano/registro de evolução |
| [\`docs/foundation/FOUNDATION-MIGRATION-PLATFORM-BUILD.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/foundation/FOUNDATION-MIGRATION-PLATFORM-BUILD.md) | Plano/registro de evolução |
| [\`docs/foundation/FOUNDATION-PUBLISHING.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/foundation/FOUNDATION-PUBLISHING.md) | Plano/registro de evolução |
| [\`docs/foundation/FOUNDATION-VERSIONING.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/foundation/FOUNDATION-VERSIONING.md) | Plano/registro de evolução |
| [\`docs/foundation/MIGRATION-NOTES.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/foundation/MIGRATION-NOTES.md) | Plano/registro de evolução |
| [\`docs/foundation/PLATFORM-LIBRARIES-MODULES.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/foundation/PLATFORM-LIBRARIES-MODULES.md) | Atual por módulo |
| [\`docs/platform-redis/ONDA-0.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/platform-redis/ONDA-0.md) | Plano/registro de evolução |
| [\`docs/platform-redis/ONDA-1.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/platform-redis/ONDA-1.md) | Plano/registro de evolução |
| [\`docs/platform-redis/ONDA-2.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/platform-redis/ONDA-2.md) | Plano/registro de evolução |
| [\`docs/platform-redis/ONDA-3.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/platform-redis/ONDA-3.md) | Plano/registro de evolução |
| [\`docs/platform-redis/ONDA-4.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/platform-redis/ONDA-4.md) | Plano/registro de evolução |
| [\`docs/platform-redis/ONDA-5-RELATORIO.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/platform-redis/ONDA-5-RELATORIO.md) | Plano/registro de evolução |
| [\`docs/platform-redis/ONDA-6-PLANO.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/platform-redis/ONDA-6-PLANO.md) | Plano/registro de evolução |
| [\`docs/platform-redis/ONDA-6-RELATORIO-V4.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/platform-redis/ONDA-6-RELATORIO-V4.md) | Plano/registro de evolução |
| [\`docs/platform-redis/ONDA-7-RELATORIO-V5.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/platform-redis/ONDA-7-RELATORIO-V5.md) | Plano/registro de evolução |
| [\`docs/platform-redis/REVISAO-PERFORMANCE.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/platform-redis/REVISAO-PERFORMANCE.md) | Plano/registro de evolução |
| [\`docs/platform-redis/platform-redis-refinamento_V3.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/platform-redis/platform-redis-refinamento_V3.md) | Plano/registro de evolução |
| [\`docs/platform-redis/platform-redis-refinamento_V4.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/platform-redis/platform-redis-refinamento_V4.md) | Plano/registro de evolução |
| [\`docs/platform-redis/platform-redis-refinamento_V5.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/docs/platform-redis/platform-redis-refinamento_V5.md) | Plano/registro de evolução |
| [\`modules/platform-audit/README.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-audit/README.md) | Atual por módulo |
| [\`modules/platform-audit/docs/ARCHITECTURE.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-audit/docs/ARCHITECTURE.md) | Atual por módulo |
| [\`modules/platform-audit/docs/USAGE.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-audit/docs/USAGE.md) | Atual por módulo |
| [\`modules/platform-authorization/README.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-authorization/README.md) | Atual por módulo |
| [\`modules/platform-catalog/README.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-catalog/README.md) | Atual por módulo |
| [\`modules/platform-catalog/docs/USAGE.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-catalog/docs/USAGE.md) | Atual por módulo |
| [\`modules/platform-message-queue/README.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-message-queue/README.md) | Atual por módulo |
| [\`modules/platform-messaging/README.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-messaging/README.md) | Atual por módulo |
| [\`modules/platform-observability/README.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-observability/README.md) | Atual por módulo |
| [\`modules/platform-redis/README.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-redis/README.md) | Atual por módulo |
| [\`modules/platform-schema-validation/README.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-schema-validation/README.md) | Atual por módulo |
| [\`modules/platform-tagging/README.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-tagging/README.md) | Atual por módulo |
| [\`modules/platform-testing/README.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-testing/README.md) | Atual por módulo |
| [\`modules/platform-testing/docs/ARCHITECTURE.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-testing/docs/ARCHITECTURE.md) | Atual por módulo |
| [\`modules/platform-testing/docs/COMECE_AQUI_TESTES.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-testing/docs/COMECE_AQUI_TESTES.md) | Atual por módulo |
| [\`modules/platform-testing/docs/ESTRUTURA_DE_PACOTES.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-testing/docs/ESTRUTURA_DE_PACOTES.md) | Atual por módulo |
| [\`modules/platform-testing/docs/GUIA_DE_USO.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-testing/docs/GUIA_DE_USO.md) | Atual por módulo |
| [\`modules/platform-testing/docs/PACKAGES_AND_CLASSES.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-testing/docs/PACKAGES_AND_CLASSES.md) | Atual por módulo |
| [\`modules/platform-testing/docs/USAGE.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-testing/docs/USAGE.md) | Atual por módulo |
| [\`modules/platform-testing/platform-testing-authorization/README.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-testing/platform-testing-authorization/README.md) | Atual por módulo |
| [\`modules/platform-testing/platform-testing-core/README.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-testing/platform-testing-core/README.md) | Atual por módulo |
| [\`modules/platform-testing/platform-testing-redis/README.md\`](https://github.com/BrunoBS/platform-libraries/blob/main/modules/platform-testing/platform-testing-redis/README.md) | Atual por módulo |

## platform-build — 1 documentos

| Arquivo | Classificação |
| --- | --- |
| [\`README.md\`](https://github.com/BrunoBS/platform-build/blob/main/README.md) | Legado |

## Mudanças de documentação nesta revisão

- `guideline-java/README.md`: substituída arquitetura genérica incompatível por baseline Golden e regras de precedência.
- `platform-build/README.md`: marcado explicitamente como legado, sem alterar POMs.
- `platform-libraries/docs/foundation/FOUNDATION-ARCHITECTURE.md` e `PLATFORM-LIBRARIES-MODULES.md`: reescritos conforme reactor, POMs e implementação atual.
- `account-service/docs/IMPLEMENTATION-BASELINE.md`: criado como referência do código.
- READMEs e índices dos serviços, Foundation, authorization e refinamentos: adicionados avisos de vigência e links para a referência correta.

## O que esta revisão não garante

Não houve execução de build, teste de links, geração de javadoc nem revisão semântica de todas as linhas dos 178 documentos. Arquivos classificados como históricos ou propostas podem conter nomenclatura antiga intencionalmente. A consistência absoluta só pode ser atestada com revisão integral por domínio e gates automatizados; não tratar esta auditoria estática como tal.

## Próximos gates recomendados

1. Validador de links Markdown relativos e links externos essenciais.
2. Comparador automático entre reactor Maven e catálogo documental.
3. Teste de arquitetura/contratos no CI do Workspace Service.
4. Regra de PR: mudanças em APIs, módulos, migrations ou anotações públicas exigem atualização de documentação vigente no mesmo PR.
