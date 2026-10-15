# Notification Service — Refinamento V1

> Status: proposta de refinamento para revisão. Base: discussões de 15/10/2026. Integração prevista com o Audit Service V3. Não representa funcionalidade já implementada.

## 1. Objetivo e responsabilidades
O Notification Service cria, persiste, consulta, distribui e elimina notificações temporárias destinadas a usuários e contas da plataforma. Não substitui o Audit Service nem funciona como repositório permanente de evidências. Stack de referência: Java 25, Spring Boot 4, MySQL 8, SQS, Redis Pub/Sub e WebSocket.

## 2. Arquitetura
Fluxo de origem auditada: serviço de domínio → Audit Service (registro e reconciliação) → evento de solicitação na SQS → uma instância do Notification Service → transação no MySQL → publicação Redis Pub/Sub → todas as instâncias do Notification Service → sessões WebSocket locais → Shell.

O Audit Service deve emitir solicitação de notificação apenas para eventos terminais elegíveis. Para operações em lote, emitir uma solicitação por AUDIT_OPERATION encerrada; para eventos independentes sem operation_id, emitir somente se forem eventos de negócio notificáveis. Não gerar uma notificação por cada evento técnico da auditoria. A publicação confiável do evento após commit requer outbox ou mecanismo equivalente, a detalhar na integração.

SQS é fila de trabalho: uma instância consome cada entrega; exige idempotência, retry e DLQ. Redis Pub/Sub é fan-out efêmero para instâncias online; não persiste nem garante entrega. MySQL é fonte oficial. WebSocket é canal de atualização, não garantia de entrega.

## 3. Tipos e escopos
- **Operacional individual:** resultado de processamento assíncrono para o usuário solicitante, por exemplo publicação/promoção; validade inicial de referência de até 3 dias.
- **Comunicado/aviso:** criado por owner, com severidade informativa, aviso ou erro; validade configurada na criação; pode atingir vários usuários ou uma conta.
- **Escopo USER:** destinatário explícito, resolvido pelo identificador autenticado.
- **Escopo ACCOUNT:** contexto de conta, exibido quando o usuário seleciona a conta no Shell. A autorização atual da conta deve ser verificada na API e antes de expor dados sensíveis.

**Decisão a fechar:** para ACCOUNT, materializar todos os destinatários na criação (público congelado) ou resolver elegibilidade dinamicamente quando a conta é acessada. Se houver relatório de leitura com denominador de destinatários, materializar/snapshotar o público é recomendado. Não confundir consulta por conta com autorização para ver qualquer comunicado.

## 4. Modelo de dados proposto
### NOTIFICATION
- id (UUID), account_identifier (opcional conforme escopo), scope (USER/ACCOUNT), type, severity, title, summary, destination_code, destination_params (JSON), source_service, source_event_identifier/operation_identifier, idempotency_key (unique), created_by, created_at, updated_at, expires_at, delete_at, report_required, report_status (quando aplicável), report_location (quando aplicável).
- CHECK lógico: delete_at >= expires_at; datas em UTC.
- `delete_at` significa **exclusão física programada**, não exclusão lógica já realizada. Não usar `deleted_at` com essa semântica.

### NOTIFICATION_RECIPIENT
- id, notification_id, user_identifier, read_at, acknowledged_at (quando exigir ciência explícita), created_at; UNIQUE(notification_id, user_identifier).
- Uma notificação pode ter N destinatários. A leitura é individual. Para escopo ACCOUNT com resolução dinâmica, definir quando criar esse registro e como computar os não leitores.
- FK com ON DELETE CASCADE ou exclusão transacional explícita; o processo deve excluir vínculos e notificação conjuntamente.

### NOTIFICATION_REPORT (opcional/evolução)
- notification_id, status, object_key, generated_at, requested_recipient_email, checksum, attempts; política de retenção independente do registro operacional.

Índices: recipient(user_identifier, notification_id), notification(account_identifier, expires_at, created_at), notification(delete_at), UNIQUE(idempotency_key). Ajustar índices após definir consultas e volume.

## 5. Ciclo de vida
1. Owner/origem cria com `expires_at` e `delete_at` explícitos ou derivados de políticas por tipo.
2. Até `expires_at`, a notificação é visível para destinatários elegíveis; leitura e confirmação são registradas.
3. Em `expires_at`, deixa de ser retornada pela API e não deve gerar entrega WebSocket; novas confirmações ficam bloqueadas.
4. Entre `expires_at` e `delete_at`, os registros podem ser mantidos para validação e relatório.
5. Em `delete_at`, job de limpeza remove destinatários e notificação, independentemente de leitura, exceto quando um relatório obrigatório ainda não foi armazenado com sucesso.
6. Job idempotente, paginado e seguro para múltiplas instâncias (lock/claim); falhas com retry e métricas.

Exemplo: criada em D0, expira em D+7, exclui em D+10. Para evento operacional simples: expira em D+3 e exclusão pode ocorrer em D+3, conforme política definida.

## 6. Relatório opcional
No momento da criação, owner escolhe `report_required`. Se habilitado, ao atingir `delete_at`, gerar snapshot imutável de destinatários, leituras, confirmações e respectivos horários; persistir CSV no S3; depois solicitar envio de e-mail com link protegido, expiração e autorização. A exclusão física só é liberada após armazenamento confirmado do relatório; não depende de abertura do e-mail. Se a geração falhar, reprocessar sem duplicar artefatos. Definir retenção e controle de acesso ao CSV. Relatórios e e-mail são evolução possível; contrato e estados podem ser preparados na V1.

## 7. APIs propostas
- `GET /notifications?accountIdentifier={uuid}&page=0&size=20`: notificações válidas do usuário autenticado no contexto selecionado; servidor deriva userId do JWT e valida acesso.
- `GET /notifications/unread-count?accountIdentifier={uuid}`: contador do sininho.
- `PATCH /notifications/{id}/read`: marca leitura para o usuário autenticado; idempotente.
- `PATCH /notifications/{id}/acknowledge`: confirma ciência quando exigida.
- `POST /notifications`: criação administrativa/serviço autenticado com escopo, destinatários ou conta, validade, exclusão, relatório e navegação; autorização por owner.
- Contratos administrativos de edição/cancelamento e relatório: detalhar na próxima rodada.

Filtrar `expires_at > now()` e elegibilidade/autorização em todas as leituras. Paginação e ordenação por `created_at DESC, id DESC`.

## 8. WebSocket, Redis e Shell
- Shell abre **uma conexão autenticada** após login; não uma por MFE.
- Identidade vem de JWT validado; nunca confiar em userId livremente enviado pelo navegador.
- Cada instância mantém mapa local userId → múltiplas sessões/conexões; mesma pessoa pode usar Safari, outro navegador e celular simultaneamente.
- Ao persistir a notificação, publicar evento leve `notification.created` com notificationId, destinatário(s) ou escopo e accountIdentifier. Todas as instâncias inscritas no Redis recebem; cada uma envia somente às sessões locais elegíveis.
- A seleção da conta no Shell dispara GET HTTP com accountIdentifier; ao trocar de conta, atualizar contexto e sininho. Para entrega WebSocket de escopo ACCOUNT, validar contexto ativo e autorização; evitar confiar apenas em sinalização do cliente.
- Em login, reconexão ou troca de conta, sincronizar por HTTP. Frontend deduplica pelo notificationId; contadores vêm do servidor.
- Quando houver múltiplas instâncias, a publicação no Redis deve ocorrer após commit; se Redis falhar, persistência permanece. Prever reconciliação HTTP para falhas entre commit e publicação.

## 9. Contrato mínimo de evento
```json
{
  "eventId": "uuid",
  "eventType": "NOTIFICATION_REQUESTED",
  "sourceService": "audit-service",
  "sourceOperationIdentifier": "uuid-ou-null",
  "sourceEventIdentifier": "uuid-ou-null",
  "requestUserIdentifier": "identificador-estavel",
  "accountIdentifier": "uuid",
  "notificationType": "PROMOTION_COMPLETED",
  "outcome": "COMPLETED",
  "summary": {"total": 10, "succeeded": 9, "failed": 1},
  "destination": {"code": "PROMOTION_DETAIL", "params": {"operationIdentifier": "uuid"}},
  "occurredAt": "2026-10-15T04:00:00Z"
}
```
Para operações agrupadas, usar o resultado reconciliado da AUDIT_OPERATION (STARTED/COMPLETED/FAILED). Uma operação FAILED pode ser apresentada como parcialmente concluída com base nos contadores; não criar status PARTIAL na auditoria. Persistir o solicitante desde a entrada original e propagá-lo pelo processamento assíncrono. Não pressupor que o esquema atual da AUDIT_OPERATION já contém esse campo: verificar e adaptar o contrato.

## 10. Segurança e confiabilidade
Autenticar HTTP e handshake WebSocket; autorizar acesso por conta, usuário e escopo. O clique em “Veja mais” navega ao MFE de origem e **revalida permissão no serviço de destino**. Usar destino lógico, não URL Angular fixa. Tratar reentregas da SQS por chave de idempotência; processar mensagens com DLQ e observabilidade. Não registrar JWT em payload/log. Considerar revogação de acesso, expiração de token, reconexão, corrida entre exclusão e leitura, múltiplas sessões e múltiplas instâncias. Aplicar rate limits e limites de tamanho a notificações administrativas.

## 11. Testes mínimos
Testcontainers MySQL, SQS e Redis conforme padrões de platform-testing existentes; testes de idempotência, fan-out entre instâncias, reconexão, isolamento entre contas, usuário sem acesso, expiração, limpeza transacional, relatório obrigatório com falha, leitura simultânea e operação agrupada versus evento independente.

## 12. Decisões pendentes
1. Materialização de destinatários ACCOUNT versus resolução dinâmica; semântica para novos membros.
2. Regras de owner, papéis e permissões para criar/editar comunicados.
3. Prazos máximos por tipo, padrão de delete_at e política de relatórios/S3/e-mail.
4. Necessidade de confirmação explícita de ciência versus leitura simples.
5. Canal WebSocket e protocolo (STOMP ou WebSocket nativo), autenticação de handshake e escala.
6. Contrato exato entre Audit Service V3 e Notification Service, incluindo quem publica outbox e quais eventos terminais são notificáveis.
7. Estratégia de revalidação de acesso para notificações de conta e política de dados após revogação.

## 13. Critérios de aceite da V1
- Solicitação assíncrona auditada gera no máximo uma notificação lógica por operação terminal notificável.
- Notificação individual chega a todas as sessões online do destinatário e é recuperável por HTTP quando offline.
- Notificações de conta só são apresentadas no contexto selecionado e autorizado.
- Expiração oculta imediatamente; exclusão física posterior elimina destinatários e confirmação de leitura.
- Relatório habilitado impede purge até armazenamento confirmado.
- Reentregas da SQS e múltiplas instâncias não duplicam notificações persistidas.
