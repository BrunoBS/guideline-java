# Golden Governance v1

> **Status:** Draft 0.2  
> **Objetivo:** estabelecer uma governança de trabalho determinística, rastreável, independente de ferramenta e aplicável igualmente a pessoas e agentes.

## 1. Objetivo

A Golden Governance define políticas, estados, gates, responsabilidades e evidências para conduzir um Work Item desde sua origem até sua entrega.

A governança não deve depender de uma ferramenta específica. GitHub, GitLab, Azure DevOps, Harness ou outras plataformas são implementações do processo, e não o processo em si.

## 2. Princípios

### 2.1 Tool-agnostic

A Golden define o processo e suas políticas. Cada ferramenta implementa esse contrato conforme suas capacidades.

### 2.2 Actor-agnostic

O processo deve funcionar da mesma forma independentemente de quem executa uma atividade:

- HUMAN
- AGENT

As regras de governança, rastreabilidade e qualidade não mudam em função do executor.

### 2.3 Processo determinístico

Dadas as mesmas condições, um Work Item deve seguir as mesmas regras de entrada, validação, transição e saída.

### 2.4 Mínimo obrigatório e extensível

A V1 deve exigir somente o necessário para garantir clareza, segurança e rastreabilidade. Regras adicionais podem ser introduzidas conforme risco, contexto ou maturidade.

### 2.5 Evidência e rastreabilidade

Transições relevantes devem preservar evidências suficientes para permitir auditoria posterior, incluindo ator, instante, decisão e justificativa quando aplicável.

## 3. Work Item

Work Item é a unidade abstrata de trabalho da Golden Governance.

Uma ferramenta pode representá-lo como Issue, Story, Task, Ticket ou estrutura equivalente.

### 3.1 Origens e tipos

Um Work Item pode nascer de:

- solicitação de negócio ou nova funcionalidade;
- melhoria;
- bug ou incidente;
- dívida técnica;
- segurança ou compliance;
- manutenção técnica;
- descoberta durante análise, implementação ou revisão;
- pesquisa ou Spike;
- POC, quando for necessária implementação experimental para comprovar viabilidade.

Spike e POC não são equivalentes. Spike reduz incerteza e produz conhecimento. POC implementa experimentalmente uma hipótese para comprovar sua viabilidade.

## 4. Lifecycle consolidado

O lifecycle oficial do Work Item foi consolidado na Parte 2:

```text
Backlog
  -> Em Refinamento
  -> Pronto para Execução
  -> Em Desenvolvimento
  -> Em Revisão
  -> Em Homologação
  -> Pronto para Produção
  -> Em Produção
  -> Concluído
```

DoR, priorização, Code Review, Acceptance Validation, gestão de mudança, validação de produção e observação são **gates ou atividades do fluxo**, e não estados adicionais.

A Parte 1 detalha o nascimento, refinamento, priorização e entrada em execução. A Parte 2, em `golden-governance-v1-parte-2-feature-promotion-release.md`, detalha a execução, promoção, revisão, homologação, produção e conclusão.

Cada transição deve preservar timestamp e ator quando aplicável para permitir métricas de fluxo e auditoria.

## 5. Refinement

Todo Work Item passa por refinamento antes da execução.

A profundidade do refinamento pode variar conforme tipo, risco, urgência e complexidade, mas existe um mínimo obrigatório.

### 5.1 Conteúdo mínimo

O refinamento deve identificar:

- repositório;
- feature, domínio ou área afetada;
- contexto e evidência do que está acontecendo;
- motivo e impacto;
- resultado esperado;
- critérios de aceite.

O refinamento define principalmente **o resultado esperado**, e não obrigatoriamente **como implementar**.

Uma solução técnica pode ser registrada quando necessária, mas não é requisito universal do refinamento.

## 6. Acceptance Criteria

Critérios de aceite respondem:

> Como sabemos que o comportamento ou resultado esperado está correto?

Eles fazem parte das informações usadas pelo Definition of Ready, mas não são equivalentes ao DoR.

## 7. Definition of Ready — DoR

O DoR é o gate que determina se existe informação suficiente para permitir que o Work Item avance com segurança.

Resultado do gate:

- **PASS:** o Work Item pode concluir o Refinement e, após a priorização aplicável, tornar-se **Pronto para Execução**.
- **FAIL:** o Work Item permanece **Em Refinamento** e as pendências devem ser registradas.

A validação deve preservar, quando aplicável:

- resultado;
- ator que validou;
- timestamp;
- evidência ou pendências.

A autoridade de aprovação do DoR pode variar conforme tipo, risco e contexto. A matriz de autoridade ainda será definida.

## 8. Saída do Refinamento

A aprovação do DoR não cria um estado intermediário chamado `Ready`.

Após o DoR, o Work Item passa pela priorização aplicável. Quando estiver refinado, priorizado e sem impedimento que impeça sua execução, entra em **Pronto para Execução**.

Essa simplificação evita estados semanticamente sobrepostos.

## 9. Prioritization

A priorização considera seis dimensões conceituais.

### 9.1 Urgency

Representa pressão temporal.

Escala conceitual:

1. sem pressão temporal;
2. baixa;
3. moderada;
4. alta;
5. crítica.

A urgência deve possuir justificativa. Quanto maior a urgência, maior a expectativa de evidência concreta quando disponível.

### 9.2 Impact

Representa amplitude e severidade da consequência.

Escala conceitual:

1. muito baixo/local;
2. baixo;
3. moderado;
4. alto;
5. crítico.

Impacto não é apenas quantidade de pessoas afetadas. Um processo crítico utilizado por poucas pessoas pode representar impacto elevado.

### 9.3 Risk

Na V1, Risk representa a consequência de adiar ou não realizar o trabalho.

Modelos mais sofisticados, como probabilidade multiplicada por consequência, podem ser considerados futuramente, mas não fazem parte da regra obrigatória desta versão.

### 9.4 Business Value

Representa o benefício produzido pela realização do trabalho.

Pode envolver, por exemplo:

- receita;
- redução de custo;
- experiência do cliente;
- produtividade;
- contribuição para objetivo estratégico.

Trabalho técnico não precisa possuir alto valor de negócio direto para ser prioritário; outras dimensões podem justificar sua prioridade.

### 9.5 Dependencies

Dependências devem ser explicitamente rastreáveis.

Relações principais:

- `blocked-by`
- `blocks`

Conceitualmente, a Golden relaciona **Work Item com Work Item**, independentemente da representação utilizada pela ferramenta.

Dependências externas também podem existir, como aprovação de segurança, fornecedor, API externa ou entrega de outro sistema.

### 9.6 Effort

Effort representa o tamanho relativo necessário para entregar o trabalho.

Na V1, evita-se estimativa obrigatória em horas ou dias.

Pode ser representado por escala relativa de 1 a 5, de muito pequeno a muito grande/complexo.

Effort representa custo e não deve ser tratado como valor positivo de prioridade.

### 9.7 Expedite

Expedite não é uma dimensão normal de pontuação.

É uma exceção ao ordenamento normal para situações justificadas, como incidente severo de produção, problema grave de segurança ou prazo regulatório.

Quando utilizado, deve preservar justificativa, ator responsável pela decisão e timestamp.

## 10. Gate de Prioritization

Ao concluir a priorização, o Work Item deve possuir no mínimo:

- prioridade definida;
- justificativa rastreável;
- situação das dependências bloqueantes conhecida.

Quando autorizado a seguir, entra em **Pronto para Execução**.

## 11. Pronto para Execução

Pronto para Execução significa que o Work Item está refinado, passou pelo DoR, foi priorizado e pode ser assumido para execução.

Não é obrigatório existir responsável previamente definido.

Essa separação permite medir o tempo entre:

- momento em que o trabalho ficou disponível;
- momento em que alguém efetivamente o assumiu.

## 12. Ownership e colaboração

Ao entrar em execução, o Work Item deve possuir um **Owner**.

Um Work Item em execução possui:

- exatamente um Owner;
- zero ou mais Contributors.

Owner é o principal responsável pelo progresso.

Contributors são pessoas ou agentes que participam da execução.

Tanto Owner quanto Contributors podem ser HUMAN ou AGENT.

A participação e eventuais transferências de responsabilidade devem preservar histórico para auditoria.

## 13. Execution

Quando o trabalho é efetivamente assumido e iniciado, o Work Item entra em **Em Desenvolvimento**.

Trabalhos que geram alteração de código devem possuir uma unidade de implementação rastreável vinculada ao Work Item.

## 14. Work Branch Policy

### 14.1 Regra obrigatória

Toda alteração de código deve ocorrer em uma branch de trabalho rastreável e vinculada ao Work Item.

Trabalhos que não alteram código podem não exigir branch, conforme sua natureza.

### 14.2 Nomenclatura

A Golden **não fixa** um prefixo universal como `feature/`.

A nomenclatura deve respeitar a política do projeto e as restrições técnicas do ambiente.

Exemplos possíveis:

```text
feature/123-ajuste-workspace
feat/123-ajuste-workspace
work/123-ajuste-workspace
```

Em ambientes onde um prefixo específico dispara CI/CD, esse requisito pertence ao perfil do projeto.

### 14.3 Branch base

A Golden não assume que toda Work Branch nasce necessariamente de `main`.

A branch de trabalho deve partir da branch base definida pela política do projeto.

Exemplos de branch base:

- `main`
- `develop`
- `release/x`

### 14.4 Momento de criação

A Work Branch deve ser criada quando o Work Item entrar efetivamente em execução.

Evita-se criar branches durante Refinement ou enquanto o item permanece parado em Ready/Pronto para Execução.

## 15. Project Policy / Profile

Particularidades técnicas de cada projeto ou organização devem ser configuráveis sem alterar as regras centrais da Golden Governance.

Um Project Policy/Profile poderá definir, por exemplo:

- branch base;
- padrão de nomenclatura de Work Branch;
- prefixos obrigatórios;
- convenção de commits;
- mecanismo de CI/CD;
- quality gates específicos;
- restrições de integração.

Assim, a Golden define **o princípio**, enquanto o Project Profile define **como aquele ambiente implementa o princípio**.

## 16. Rastreabilidade e métricas

O modelo deve permitir registrar eventos e timestamps das principais transições.

Isso permitirá calcular posteriormente métricas como:

- lead time;
- cycle time;
- tempo em Refinement;
- tempo aguardando priorização;
- tempo em Pronto para Execução;
- tempo efetivo em execução;
- tempo bloqueado;
- quantidade de retornos;
- participação de humanos e agentes;
- gargalos por etapa.

A definição final dos eventos e do modelo de auditoria ainda está pendente.

## 17. Decisões fechadas neste Draft

Até a versão Draft 0.2, estão consideradas decisões:

- Golden é independente de ferramenta;
- humanos e agentes seguem o mesmo processo;
- todo Work Item passa por Refinement;
- Acceptance Criteria fazem parte do preparo, mas não são o DoR;
- DoR funciona como gate PASS/FAIL;
- não existe um estado intermediário `Ready`; após DoR e priorização o item entra em Pronto para Execução;
- existe etapa explícita de Prioritization;
- priorização considera Urgency, Impact, Risk, Business Value, Dependencies e Effort;
- Expedite é uma exceção justificada ao fluxo normal;
- Pronto para Execução não exige Owner previamente atribuído;
- em execução existe exatamente um Owner e podem existir múltiplos Contributors;
- alterações de código exigem Work Branch rastreável;
- padrão de nome da branch pertence à política do projeto;
- particularidades de ferramentas e ambientes pertencem ao Project Policy/Profile.

## 18. Continuidade e pontos pendentes

As etapas posteriores à entrada em execução foram definidas na Parte 2, incluindo:

- lifecycle de Em Desenvolvimento até Concluído;
- contrato e template mínimo da Pull Request;
- Code Review e Checklist de Revisão Técnica;
- termo de responsabilidade do Reviewer;
- rastreabilidade da aprovação pelo HEAD SHA;
- nova revisão após alteração relevante;
- Acceptance Validation em homologação;
- gestão de mudança/GMUD;
- produção, observação e rollback;
- consolidação da versão estabilizada na `main`.

Continuam pendentes para refinamento:

- política de transferência de Owner;
- convenção de commits;
- Definition of Done — DoD formal;
- matriz de autoridade dos gates;
- fórmula ou política de composição da prioridade, caso necessária;
- quantidade mínima de aprovações versus Project Profile;
- formato final das evidências de Acceptance Validation;
- duração e critérios objetivos da janela de observação;
- fluxo de hotfix/emergency change;
- modelo formal de automação, eventos, Audit Trail e métricas.

O próximo bloco da Golden será **Automação, Rastreabilidade e Auditoria**.


---

## Evolução do documento

Este documento é incremental.

Uma decisão somente deve ser promovida de proposta para regra quando estiver explicitamente validada. Novos refinamentos devem preservar a distinção entre:

- **decisão fechada**;
- **proposta**;
- **pendência**.

A Golden Governance deve permanecer simples no núcleo e extensível por políticas específicas quando necessário.
