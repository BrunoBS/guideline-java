# Refinamento V2 — Configuration: RedisStore por namespace e encapsulamento

**Data:** 2026-10-20  
**Status:** especificação para Codex; não implementado  
**Repositório documental:** `BrunoBS/guideline-java`  
**Destino:** `docs/refinamento/14-configuration/configuration-refinement-v2.md`  
**Execução:** três etapas independentes, iniciadas e validadas pelo repositório agregador Golden Platform.  
**Histórico:** preservar `configuration-refinement-v1.md` e os refinamentos Redis V3–V5; este documento altera somente a estratégia de injeção/isolamento Redis, sem redefinir regras de domínio.

## 1. Objetivo

Permitir múltiplos `RedisStore` no mesmo processo, cada um com `namespace` e `NamespaceMode` próprios, declarados no ponto de injeção por anotação, sem `@Bean` manual por namespace. Reutilizar a mesma `RedisConnectionFactory`, `StringRedisTemplate`, `RedisJsonCodec` e infraestrutura da `platform-redis`. Aplicar a evolução ao produtor da feature Configuration/Parameter no Workspace Service e ao `platform-parameter-client`.

Estabelecer também como **boa prática documental** o encapsulamento de `RedisStore` em uma implementação de uma **interface de negócio** do consumidor. Serviços e use cases devem depender da interface de negócio, não diretamente de Redis.

**Não fazer:** novo pool/conexão por namespace, acesso HTTP/DB no Parameter Client, cache local, prefixação manual de chave, alteração de contratos públicos `ParameterProvider`, mudança de regras de publicação/expressão, renomeação de chaves existentes, mudança de versão dos artefatos sem necessidade.

## 2. Baseline verificada e riscos

No `platform-redis` atual:
- `PlatformRedisAutoConfiguration` fornece `RedisAccess`, `RedisJsonCodec`, `RedisStore`, `AsyncRedisStore`, operações, publisher e streams.
- `PlatformRedisProperties` possui `namespace` e `namespaceMode` globais; `RedisAccess` calcula prefixo na construção; `DefaultRedisStore` recebe `StringRedisTemplate`, `RedisJsonCodec`, `RedisAccess`.
- `RedisAccess`: `SHARED` → `<namespace>:`; `ISOLATED` → `<namespace>.<spring.application.name>:`, ou `<spring.application.name>:` quando namespace vazio.
- `RedisStore.get()` valida chave pela infraestrutura, lê via script e desserializa; não impor regex de chave de negócio no cliente.

No `platform-parameter-client` atual, `ParameterClientAutoConfiguration` injeta o `RedisStore` global e exige `platform.redis.namespace-mode=SHARED` e `platform.redis.namespace=dynamic-parameter`. Isso impede usar o store padrão para outro namespace no mesmo serviço.

**Atenção:** o refinamento Configuration V1 documenta uma convenção física `config:` histórica. A implementação atual do Parameter Client adota `dynamic-parameter:<chave-logica>`. Na Onda 0, inspecionar o produtor real, os dados publicados e os testes; **não** executar migração ou trocar prefixo com base apenas no documento antigo. Se houver divergência, registrar e interromper a etapa dependente até confirmar o contrato vigente.

## 3. Contrato proposto de anotação

A API pública sugerida (nome final pode ser refinado preservando semântica):

```java
@Target({ElementType.PARAMETER, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RedisNamespace {
    String value();
    NamespaceMode mode() default NamespaceMode.ISOLATED;
}
```

Exemplo de uso, **após implementação da Etapa 1**:

```java
@Repository
public class RedisSessionRepository implements SessionRepository {
    private final RedisStore store;

    public RedisSessionRepository(
        @RedisNamespace(value = "session", mode = NamespaceMode.ISOLATED)
        RedisStore store
    ) {
        this.store = store;
    }
}
```

E no Parameter Client:

```java
@Bean
ParameterProvider parameterProvider(
    @RedisNamespace(value = "dynamic-parameter", mode = NamespaceMode.SHARED)
    RedisStore store,
    RedisJsonCodec codec
) {
    return new RedisParameterProvider(store, codec);
}
```

**Obrigação técnica:** anotações em parâmetros não alteram a resolução de dependências por si só. Implementar e testar integração real com resolução de argumentos de construtores Spring e métodos `@Bean`; escolher mecanismo Spring apropriado após POC (qualifier dinâmico, resolvedor de dependências, registro de beans qualificados ou equivalente). Não entregar anotação meramente decorativa. Não pressupor que `@Qualifier` convencional crie beans dinamicamente. Não introduzir comportamento frágil por ordem de inicialização.

### Semântica obrigatória

- Sem anotação: `RedisStore` padrão permanece exatamente como hoje, com `platform.redis.*`.
- Com anotação: `RedisStore` específico ao par (`mode`, `namespace`); não altera `RedisAccess` global.
- `SHARED("dynamic-parameter")` produz `dynamic-parameter:<chave>` independentemente do nome da aplicação.
- `ISOLATED("session")` produz `session.<spring.application.name>:<chave>`; seguir validação existente de `RedisAccess`.
- Mesmo par (`mode`, `namespace`) pode reutilizar instância; pares diferentes nunca compartilham prefixo por engano. Cuidado com escopo por application context.
- Todos reutilizam a mesma infraestrutura de conexão e codec; sem duplicar templates/pools.
- Validação de namespace, limites de bytes, chave, erros e segurança permanece centralizada no `platform-redis`.
- Falhar cedo com mensagem padronizada quando configuração ou resolução for inválida; nunca cair silenciosamente no store padrão.
- Manter `RedisStore` sem anotação injetável de forma não ambígua mesmo com múltiplos stores; testar `@Primary`, qualifiers e overrides do consumidor.
- Se a abordagem de resolução dinâmica não for robusta para construtores e `@Bean`, documentar a limitação e propor API alternativa antes de avançar; não simular suporte incompleto.

## 4. Etapa 1 — Platform Redis (executar e validar isoladamente)

**Repositório:** `BrunoBS/platform-libraries` — módulo `platform-redis`.  
**Dependência:** nenhuma das outras duas etapas deve iniciar antes de esta estar validada.

### Onda 0 — inspeção
1. Inspecionar código vigente de `PlatformRedisAutoConfiguration`, `PlatformRedisProperties`, `RedisAccess`, `DefaultRedisStore`, `AsyncRedisStore`, `RedisJsonCodec`, testes e exemplos.
2. Verificar pontos de extensão do Spring Boot 4 / Spring Framework atual e comportamento real de injeção de dependências, incluindo `@Bean`, construtores, `@Primary` e AOT quando aplicável.
3. Inspecionar o agregador Golden e a forma como submódulos, build e documentação estão vinculados; registrar SHAs iniciais.

### Implementação
1. Criar anotação pública `@RedisNamespace` e usar `PlatformRedisProperties.NamespaceMode` ou enum público equivalente sem duplicar semântica.
2. Criar infraestrutura de resolução/factory de `RedisStore` por escopo, reutilizando `StringRedisTemplate`, `RedisJsonCodec`, `RedisConnectionFactory` existentes e um `RedisAccess` específico por namespace.
3. Preferir extrair criação de store para factory interna reutilizável, evitando cópia de código; não modificar `DefaultRedisStore` para manter estado mutável de namespace.
4. Preservar auto-configuração do store padrão e compatibilidade com consumidores atuais. Garantir que injeção sem anotação continue determinística.
5. Decidir explicitamente se a anotação nesta versão se aplica **somente a `RedisStore` síncrono**. Não estender automaticamente a `AsyncRedisStore`, `RedisOperations`, pub/sub, streams ou cache sem contrato/testes próprios. Documentar a fronteira.
6. Garantir compatibilidade com configuração `platform.redis.enabled` e com beans personalizados fornecidos pela aplicação. Evitar criar store anotado se infraestrutura estiver desabilitada.
7. Manter o namespace como escopo de prefixo, **não** como mecanismo de autorização/segurança; documentar isso.

### Testes obrigatórios
- Três stores simultâneos: padrão isolado, `SHARED("dynamic-parameter")`, `ISOLATED("session")`; escrita e leitura sem colisão.
- Dois consumidores do mesmo namespace; namespaces diferentes; chaves idênticas em stores distintos.
- Injeção por construtor e por argumento de método `@Bean`; bean padrão sem anotação.
- Teste real de integração com Redis Testcontainers via `platform-testing-redis`; confirmar chaves físicas e ausência de dupla prefixação.
- Invalid namespace, app name ausente para ISOLATED, limite de chave, configuração desabilitada, override de beans e inicialização em ordem diferente.
- Verificar que uma store não altera `RedisAccess` de outra; TTL, `setAll/getAll` e serialização mantidos.
- Testes de arquitetura/compilação Java 25 + Spring Boot 4; testes de regressão da suíte Redis.

### Documentação
- Atualizar `modules/platform-redis/README.md`, documentação técnica da biblioteca e guias correspondentes na Golden.
- Adicionar seção **Padrão Golden — encapsular Redis em interface de negócio**, com exemplo completo de `SessionRepository`, `RedisSessionRepository` e `SessionService`; explicar que é padrão recomendado para acessos de negócio, não exigência de interface redundante em todo componente interno.
- Documentar namespace default, SHARED/ISOLATED, vários stores, compartilhamento de conexão, limites, testes e migração do modo global.
- Identificar claramente exemplos propostos vs. funcionalidade efetivamente implementada.

**Gate de conclusão:** build e testes verdes; demonstração de três namespaces no mesmo contexto; nenhum consumidor existente quebrado; documentação consistente. Commit/PR da Etapa 1 isolado.

## 5. Etapa 2 — Platform Parameter Client (após gate da Etapa 1)

**Repositório:** `BrunoBS/platform-libraries` — módulo `platform-parameter-client`.

### Implementação
1. Atualizar dependência para versão/commit que contenha a Etapa 1, seguindo parent/BOM e política de versões vigentes.
2. Alterar `ParameterClientAutoConfiguration` para injetar `RedisStore` anotado `@RedisNamespace(value="dynamic-parameter", mode=SHARED)`.
3. Remover validação de `PlatformRedisProperties.namespaceMode()/namespace()` global e mensagem de erro que obrigava a aplicação a configurar o namespace padrão como `dynamic-parameter`.
4. Manter `ParameterProvider` como interface pública e `RedisParameterProvider` como implementação interna. Não expor `RedisStore` aos consumidores de parâmetros.
5. Preservar `get`, `matches`, tipos, erros, fallback, envelope JSON, precisão numérica e leitura somente; não reintroduzir regex de formato da chave no cliente (regra de cadastro pertence ao produtor). Manter checagem nulo/vazio e validações genéricas da infraestrutura.
6. Garantir coexistência de `ParameterProvider` e `RedisStore` padrão de outra feature no mesmo processo.

### Testes obrigatórios
- `ParameterProvider` resolve `dynamic-parameter:<chave>` mesmo com `platform.redis.namespace` global diferente e `ISOLATED`.
- Aplicação com Parameter Client + store padrão + outro store anotado.
- Todos os testes de `get`, `matches`, ausência, TTL, erros, payload inválido e precisão numérica.
- Teste de auto-configuração real do argumento `@RedisNamespace`; verificar ausência de prefixo duplo.
- Ajustar testes antigos que exigiam namespace global e testes de regex de chave do cliente.

### Documentação
- Atualizar README do módulo, exemplos de configuração e guia da Golden.
- Explicar que consumidor injeta somente `ParameterProvider`; namespace interno é fixo e transparente.
- Remover exemplos exigindo `platform.redis.namespace=dynamic-parameter` global.
- Corrigir links de documentação e atualizar índices quando necessário; verificar arquivos/branches reais antes de criar links.

**Gate de conclusão:** testes e build verdes; nenhum ajuste exigido nos serviços que já injetam `ParameterProvider`; PR/commit isolado.

## 6. Etapa 3 — Workspace Service / produtor Parameter (após gate da Etapa 2)

**Repositório:** localizar o Workspace Service efetivo no Golden (historicamente `BrunoBS/account-service`; não presumir nome/pasta sem inspeção).

### Onda 0 — localizar implementação real
1. Identificar a feature atual (`Configuration` ou `Parameter`), seu publisher/synchronizer/reconciliation e uso de `RedisStore`.
2. Inspecionar o contrato físico de chave e payload realmente publicados, inclusive prefixos, testes e eventuais migrações.
3. Confirmar que produtor e cliente utilizam o mesmo Redis físico/ambiente e mesma chave lógica; não mudar regra de negócio.

### Implementação
1. Encapsular o acesso Redis de publicação/reconciliação em uma implementação dedicada de interface de negócio, por exemplo `ParameterPublicationStore` ou nome alinhado ao domínio existente. **Reutilizar abstração existente** caso já exista; não criar camada duplicada.
2. Injetar `@RedisNamespace(value="dynamic-parameter", mode=SHARED) RedisStore` somente na implementação de infraestrutura.
3. Remover dependência da configuração global `platform.redis.namespace=dynamic-parameter` e prefixações manuais redundantes, após verificar o formato físico vigente.
4. Preservar publicação após commit, lote, reconciliação, exclusão/inativação, TTL, tratamento de falhas, i18n, observabilidade e autorização.
5. Não alterar schema, migrations, API REST, formato do envelope ou regras de validação da chave de cadastro nesta etapa.
6. Não executar migração/renomeação de chaves sem plano explícito; se a inspeção revelar dados legados divergentes, registrar bloqueio e plano separado.

### Testes obrigatórios
- Publicar no Workspace Service e ler via `ParameterProvider` em teste de integração ponta a ponta usando Redis real; cobrir CONFIGURATION e EXPRESSION/`matches`.
- Atualização, republicação, inativação/delete, reconciliação, publicação em lote e isolamento de namespace.
- Mesmo contexto Spring com outro `RedisStore` padrão; garantir ausência de contaminação.
- Verificar formato exato `dynamic-parameter:<chave-logica>`, sem `config:` adicional e sem prefixo duplicado, **somente após confirmação do contrato vigente**.
- Validar falhas Redis após commit sem falsa atomicidade com MySQL.

### Documentação
- Atualizar documentação da feature no Workspace Service, guia Golden do produtor e diagramas de fluxo.
- Documentar separação entre validação da chave na criação (produtor) e leitura (cliente).
- Explicitar contrato compartilhado produtor/cliente, formato físico, envelope e estratégia de reconciliação.
- Remover configurações globais obsoletas e corrigir referências de módulos/submódulos.

**Gate de conclusão:** integração real produtor→Redis→cliente verde; regressões verdes; documentação e exemplo Golden atualizados; PR/commit isolado.

## 7. Execução obrigatória pelo Golden Platform (teste de submódulos)

O Codex deve iniciar **cada etapa separadamente** a partir do repositório Golden Platform, utilizando os submódulos reais, sem copiar fontes para o agregador e sem modificar repositórios errados.

1. Antes de cada etapa: `git status`, `git submodule status`, `git submodule update --init --recursive`; conferir branch, SHA e árvore limpa. Não presumir que submódulo acompanha automaticamente `main`.
2. Criar branch de trabalho no **repositório do submódulo correspondente**; implementar, testar e documentar nele. Não fazer commit apenas do gitlink sem ter commitado o código no repositório filho.
3. Executar testes do módulo e de integração conforme dependências; registrar comandos e resultados.
4. Após commit no filho, atualizar explicitamente o gitlink correspondente no Golden e verificar que aponta para commit remoto acessível. Se bibliotecas estiverem publicadas em GitHub Packages, verificar disponibilidade/versionamento para o consumidor antes da etapa seguinte.
5. Atualizar documentação do agregador quando aplicável, em commit/PR próprio. Não misturar três etapas em um único commit/PR.
6. Não fazer merge, push em `main`, publicação de pacote, limpeza de artefatos ou alteração de branches protegidas sem autorização explícita. Se o fluxo exigir publicação intermediária, apresentar a necessidade e aguardar decisão.
7. Relatório de cada etapa: arquivos alterados, testes executados, SHA do filho, SHA/gitlink do Golden, configuração usada, documentação atualizada, riscos e próximo gate.

## 8. Matriz de aceite transversal

| Requisito | Etapa 1 | Etapa 2 | Etapa 3 |
|---|---|---|---|
| Vários stores/namespace no mesmo contexto | implementar/testar | consumir/testar | consumir/testar |
| Store padrão retrocompatível | obrigatório | verificar | verificar |
| Mesma conexão/codec, sem pool extra | obrigatório | verificar | verificar |
| Interface de negócio encapsulando Redis | documentar exemplo | manter `ParameterProvider` | implementar/reutilizar |
| Chave física e envelope estáveis | infraestrutura | leitura | publicação E2E |
| Testcontainers e regressões | Redis | Client | produtor+cliente |
| Docs do módulo e Golden | obrigatório | obrigatório | obrigatório |
| Commits/PRs e gates separados | obrigatório | obrigatório | obrigatório |

## 9. Prompt operacional para Codex

> Leia integralmente `docs/refinamento/14-configuration/configuration-refinement-v2.md` no repositório `BrunoBS/guideline-java`. Trabalhe a partir do agregador Golden Platform, inspecione os submódulos reais e execute **somente a etapa explicitamente solicitada pelo usuário** (1, 2 ou 3). Faça Onda 0 de inspeção antes de editar. Preserve contratos existentes, implemente com testes reais, atualize documentação do módulo e Golden, registre SHA/gitlink e reporte o gate. Não antecipe etapas, não faça merge nem publique artefatos sem autorização.
