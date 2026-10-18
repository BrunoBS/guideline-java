# Pesquisa aplicada — Skills que ajudam a desenvolver código (2026-10-17)

## Descoberta e decisão
A orientação oficial de criação de Skills para Codex recomenda: entrada SKILL.md curta, frontmatter com descrição precisa para disparo, referências carregadas sob demanda, scripts executáveis para trabalho determinístico, e evitar conselhos genéricos repetidos. **Consequência:** não ampliar indefinidamente os 17 SKILL.md; concentrar tarefas práticas e provas em referências e laboratórios.

Fontes primárias:
- https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/skill-creator/SKILL.md
- https://github.com/openai/skills/blob/main/skills/.system/skill-creator/SKILL.md
- https://developers.openai.com/api/docs/guides/tools-skills
- https://docs.spring.io/spring-boot/4.0/reference/features/dev-services.html
- https://docs.spring.io/spring-security/reference/servlet/test/mockmvc/setup.html

## Caso de desenvolvimento concreto — GET por identificador com isolamento de workspace

**Requisito:** um usuário autenticado consulta um recurso por UUID dentro de workspace autorizado; recursos de outro workspace nunca aparecem, mesmo quando UUID é conhecido.

**Contrato:** `GET /resources/{identifier}`; resposta 200 com DTO se visível; 401 sem autenticação; 403 se o contexto de workspace não é autorizado; 404 se o recurso não existe *dentro do workspace autorizado* (sem vazar existência). Este contrato é exemplo, não imposição a serviços existentes.

**Skills primária e auxiliares:** `api-security` (primária), `spring-boot-4`, `database-performance`, `testing-quality`.

### Esqueleto de implementação (adaptação obrigatória ao projeto)
```java
public record ResourceOutput(UUID identifier, String name) {}

public interface ResourceRepository extends JpaRepository<ResourceEntity, Long> {
    Optional<ResourceEntity> findByIdentifierAndWorkspaceId(UUID identifier, Long workspaceId);
}

// O workspaceId abaixo é resultado de autorização no servidor, NÃO de header livre.
@Service
public class FindResource {
    private final ResourceRepository repository;
    public FindResource(ResourceRepository repository) { this.repository = repository; }

    @Transactional(readOnly = true)
    public ResourceOutput execute(UUID identifier, AuthorizedWorkspace workspace) {
        var entity = repository.findByIdentifierAndWorkspaceId(identifier, workspace.id())
            .orElseThrow(ResourceNotFoundException::new);
        return new ResourceOutput(entity.getIdentifier(), entity.getName());
    }
}
```
**Não é exemplo compilado**: `ResourceEntity`, `AuthorizedWorkspace` e `ResourceNotFoundException` representam contratos que precisam ser implementados no projeto; validação de JWT, concessões e resolver de contexto devem ocorrer antes do use case.

### Cenários obrigatórios de teste
| Cenário | Resultado |
| --- | --- |
| Identidade válida e grant para workspace A; recurso A | 200, DTO do recurso A |
| Identidade válida e grant A; UUID do recurso B | 404, sem dado B |
| Identidade válida e workspace B solicitado sem grant | 403 |
| Sem JWT | 401 |
| JWT expirado ou assinatura inválida | 401 |
| UUID inexistente no workspace autorizado | 404 |
| Recurso paginado/count/projeção | filtro de workspace em TODAS as consultas |
| Permissão revogada e cache de autorização | negar conforme política de revogação documentada |

### Execução prática reproduzível
1. Usar os testes já existentes em `Skills/laboratorio-spring-hibernate` para estudar cadeia HTTP/JWT e em `Skills/laboratorio-integracao` para isolamento de workspace em MySQL.
2. Criar uma implementação isolada e completa do caso acima (controller, DTO, resolver autenticado, entidade, repository, use case, exceções e teste Spring Security + MySQL Testcontainers).
3. Rodar `mvn -f Skills/laboratorio-spring-hibernate/pom.xml test` e `mvn -f Skills/laboratorio-integracao/pom.xml test` com JDK 25 e Docker.
4. Registrar falha anterior, mudança, comando, saída e limites. **Não declarar que o caso acima foi compilado** sem implementá-lo integralmente.

## Segundo caso — biblioteca compartilhada
**Requisito:** uma biblioteca com auto-configuração opcional não deve quebrar consumidores sem a dependência externa.
- Comparar classpath com e sem integração opcional.
- Verificar `@ConditionalOnClass`, `@ConditionalOnMissingBean` e propriedades tipadas, quando aplicáveis à versão efetiva.
- Testar consumidor sintético com parent/BOM real, dependências transitivas e substituição de bean.
- Verificar contratos públicos, versionamento e regressões; proibir publicação automática.
- Referência: documentação oficial Spring Boot 4, com verificação da versão efetiva no projeto.

## Formato de uma Skill orientada à execução
- **SKILL.md:** quando ativar, pré-condições, decisões não óbvias, referências práticas, gates.
- **references/RECEITA-*.md:** cenário, contrato, código compilável, testes negativos, comandos, falhas esperadas e rollback.
- **scripts/** (quando necessário): validadores determinísticos; scripts não substituem testes.
- **laboratorio-*/:** aplicação/testes isolados que CI realmente executa.
- **validacao/**: rastreabilidade `requisito → artefato → comando → resultado → limitações`.

## Backlog técnico ordenado
1. **P0** Converter o caso multi-workspace em teste HTTP Spring + MySQL real; evitar mocks de grants como única prova.
2. **P0** Criar consumidor sintético para biblioteca auto-configurada e testar condições positivas/negativas.
3. **P1** Criar receitas completas para transação + outbox, Redis stampede/lock e migration Flyway.
4. **P1** Tornar descriptions do frontmatter mais discriminantes e remover instruções duplicadas sem perder gates.
5. **P1** Executar A/B independente de Codex para medir qualidade, tempo, erros críticos e regressões.

## Escopo e honestidade
Esta pesquisa fundamenta a direção prática e apresenta contratos de execução. **Não substitui implementação de código compilável** nem teste A/B. Não alterar Golden sem autorização.
