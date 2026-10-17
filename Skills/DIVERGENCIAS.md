# Relatório de divergências — Golden × Skills externas

Status: TRIAGEM INICIAL. Os itens abaixo são hipóteses ou divergências observadas no README principal; dependem de conferência nos demais documentos da Golden. Nenhuma mudança está autorizada.

| ID | Tema | Evidência | Possível divergência | Ação sugerida | Estado |
|---|---|---|---|---|---|
| DIV-001 | Organização das camadas | README raiz: `features/<feature>/controller/service/repository` | Implementações Golden podem usar use cases e camadas foundation/core/feature | Confrontar documentos e código atual; não impor uma estrutura genérica | PENDENTE |
| DIV-002 | Validação | README raiz: validação no service, retorna lista de erros | Uso de AOP, JSON Schema e validação por anotação em componentes Golden | Documentar exceções e contratos aprovados | PENDENTE |
| DIV-003 | Comunicação entre features | README raiz: proíbe feature → feature diretamente; sugere integração via Service | Verificar interfaces/facades/use cases adotados | Especificar dependências permitidas por módulo | PENDENTE |
| DIV-004 | Java e Spring | Fontes externas citam Java 21 / Spring Boot 3 | Baseline Golden: Java 25 / Spring Boot 4 | Revisar APIs, starters e configurações antes de copiar exemplos | PENDENTE |
| DIV-005 | Persistência | Skills genéricas JPA | Golden usa MySQL 8, Flyway, views e filtros de visibilidade | Confrontar com contratos de acesso e isolamento | PENDENTE |
| DIV-006 | Resiliência | Recomendações genéricas de retry/circuit breaker | Mensageria AWS/Azure, DLQ, FIFO, idempotência e auditoria exigem políticas específicas | Definir matriz por tipo de integração | PENDENTE |
| DIV-007 | Testes | Exemplos externos de Testcontainers | Golden dispõe de módulos platform-testing especializados | Exigir reutilização dos módulos antes de novos fixtures | PENDENTE |
| DIV-008 | Performance | Dicas genéricas de otimização JVM | Sem métricas/SLAs confirmados para serviços Golden | Exigir benchmark, baseline e evidência antes de otimizar | PENDENTE |

## Protocolo de análise
Para cada item: indicar arquivo e revisão consultados, regra vigente, trecho da Skill candidata, classificação (conflito real / compatível / informação insuficiente), impacto, alternativas e decisão humana. Não confundir ausência de informação com divergência comprovada.
