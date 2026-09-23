# Feature --- Transferência e Cópia de Configurações

## 1. Objetivo

Definir uma nova feature para transferência e cópia de configurações
entre aplicações, inclusive quando as aplicações pertencem a
workspaces/contas diferentes.

Esta feature é independente do lifecycle. O lifecycle pode servir como
referência arquitetural, mas transferência/cópia possui regras, fluxo e
governança próprios.

------------------------------------------------------------------------

## 2. Escopo

A unidade movimentada é a **configuração/feature**, e não a aplicação
inteira.

Uma aplicação não será transferida entre workspaces. Quando necessário,
uma nova aplicação deverá ser criada no workspace de destino e as
configurações desejadas poderão ser transferidas ou copiadas para ela.

A operação poderá ocorrer:

-   entre aplicações do mesmo workspace;
-   entre aplicações de workspaces diferentes.

------------------------------------------------------------------------

## 3. Operações

### 3.1 Transferir

Transferir equivale conceitualmente a **recortar**:

-   a configuração deixa de pertencer à aplicação de origem;
-   passa a pertencer à aplicação de destino;
-   o `resourceIdentifier` é preservado;
-   o histórico anterior não é alterado;
-   um novo evento registra a transferência.

### 3.2 Copiar

Copiar equivale conceitualmente a **duplicar**:

-   a configuração original permanece na origem;
-   uma nova configuração é criada no destino;
-   a nova configuração recebe um novo `resourceIdentifier`;
-   deve existir rastreabilidade da configuração que originou a cópia;
-   um novo evento registra a operação de cópia.

------------------------------------------------------------------------

## 4. Histórico e auditoria

Eventos históricos são imutáveis.

Uma transferência nunca altera eventos anteriores para fazê-los apontar
para a nova aplicação ou workspace.

Exemplo:

1.  configuração criada na aplicação A;
2.  configuração alterada na aplicação A;
3.  configuração transferida de A para B;
4.  novas alterações passam a ocorrer no contexto da aplicação B.

Os eventos 1 e 2 continuam associados à aplicação A. O evento 3
representa explicitamente a mudança de ownership. Os eventos posteriores
pertencem ao contexto B.

### 4.1 Restore

Restaurar uma versão anterior recupera apenas o conteúdo versionável da
configuração.

O restore **não restaura ownership** e não transfere implicitamente a
configuração para a aplicação anterior.

Campos contextuais, como `applicationIdentifier` e workspace/conta, não
devem ser restaurados pelo rollback.

Para devolver uma configuração a outra aplicação, deve ser criada uma
nova operação explícita de transferência.

### 4.2 Visibilidade do histórico

O histórico físico completo permanece preservado, mas sua visibilidade
respeita autorização.

Na visão normal de uma aplicação/workspace, o usuário visualiza somente
eventos pertencentes aos contextos aos quais possui acesso.

Após uma transferência entre contextos, eventos anteriores podem não
aparecer na tela normal do destino.

Uma visão administrativa/global de auditoria poderá consultar a vida
completa do recurso pelo `resourceIdentifier`, atravessando aplicações e
workspaces, desde que o operador possua autorização transversal.

Portanto:

> histórico físico e histórico visível são conceitos diferentes.

------------------------------------------------------------------------

## 5. Solicitação em lote

Transferência e cópia utilizam um único modelo de **solicitação em
lote**.

Mesmo uma solicitação contendo apenas uma configuração é tratada como um
lote de um item.

O lote contém exatamente o conjunto submetido para aprovação.

Depois de enviado para aprovação:

-   o lote fica congelado;
-   itens não podem ser adicionados ou removidos;
-   alterações exigem cancelamento da solicitação e criação de uma nova.

A intenção de negócio é que o conjunto aprovado corresponda exatamente
ao conjunto executado.

A estratégia técnica para garantir atomicidade, rollback ou compensação
será definida na etapa de desenho da orquestração.

------------------------------------------------------------------------

## 6. Aprovação obrigatória

Toda operação de **transferência ou cópia** exige:

-   um solicitante;
-   um aprovador;
-   solicitante administrador;
-   aprovador administrador;
-   solicitante e aprovador obrigatoriamente pessoas diferentes.

Essa regra é global e não depende de:

-   origem e destino estarem no mesmo workspace;
-   origem e destino estarem em workspaces diferentes;
-   tipo de configuração;
-   quantidade de itens no lote.

Não existe autoaprovação.

------------------------------------------------------------------------

## 7. Autorização

Além dos papéis administrativos exigidos pelo fluxo de aprovação, a
operação deve validar autorização sobre os dois lados envolvidos.

Para uma movimentação entre aplicação A e aplicação B, as permissões
necessárias sobre origem e destino devem ser verificadas.

Quando a operação atravessar workspaces/contas, também devem ser
verificadas as permissões aplicáveis aos contextos de origem e destino.

Nenhuma configuração pode ser transferida ou copiada diretamente para um
contexto que não esteja autorizado no fluxo.

------------------------------------------------------------------------

## 8. Responsabilidade dos domínios

Cada domínio é responsável somente pelos recursos que possui.

Exemplos:

-   domínio de Keys executa operações sobre Keys;
-   domínio de Menu executa operações sobre Menu;
-   domínio de Routes executa operações sobre Routes.

Um domínio não deve acessar diretamente a persistência de outro domínio
para realizar transferência ou cópia.

A regra é:

> governança e coordenação são centralizadas; regra específica de
> domínio permanece no domínio.

Cada domínio implementará o **core de transferência/cópia** dos próprios
recursos.

------------------------------------------------------------------------

## 9. Orquestração central

A feature terá o conceito de uma camada central de
governança/orquestração.

Responsabilidades previstas para essa camada:

-   criação da solicitação;
-   gerenciamento do lote;
-   validações transversais;
-   fluxo de aprovação;
-   separação entre solicitante e aprovador;
-   autorização de origem e destino;
-   congelamento do lote após submissão;
-   estados da operação;
-   coordenação dos domínios participantes;
-   acompanhamento da execução;
-   consolidação do resultado;
-   integração com auditoria.

A camada central **não deve implementar a regra interna das features**
nem manipular diretamente suas tabelas.

Os domínios participantes recebem a intenção de operação e executam sua
própria regra.

------------------------------------------------------------------------

## 10. Relação com motor de promoção

Foi identificada semelhança conceitual com um **motor de promoção**.

Em ambos os casos existe um fluxo coordenado que:

1.  recebe uma operação;
2.  aplica governança;
3.  identifica participantes;
4.  solicita execução aos domínios;
5.  acompanha resultados;
6.  conclui a operação.

A principal diferença está na semântica:

-   promoção: movimentação/publicação entre ambientes;
-   transferência/cópia: mudança ou duplicação de configuração entre
    aplicações/workspaces.

### Hipótese arquitetural

Deve ser estudada futuramente a possibilidade de existir uma abstração
comum de **operações governadas**, da qual Promotion e Transfer/Copy
seriam tipos de operação.

Essa hipótese **não é uma decisão arquitetural fechada**.

Deve-se evitar generalização prematura ou criação de um motor genérico
excessivamente complexo.

------------------------------------------------------------------------

## 11. Platform Libraries

A utilização da `platform-libraries` faz parte da análise arquitetural
futura.

Hipótese atual:

-   contratos comuns;
-   modelos compartilhados;
-   abstrações para participação dos domínios;
-   componentes de integração reutilizáveis.

Ainda **não está decidido** que a `platform-libraries` será responsável
pelo workflow persistente ou pela própria orquestração.

A definição do owner do estado da operação deverá ocorrer no desenho
arquitetural da segunda etapa.

------------------------------------------------------------------------

## 12. Decisões fechadas

1.  Transferência/cópia é uma feature própria e possui MD próprio.
2.  Aplicações inteiras não serão transferidas entre workspaces.
3.  Configurações podem ser transferidas entre aplicações,
    independentemente do workspace.
4.  Transferência preserva o `resourceIdentifier`.
5.  Cópia cria novo `resourceIdentifier` e mantém referência de origem
    para rastreabilidade.
6.  Eventos históricos nunca são reescritos.
7.  Toda transferência ou cópia gera novo evento.
8.  Restore não altera ownership.
9.  Histórico global existe, mas sua visualização depende de
    autorização.
10. Operações utilizam lote, inclusive quando existe apenas um item.
11. O lote fica imutável após submissão para aprovação.
12. Transferência e cópia sempre exigem solicitante e aprovador.
13. Solicitante e aprovador devem ser administradores.
14. Solicitante e aprovador não podem ser a mesma pessoa.
15. Origem e destino devem passar pelas validações de autorização
    aplicáveis.
16. Governança/orquestração é centralizada.
17. Cada domínio executa somente o core correspondente aos recursos que
    possui.

------------------------------------------------------------------------

## 13. Pontos arquiteturais pendentes

A segunda etapa deverá definir:

-   onde vive fisicamente o orquestrador;
-   owner da persistência de solicitação, lote, aprovação e execução;
-   papel exato da `platform-libraries`;
-   contrato entre orquestrador e domínios;
-   comunicação síncrona, assíncrona ou híbrida;
-   modelo de estados da operação e dos itens;
-   tratamento de timeout;
-   idempotência;
-   retries;
-   atomicidade entre múltiplos domínios;
-   rollback e/ou compensação;
-   comportamento diante de falha parcial;
-   concorrência e bloqueio de recursos durante a execução;
-   integração detalhada com auditoria;
-   relação com o motor de promoção;
-   viabilidade de uma abstração comum de operações governadas.

------------------------------------------------------------------------

## 14. Próxima etapa

Realizar uma discussão arquitetural específica para desenhar a
orquestração antes de iniciar implementação.

O objetivo será decidir se Transfer/Copy possuirá um orquestrador
próprio, reutilizará conceitos do motor de promoção ou participará de
uma abstração comum, preservando sempre a autonomia dos domínios.