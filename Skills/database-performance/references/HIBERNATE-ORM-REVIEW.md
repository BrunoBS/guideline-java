# Hibernate ORM 7 / Spring Data JPA — consultas de alta escala

Fontes: https://docs.hibernate.org/orm/7.1/userguide/html_single/ e https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html

## N+1 e carregamento
- Observar SQL gerado, número de round trips por página e payload real; não diagnosticar apenas olhando anotações.
- Escolher fetch plan por caso de uso: DTO projection, entity graph, join fetch, batch fetching, subselect.
- **Cuidado:** collection fetch join + paginação pode provocar paginação em memória ou erro conforme configuração. Validar comportamento e considerar consulta paginada de IDs seguida de segunda busca.
- Fetch join de múltiplas coleções pode multiplicar linhas; testar cardinalidade.
- Não converter todas associações para EAGER como correção global.

## Segurança e multitenancy
- Verificar que filtro de tenant/workspace aplica-se a cada consulta, inclusive projections, native SQL, count, segunda etapa e carregamento de associações.
- Testar tenant A/B com IDs de mesma forma e requisições sem contexto.
- Nunca remover filtro de segurança para resolver N+1.

## Paginação
- `Page<T>` pode exigir count custoso; `Slice<T>` e `Window<T>` podem ser alternativas conforme contrato.
- Keyset exige ordenação estável, campos de ordenação presentes na projeção, tratamento de nulls e índice adequado.
- Verificar se ordenação e filtros são controlados; nunca concatenar entrada de usuário em SQL.

## Transação e concorrência
- Evitar transação longa envolvendo HTTP remoto; medir locks e tempo de conexão.
- Considerar optimistic locking para lost updates; idempotência para retries de escrita.
- Verificar flush, dirty checking, cascades, batch insert/update, fetch size e nível de isolamento antes de tuning.

## Evidência obrigatória
SQL emitido, versão ORM, plano, volume, taxa de consultas, tempo de banco, teste com e sem alteração e cobertura de isolamento.
