# Notification Service — Refinamento V1

> Status: decisões arquiteturais consolidadas; implementação pendente. Base: discussões de 15/10/2026. Integração prevista com o Audit Service V3. Não representa funcionalidade já implementada.

## 1. Objetivo e responsabilidades
O Notification Service cria, persiste, consulta, distribui e elimina notificações temporárias destinadas a usuários e contas da plataforma. Não substitui o Audit Service nem funciona como repositório permanente de evidências. Stack de referência: Java 25, Spring Boot 4, MySQL 8, SQS, Redis Pub/Sub e WebSocket.

## 2. Arquitetura
Fluxo de origem auditada: serviço de domínio → Audit Service (registro e reconciliação) → evento de solicitação na SQS → uma instância do Notification Service → transação no MySQL → publicação Redis Pub/Sub → todas as instâncias do Notification Service → sessões WebSocket locais → Shell.

O Audit Service deve emitir solicitação de notificação apenas para eventos terminais elegíveis. Para operações em lote, emitir uma solicitação por AUDIT_OPERATION encerrada; para eventos independentes sem operation_id, emitir somente se forem eventos de negócio notificáveis. Não gerar uma notificação por cada evento técnico da auditoria. A publicação confiável do evento após commit requer outbox ou mecanismo equivalente, a detalhar na integração.

SQS é fila de trabalho: uma instância consome cada entrega; exige idempotência, retry e DLQ. Redis Pub/Sub é fan-out efêmero para instâncias online; não persiste nem garante entrega. MySQL é fonte oficial. WebSocket é canal de atualização, não garantia de entrega.

## 3. Tipos e escopos
- **Operacional individual:** resultado de processamento assíncrono para o usuário solicitante, por exemplo publicação/promoção; expiração padrão de 3 dias, configurável por política do serviço, sem teto rígido.
- **Comunicado/aviso:** criado por owner, com severidade informativa, aviso ou erro; validade configurada na criação; pode atingir vários usuários ou uma conta.
- **Escopo USER:** destinatário explícito, resolvido pelo identificador autenticado.
- **Escopo ACCOUNT:** contexto de conta, exibido quando o usuário seleciona a conta no Shell. A autorização atual da conta deve ser verificada na API e antes de expor dados sensíveis.

**Decisão:** para ACCOUNT, resolver a elegibilidade dinamicamente quando a conta é selecionada. Novos membros autorizados visualizam comunicados ainda não expirados. Não materializar todos os destinatários na criação. Histórico de leitura/ciência é criado sob demanda. Relatório lista interações efetivamente registradas; não pode presumir o universo de elegíveis que nunca acessaram a conta sem snapshot independente.

## 4. Modelo de dados proposto
### NOTIFICATION
- id (UUID), account_identifier (opcional conforme escopo), scope (USER/ACCOUNT), type, severity, title, summary, destination_code, destination_params (JSON), source_service, source_event_identifier/operation_identifier, idempotency_key (unique), created_by, created_at, updated_at, expires_at, delete_at, report_required, report_status (quando aplicável), report_location (quando aplicável).
- CHECK lógico: delete_at >= expires_at; datas em UTC.
- `delete_at` significa **exclusão física programada**, não exclusão lógica já realizada. Não usar `deleted_at` com essa semântica.

### NOTIFICATION_RECIPIENT
- id, notification_id, user_identifier, read_at, acknowledged_at (quando exigir ciência explícita), created_at; UNIQUE(notification_id, user_identifier).
- Uma notificação pode ter N destinatários. A leitura é individual. Para ACCOUNT, criar registro sob demanda ao marcar leitura ou confirmar ciência. Não inferir não leitores sem uma base de elegibilidade historicamente congelada.
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
No momento da criação, OWNER escolhe `report_required`. Se habilitado, após a expiração e antes da exclusão física, gerar snapshot imutável de destinatários, leituras, confirmações e respectivos horários; persistir CSV no S3; depois solicitar envio de e-mail com link protegido, expiração e autorização. A exclusão física só é liberada após armazenamento confirmado do relatório; não depende de abertura do e-mail. Se a geração falhar, reprocessar sem duplicar artefatos. Definir retenção e controle de acesso ao CSV. Relatórios e e-mail são evolução possível; contrato e estados podem ser preparados na V1.

## 7. APIs propostas
- `GET /notifications?accountIdentifier={uuid}&page=0&size=20`: notificações válidas do usuário autenticado no contexto selecionado; servidor deriva userId do JWT e valida acesso.
- `GET /notifications/unread-count?accountIdentifier={uuid}`: contador do sininho.
- `PATCH /notifications/{id}/read`: marca leitura para o usuário autenticado; idempotente.
- `PATCH /notifications/{id}/acknowledge`: confirma ciência quando exigida.
- `POST /notifications`: criação administrativa/serviço autenticado com escopo, destinatários ou conta, validade, exclusão, relatório e navegação; autorização por owner.
- Contratos administrativos de edição/cancelamento e relatório: detalhar na próxima rodada.

O Shell informa somente `accountIdentifier`; o backend extrai `userIdentifier` estável do JWT e consulta no contexto conta + usuário, verificando autorização atual. Nunca aceitar username fornecido pelo cliente como identidade. `UNIQUE(notification_id, user_identifier)` identifica a interação individual, não é chave única de notificações da conta. Para bloqueio, consultar notificações ACCOUNT vigentes com `acknowledgement_required=true` sem `acknowledged_at` para o usuário autenticado. Filtrar `expires_at > now()` e elegibilidade/autorização em todas as leituras. Paginação e ordenação por `created_at DESC, id DESC`.

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
Autenticar HTTP e WebSocket; autorizar acesso por conta, usuário e escopo. Browser WebSocket nativo não permite cabeçalho Authorization arbitrário no handshake: adotar mecanismo seguro compatível (cookie seguro, ticket de curta duração ou STOMP CONNECT validado no canal inbound), a especificar na implementação. Somente OWNER da conta pode criar, editar, publicar ou excluir comunicados administrativos, usando os grupos de autorização já existentes; backend impõe a regra. Serviços confiáveis podem criar notificações operacionais. Revogação de acesso à conta interrompe consulta e entrega WebSocket imediatamente; JWT/grupos em cache sem invalidação não bastam, exigindo checagem atual ou evento de revogação/invalidação. Preservar histórico individual até purge programado. O clique em “Veja mais” navega ao MFE de origem e **revalida permissão no serviço de destino**. Usar destino lógico, não URL Angular fixa. Tratar reentregas da SQS por chave de idempotência; processar mensagens com DLQ e observabilidade. Não registrar JWT em payload/log. Considerar revogação de acesso, expiração de token, reconexão, corrida entre exclusão e leitura, múltiplas sessões e múltiplas instâncias. Aplicar rate limits e limites de tamanho a notificações administrativas.

## 11. Testes mínimos
Testcontainers MySQL, SQS e Redis conforme padrões de platform-testing existentes; testes de idempotência, fan-out entre instâncias, reconexão, isolamento entre contas, usuário sem acesso, expiração, limpeza transacional, relatório obrigatório com falha, leitura simultânea e operação agrupada versus evento independente.

## 12. Decisões consolidadas (15/10/2026)
1. ACCOUNT tem audiência dinâmica, autorizada no momento do acesso; novos membros veem avisos vigentes; leitura e ciência criadas sob demanda.
2. Grupos existentes definem permissão: apenas OWNER pode criar, editar, publicar ou excluir comunicados da conta; notificações operacionais são geradas por serviços confiáveis.
3. Expiração operacional padrão de 3 dias, configurável pela política do serviço. OWNER pode ajustar `expires_at` e `delete_at` do comunicado; ambos possuem defaults e `delete_at >= expires_at`. Expiração oculta e impede nova interação; purge físico ocorre na data programada e respeita relatório pendente.
4. Leitura simples (`read_at`) difere de ciência explícita (`acknowledged_at`). Quando `acknowledgement_required`, Shell exibe modal bloqueante com conteúdo completo e botão “Li e estou ciente”; bloqueia navegação apenas na conta selecionada até confirmação persistida no servidor. Não fechar por Escape, clique externo ou recarga; múltiplos avisos exigem confirmação individual. Troca de conta e logout continuam possíveis. Expiração ou perda de acesso remove bloqueio. Eventos WebSocket durante a sessão também devem disparar bloqueio.
5. Uma conexão WebSocket autenticada por aba/sessão do Shell, compartilhada entre MFEs. Redis Pub/Sub distribui entre instâncias; sessões ficam locais. Reconciliar por HTTP em login, reconexão e troca de conta; suportar múltiplas abas/dispositivos.
6. Audit Service reconcilia operação terminal e emite `NOTIFICATION_REQUESTED` na SQS; uma notificação por `AUDIT_OPERATION` terminal, mesmo para lotes. Eventos independentes elegíveis podem gerar avisos próprios. Idempotência por operação/evento; persistir antes de publicar Redis; outbox ou equivalente para confiabilidade.
7. Revogação de acesso à conta impede consulta e entrega de notificações, inclusive WebSocket; manter histórico de leitura/ciência até exclusão física. Revalidação atual ou invalidação ativa é necessária.
8. `notification-service` é microserviço independente de `audit-service`, ambos na Golden Reference. Outros serviços podem solicitar notificações sem passar pela auditoria quando apropriado. O conjunto inicial da Golden Reference inclui quatro serviços: Authentication/Authorization (único serviço), Workspace, Audit e Notification. Escala horizontal independente e implantação gradual.

**Detalhes técnicos ainda a especificar na implementação:** protocolo/autenticação WebSocket; estratégia concreta de invalidação de acesso; contrato exato de outbox e evento; endpoints administrativos e formato de relatório. Essas escolhas não reabrem as decisões funcionais acima.

## 13. Critérios de aceite da V1
- Solicitação assíncrona auditada gera no máximo uma notificação lógica por operação terminal notificável.
- Notificação individual chega a todas as sessões online do destinatário e é recuperável por HTTP quando offline.
- Notificações de conta só são apresentadas no contexto selecionado e autorizado.
- Expiração oculta imediatamente; exclusão física posterior elimina destinatários e confirmação de leitura.
- Relatório habilitado impede purge até armazenamento confirmado.
- Reentregas da SQS e múltiplas instâncias não duplicam notificações persistidas.
- Apenas OWNER autorizado pode gerenciar comunicados de conta; usuário comum autorizado pode visualizar e confirmar.
- Novo membro da conta acessa comunicado ACCOUNT ainda vigente, sem destinatários pré-materializados.
- Shell bloqueia navegação da conta em avisos de ciência obrigatória até confirmação no backend, inclusive em recarga, reconexão e chegada por WebSocket.
- Usuário com acesso revogado não consulta nem recebe novos eventos WebSocket daquela conta; histórico individual permanece até purge.
- O mesmo usuário em duas contas vê apenas notificações do contexto selecionado, com identidade derivada do JWT.
