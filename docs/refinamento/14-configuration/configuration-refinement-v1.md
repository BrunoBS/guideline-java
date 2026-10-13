# Refinamento V1 — Configuration

**Projetos:** workspace-service e platform-libraries  
**Status:** Proposta para implementação — Golden Reference  
**Local:** docs/refinamento/configuration-refinement-v1.md

## 1. Objetivo
Centralizar parâmetros de configuração da plataforma e das features no workspace-service, persistidos em banco relacional e publicados em Redis compartilhado. Microsserviços consumidores leem somente o Redis por meio da platform-libraries.

## 2. Escopo e decisões
- Configurações globais pertencem à feature fixa `PLATFORM`, cadastrada por migration e protegida contra exclusão/inativação.
- Configurações específicas pertencem a uma feature existente no catálogo; usar a referência dessa tabela, sem duplicar cadastros.
- A chave lógica é totalmente qualificada: `platform.quarantineDays`, `workspace.quarantineDays`, `key-service.quarantineDays`. O código usado deve ser o código canônico da feature, com normalização definida pelo catálogo.
- Não existe herança nem fallback entre features. `PLATFORM` não é fallback automático.
- O consumidor informa explicitamente o nome completo da chave e, opcionalmente, um valor default local.
- Banco de dados é a fonte de verdade; Redis é cache compartilhado.
- V1 sem outbox transacional, cache local ou acesso ao banco pelos consumidores.

## 3. Modelo de dados
Criar entidade/tabela de configuração com:
- `id`: identificador interno, conforme padrão do projeto;
- `identifier`: UUID público, se aplicável ao padrão Golden;
- `feature_id`: FK obrigatória para o catálogo de features, inclusive `PLATFORM`;
- `key`: nome da chave dentro da feature;
- `value`: valor da configuração, aceitando JSON;
- `lifecycle`: ACTIVE/INACTIVE, seguindo catálogo e convenções existentes.
- Campos de auditoria conforme padrão já adotado no workspace-service.

Impor unicidade de `(feature_id, key)`. Validar chave não vazia, feature existente e valor JSON válido quando armazenado como JSON. Definir representação de strings e tipos primitivos de forma consistente na publicação e na leitura. Não persistir segredos sem uma política específica de segurança.

## 4. Endpoints e casos de uso
- `POST`: criar configuração; persistir e, após commit, publicar sua chave no Redis.
- `PUT`: atualizar configuração; persistir e, após commit, publicar a versão atual.
- `GET` por identificador e `GET` paginado/filtros: consulta administrativa ao banco.
- `PATCH` de lifecycle: ativar/inativar; refletir o estado publicado no Redis.
- `PATCH` de publish: republicar todas as configurações ou apenas as de uma feature, lendo o banco; não modificar dados de negócio.
- Exclusão física, se oferecida, deve obedecer às regras de lifecycle e retirar a chave do Redis.

Usar Request/Response nos controllers, Command/Query e use cases separados, validações centralizadas, autorização administrativa e mensagens de erro padronizadas conforme a Golden Reference. Rotas exatas devem respeitar as convenções existentes do repositório.

## 5. Contrato de publicação no Redis
Chave física padronizada: `config:<feature>:<key>`, por exemplo `config:platform:quarantineDays`. A biblioteca deve receber a chave lógica completa (`platform.quarantineDays`) e transformá-la no nome físico de maneira determinística, sem colisões. Não assumir que nomes de features ou keys nunca contêm pontos: estabelecer validação/escape no contrato.

Publicar somente configurações ACTIVE. Inativação, remoção ou republicação integral devem eliminar entradas obsoletas do namespace gerenciado, sem apagar chaves de outros módulos. Preferir operação idempotente. Não expirar entradas por TTL sem estratégia de reposição definida, pois uma expiração silenciosa produziria ausência de configuração.

### Três gatilhos de publicação
1. **Automático:** após POST/PUT e alterações de lifecycle, depois do commit do banco, atualizar ou remover somente a chave afetada.
2. **Manual:** PATCH administrativo republica tudo ou uma feature selecionada, usando o estado atual do banco.
3. **Agendado:** scheduler a cada uma hora reconcilia Redis e banco.

Todos devem reutilizar o mesmo serviço de publicação. Com múltiplas instâncias, evitar execuções simultâneas do job (lock distribuído ou execução única conforme infraestrutura). Evitar que um snapshot antigo sobrescreva uma gravação mais nova; serializar por chave, usar versão/controle de ordem ou reconciliar novamente após concorrência. O mecanismo concreto deve seguir a infraestrutura disponível e ser testado.

### Consistência e recuperação
Banco e Redis não participam da mesma transação ACID. Falha na publicação após commit não deve ser tratada como rollback da gravação: registrar erro, sinalizar a condição conforme contrato e permitir republicação manual/agendada. A sincronização horária recupera divergências; pode existir defasagem temporária. Testar Redis vazio, indisponível, remoção de chave, mudança de lifecycle e publicação concorrente.

## 6. platform-libraries — módulo de consumo
Criar módulo/componente compartilhado de configuração, com nome final alinhado à estrutura real do projeto (sugestão: `platform-configuration`), auto-configurável pelo Spring Boot quando habilitado e com conexão Redis provida pela infraestrutura padrão.

Contrato sugerido:
```java
public interface ConfigurationProvider {
    <T> T get(String key, T defaultValue);
}
```

Exemplo:
```java
int quarantineDays = configurationProvider.get("platform.quarantineDays", 30);
```

- Chave existente e válida: retornar valor convertido ao tipo esperado.
- Chave inexistente: retornar o `defaultValue` informado pelo próprio consumidor, sem consultar `PLATFORM` nem qualquer outra feature.
- Redis indisponível: lançar exceção controlada no padrão Golden; não confundir falha de infraestrutura com chave ausente.
- Valor incompatível com o tipo solicitado: erro de conversão controlado; não mascarar como ausência.
- Para objetos JSON e coleções, prever sobrecarga com tipo explícito (`Class<T>` ou `TypeReference<T>`) para evitar problemas de generics/type erasure.
- Não acessar banco, workspace-service ou outro serviço HTTP; não implementar cache local na V1.
- Não adicionar dependências novas sem aprovação, conforme governança Golden.

## 7. Segurança e observabilidade
Restringir mutações e republicação a perfis administrativos; leituras administrativas seguem autorização e visibilidade existentes. Não registrar valores sensíveis nos logs. Incluir correlation-id, resultado da publicação, feature e chave sem expor payloads. Monitorar falhas de sincronização usando mecanismos já existentes; não introduzir framework de métricas não aprovado.

## 8. Testes e critérios de aceite
- Criar/atualizar configuração grava no banco e publica no Redis após commit.
- Chaves com o mesmo nome em features distintas não colidem.
- `PLATFORM` é fixa e protegida.
- Configuração inativa não permanece disponível no Redis após reconciliação.
- Publicação manual funciona para todas e para uma feature; job horário reconcilia inclusive remoções.
- Falha do Redis não causa falsa afirmação de rollback no banco; republicação recupera.
- `get(key, defaultValue)` devolve valor configurado ou default apenas quando a chave não existe.
- Não há fallback automático para `PLATFORM`.
- Erros de Redis e conversão seguem padrão de exceptions e mensagens.
- Testar serialização JSON, tipos primitivos, concorrência, idempotência e múltiplas instâncias.
- Testes unitários, integração e arquitetura conforme padrões Golden; sem alterar módulos fora do escopo.

## 9. Orientação ao Worker
Antes de implementar, inspecionar os repositórios workspace-service, platform-libraries e as diretrizes de guideline-java. Reutilizar catálogos, lifecycle, autorização, mensagens, arquitetura de pacotes e infraestrutura Redis existentes. Documentar decisões técnicas não especificadas, sem inventar contratos incompatíveis. Entregar alterações por projeto, com testes e evidências, sem adicionar dependências não autorizadas.
