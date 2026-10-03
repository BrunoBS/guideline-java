# Golden Governance v1 — Parte 2: Feature Promotion & Release Flow

> **Status:** Draft 0.2  
> **Continuação de:** `golden-governance-v1.md`  
> **Escopo:** conduzir um Work Item da execução até a consolidação da versão estabilizada em produção na `main`.

## 1. Objetivo

Esta parte define o fluxo de entrega e promoção da Golden Governance, incluindo lifecycle do Work Item, contrato da Pull Request, revisão técnica, homologação, gestão de mudança, produção, observação, rollback e consolidação na `main`.

A Golden define o contrato de governança. GitHub, GitLab, Harness, ServiceNow, pipelines ou outras ferramentas apenas implementam esse contrato.

## 2. Lifecycle oficial do Work Item

O lifecycle consolidado é:

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

### 2.1 Backlog

O Work Item existe, mas ainda não entrou em refinamento.

### 2.2 Em Refinamento

O contexto, resultado esperado, critérios de aceite, dependências e demais informações necessárias são refinados.

O Definition of Ready — DoR — é um **gate**, não um status.

Quando o refinamento termina e o DoR é aprovado, o item segue para **Pronto para Execução**.

### 2.3 Pronto para Execução

O Work Item está refinado e apto a ser executado.

A priorização organiza os Work Items disponíveis. Quando alguém assume efetivamente o trabalho, o item segue para **Em Desenvolvimento**.

### 2.4 Em Desenvolvimento

O Developer:

- implementa a alteração;
- executa testes locais;
- realiza validações técnicas locais;
- promove para DEV conforme o Project Profile;
- valida o comportamento em DEV;
- prepara a PR de promoção.

DEV é considerado ambiente de desenvolvimento/integração e pode ser instável.

### 2.5 Em Revisão

Começa quando a implementação está concluída, validada pelo Developer e a PR está pronta para revisão técnica.

O Code Reviewer executa o Checklist de Revisão Técnica.

- **APPROVE:** segue para **Em Homologação**.
- **REQUEST CHANGES:** retorna para **Em Desenvolvimento**, preservando o mesmo Work Item, branch e PR.

### 2.6 Em Homologação

Após aprovação técnica e deploy em HOM, ocorre a validação funcional.

O Developer responsável valida a entrega e apresenta as evidências dos critérios de aceite. Depois, um Acceptance Validator diferente do autor da implementação realiza a validação independente.

O Acceptance Validator pode ser outro Developer, Tech Lead, PM, QA ou outro papel autorizado pelo Project Profile.

- **PASS:** segue para **Pronto para Produção**.
- **FAIL:** retorna para correção.

### 2.7 Pronto para Produção

A implementação e a homologação já foram aprovadas.

Nesse estado ocorre, quando aplicável:

- abertura/preenchimento da GMUD ou mudança equivalente;
- associação das evidências;
- referência da mudança na entrega;
- aprovação da mudança;
- espera da janela autorizada para produção.

A abertura da mudança não é responsabilidade exclusiva do autor da feature.

### 2.8 Em Produção

Começa após o deploy em PROD.

Inclui:

1. validação pós-deploy;
2. registro da evidência de publicação;
3. janela de observação;
4. acompanhamento de estabilidade;
5. rollback quando necessário;
6. consolidação na `main` quando a versão estiver estável.

O último gate de **Em Produção** é a consolidação na `main`.

### 2.9 Concluído

O Work Item somente é concluído quando:

- a publicação em PROD foi bem-sucedida;
- a validação pós-deploy passou;
- a janela de observação terminou sem condição impeditiva;
- não ocorreu rollback da entrega;
- a versão estabilizada foi consolidada na `main`.

A `main` representa produção publicada e estabilizada.

## 3. Validação local e DEV

Antes da PR de promoção, o Developer deve validar a alteração localmente e em DEV.

A Golden exige a execução das validações aplicáveis, mas não fixa a ferramenta.

O Project Profile pode definir ferramentas como Sonar, cobertura, build, testes automatizados e outros quality checks.

Para esta etapa, a declaração do Developer é suficiente na V1. Ferramentas locais, como um ambiente Docker padronizado com Sonar e políticas corporativas, podem fornecer feedback preventivo, sem constituir necessariamente a evidência oficial de auditoria.

## 4. Contrato da PR de DEV para Release/HOM

A PR é o principal histórico técnico da promoção e deve estar vinculada ao Work Item.

Na implementação GitHub, a referência pode ser feita pelo número da Issue/Work Item. Não se deve usar fechamento automático nesse momento, pois o Work Item ainda não terminou.

### 4.1 Template mínimo da PR

A descrição deve conter:

#### Work Item

Identificador da tarefa relacionada.

#### Objetivo

Descrição curta do resultado que a PR entrega.

#### Resumo das alterações

Principais mudanças realizadas no código e componentes afetados.

#### Validação do Developer

Registrar:

- validação local realizada;
- testes automatizados executados;
- validação em DEV;
- cenários relevantes verificados;
- evidências ou referências quando existirem.

Não é obrigatório anexar screenshot para toda validação. Deve-se descrever o que foi testado e referenciar evidência verificável quando houver.

#### Impactos e riscos

Informar, quando aplicável:

- banco de dados;
- configuração;
- contratos;
- integrações;
- dependências externas;
- riscos conhecidos.

Quando inexistentes, registrar `Não se aplica`.

#### Orientações para homologação

Registrar particularidades necessárias para validar a entrega em HOM, quando aplicável.

#### Checklist de pré-requisitos do Developer

- [ ] Work Item relacionado.
- [ ] Implementação concluída.
- [ ] Testes locais executados.
- [ ] Testes automatizados relevantes executados.
- [ ] Validação em DEV concluída.
- [ ] Critérios de aceite considerados na implementação.
- [ ] Impactos e riscos registrados.
- [ ] Documentação atualizada, quando aplicável.
- [ ] PR pronta para revisão técnica.

A descrição da PR é responsabilidade do Developer. O checklist técnico do Reviewer não deve ser preenchido na descrição da PR.

## 5. Code Review

O Code Review é um gate técnico independente.

O Reviewer não substitui o Acceptance Validator. Ele deve compreender o Work Item e verificar se as regras solicitadas foram corretamente representadas no código, mas não realiza a homologação funcional.

A revisão deve ser criteriosa e suficiente para que a aprovação represente uma decisão técnica consciente.

## 6. Checklist de Revisão Técnica

### 6.1 Escopo e aderência

- [ ] A implementação corresponde ao Work Item.
- [ ] O código não introduz alterações relevantes fora do escopo sem justificativa.
- [ ] Os critérios de aceite relevantes são representados pela implementação e pelos testes.
- [ ] Ambiguidades de requisito foram esclarecidas antes da aprovação.

### 6.2 Regras de negócio e domínio

- [ ] Regras de negócio estão implementadas no local arquitetural adequado.
- [ ] Invariantes e validações de domínio estão preservadas.
- [ ] Não existe duplicação desnecessária de regra de negócio.
- [ ] Casos de borda relevantes foram considerados.
- [ ] Regras relevantes possuem testes adequados.

O Reviewer valida a implementação técnica da regra. A homologação do comportamento pertence ao gate de Acceptance Validation.

### 6.3 Arquitetura e responsabilidades

- [ ] Responsabilidades estão corretamente distribuídas.
- [ ] O princípio de responsabilidade única está preservado.
- [ ] SOLID foi respeitado quando aplicável.
- [ ] Coesão está adequada.
- [ ] Acoplamento desnecessário foi evitado.
- [ ] Camadas e módulos respeitam seus limites.
- [ ] Não existe lógica de negócio em camada inadequada.
- [ ] Dependências seguem a direção arquitetural definida pelo projeto.

Tamanho de classe ou método não é, isoladamente, regra de reprovação. Tamanho excessivo e alta complexidade são sinais para avaliar responsabilidade, coesão e necessidade de refatoração.

### 6.4 Qualidade e legibilidade

- [ ] Nomes de classes, métodos, variáveis e estruturas expressam intenção.
- [ ] O código é legível e compreensível sem complexidade acidental.
- [ ] Métodos possuem responsabilidades claras.
- [ ] Condicionais e fluxos excessivamente complexos foram evitados.
- [ ] Duplicação desnecessária foi removida.
- [ ] Código morto, comentários obsoletos e artefatos temporários foram removidos.
- [ ] Constantes e abstrações são utilizadas quando agregam clareza.
- [ ] O código segue as convenções do projeto.

### 6.5 Testes

- [ ] Existem testes para os comportamentos relevantes.
- [ ] Cenários positivos, negativos e de borda aplicáveis foram considerados.
- [ ] Testes validam comportamento e não apenas implementação interna.
- [ ] Alterações não removeram cobertura relevante sem justificativa.
- [ ] Quality gates e cobertura definidos pelo Project Profile foram considerados quando disponíveis.

### 6.6 Erros e observabilidade

- [ ] Tratamento de erros segue o padrão da plataforma.
- [ ] Exceções não são silenciosamente ignoradas.
- [ ] Logs possuem nível e contexto adequados.
- [ ] Informações sensíveis não são registradas indevidamente.
- [ ] Correlação, métricas e observabilidade foram consideradas quando aplicáveis.

### 6.7 Contratos e compatibilidade

- [ ] Alterações de API/contrato são intencionais.
- [ ] Compatibilidade foi avaliada.
- [ ] Mudanças potencialmente breaking estão identificadas.
- [ ] Consumidores e integrações afetados foram considerados.
- [ ] Versionamento/migração foi tratado quando necessário.

### 6.8 Dados e persistência

- [ ] Modelo de dados está coerente.
- [ ] Queries e acessos a dados são adequados.
- [ ] Migrações são seguras e reversíveis quando aplicável.
- [ ] Índices e impactos de volume foram considerados.
- [ ] Transações e concorrência foram avaliadas quando relevantes.
- [ ] Não há risco evidente de perda ou corrupção de dados.

### 6.9 Segurança

- [ ] Autorização e autenticação foram preservadas.
- [ ] Entradas externas são tratadas adequadamente.
- [ ] Dados sensíveis e segredos não foram expostos.
- [ ] Novas superfícies de ataque foram avaliadas quando aplicável.
- [ ] Dependências ou configurações introduzidas não criam risco conhecido sem tratamento.

### 6.10 Performance e resiliência

- [ ] Não há impacto de performance evidente sem justificativa.
- [ ] Loops, consultas, chamadas remotas e alocações relevantes foram avaliados.
- [ ] Timeouts, retries e falhas externas foram considerados quando aplicáveis.
- [ ] O comportamento sob carga ou volume foi considerado quando relevante.

### 6.11 Configuração e documentação

- [ ] Configurações necessárias estão documentadas.
- [ ] Valores específicos de ambiente não foram indevidamente fixados no código.
- [ ] Documentação técnica foi atualizada quando necessária.
- [ ] Operação, deploy ou rollback possuem informação suficiente quando aplicável.

## 7. Decisão formal do Reviewer

O Review formal deve resultar em uma das decisões:

- **APPROVE** — não foram identificados impedimentos técnicos conhecidos;
- **REQUEST CHANGES** — existem ajustes necessários antes da promoção;
- **COMMENT/BLOCKED** — quando ainda é necessário esclarecimento antes de uma decisão.

Na implementação GitHub:

- `APPROVE` permite seguir para o próximo gate quando as demais condições estiverem atendidas;
- `REQUEST CHANGES` retorna o Work Item para **Em Desenvolvimento**;
- a mesma Issue, branch e PR são preservadas;
- o Developer corrige na mesma branch e solicita nova revisão.

A aprovação informal em chat, reunião ou mensagem não substitui o registro formal do gate na ferramenta de governança.

## 8. Termo de responsabilidade técnica

Ao aprovar, o Reviewer assume responsabilidade pela revisão técnica realizada dentro do escopo do checklist.

Declaração conceitual:

> Declaro que realizei a revisão técnica desta alteração conforme o Checklist de Revisão Técnica da Golden Governance e não identifiquei impedimentos técnicos conhecidos para sua promoção.

O termo não representa garantia absoluta de ausência de defeitos. Ele registra que o Reviewer executou o gate técnico exigido pela governança.

## 9. Versão do código revisado

Uma PR pode conter múltiplos commits.

A aprovação não precisa registrar cada commit individualmente. Ela corresponde ao estado completo da PR no momento da revisão, identificado pelo **HEAD SHA**.

Exemplo:

```text
Commits: A -> B -> C -> D -> E
Reviewed HEAD: E
```

A trilha conceitual é:

```text
Work Item
  -> PR
  -> Reviewed HEAD SHA
  -> Reviewer
  -> Review Result
  -> Timestamp
```

### 9.1 Alteração posterior à aprovação

Se o código sofrer alteração relevante após a aprovação e o HEAD mudar, a aprovação anterior não deve ser considerada automaticamente válida para o novo estado.

```text
Approved HEAD: E
New HEAD: F
=> nova validação técnica necessária
```

O Project Profile ou adapter da ferramenta pode automatizar a invalidação da aprovação.

## 10. Homologação e Acceptance Validation

Depois do Code Review aprovado, ocorre o deploy em HOM e o Work Item entra em **Em Homologação**.

O Developer responsável:

- valida a entrega em HOM;
- executa os cenários aplicáveis;
- reúne as evidências dos critérios de aceite.

Depois, um Acceptance Validator diferente do autor realiza a validação independente.

Cada validação deve permitir identificar:

- critério validado;
- resultado PASS/FAIL;
- responsável;
- instante;
- evidência quando aplicável.

O registro funcional pertence ao Work Item. A PR permanece como histórico técnico.

### 10.1 Descobertas em HOM

Se a descoberta for necessária para cumprir o escopo ou critério de aceite original, permanece no mesmo Work Item.

Se representar novo requisito, melhoria ou problema independente, cria-se novo Work Item e registra-se a relação entre eles.

## 11. Gestão de Mudança

Após homologação aprovada, o Work Item entra em **Pronto para Produção**.

Quando exigido pela organização:

- deve existir GMUD/mudança válida;
- a mudança deve ser rastreável a partir da entrega;
- a referência deve estar associada à PR/release ou mecanismo equivalente;
- a promoção para PROD depende da autorização da mudança.

A mudança pode ser aberta pelo Developer responsável ou por outro participante autorizado.

ServiceNow ou qualquer outra ferramenta é uma implementação possível; não é requisito do núcleo da Golden.

## 12. Produção e observação

Após o deploy, o Work Item entra em **Em Produção**.

Deve ocorrer:

- validação pós-deploy;
- coleta de evidência;
- registro de publicação bem-sucedida ou falha;
- janela de observação.

O papel responsável pela validação pode ser flexível conforme Project Profile.

### 12.1 Sucesso

Se a publicação permanecer estável durante a janela de observação:

```text
Deploy PROD
  -> Production Validation PASS
  -> Observation PASS
  -> Merge main
  -> Concluído
```

### 12.2 Rollback

Se ocorrer falha que exija rollback:

```text
Production/Observation FAIL
  -> Rollback
  -> sem consolidação na main
  -> Work Item retorna para correção
```

O rollback deve permanecer registrado no histórico do Work Item.

## 13. Rastreabilidade mínima

O processo deve permitir reconstruir:

```text
Work Item
 -> Work Branch
 -> PR
 -> commits
 -> Reviewed HEAD SHA
 -> Reviewer
 -> decisão do Review
 -> Acceptance Validation
 -> GMUD/Change
 -> versão publicada
 -> Production Validation
 -> Observation
 -> merge main
 -> conclusão
```

Sempre que possível, os dados devem ser coletados automaticamente pela ferramenta.

## 14. Audit Trail conceitual

Eventos relevantes devem preservar, quando disponíveis:

- Work Item;
- evento/gate;
- ator;
- papel;
- timestamp;
- resultado;
- PR;
- versão/commit/HEAD SHA;
- evidência;
- justificativa em caso de falha ou exceção.

Exemplo conceitual:

```text
Work Item: #123
PR: #456
Gate: CODE_REVIEW
Result: APPROVED
Reviewer: reviewer-x
Reviewed HEAD: 8f21c4a
Timestamp: <timestamp>
```

A Golden define quais informações devem ser rastreáveis. A forma de captura pertence ao adapter/ferramenta.

## 15. Project Policy / Profile

O Project Profile pode definir:

- branches correspondentes aos ambientes;
- padrão de Work Branch;
- template de PR;
- regras adicionais de Code Review;
- número mínimo de aprovações;
- quality gates;
- cobertura mínima;
- ferramentas de análise;
- critérios de alteração relevante após aprovação;
- Acceptance Validators autorizados;
- mecanismo de GMUD/Change;
- janela de produção;
- duração e critérios da observação;
- política de rollback;
- regras de merge;
- automações disponíveis.

## 16. Decisões fechadas neste Draft

Estão fechadas:

- lifecycle: Backlog -> Em Refinamento -> Pronto para Execução -> Em Desenvolvimento -> Em Revisão -> Em Homologação -> Pronto para Produção -> Em Produção -> Concluído;
- DoR é gate e não status;
- DEV pode ser instável;
- Developer valida localmente e em DEV;
- PR DEV -> Release/HOM possui template mínimo;
- descrição da PR é responsabilidade do Developer;
- Code Review é gate técnico independente;
- Acceptance Validation é gate funcional independente;
- REQUEST CHANGES retorna para Em Desenvolvimento preservando Work Item, branch e PR;
- aprovação formal deve ficar registrada na ferramenta;
- aprovação corresponde ao HEAD SHA revisado;
- alteração relevante posterior exige nova revisão;
- Reviewer possui termo de responsabilidade técnica;
- homologação exige validação independente dos critérios de aceite;
- trabalho necessário para cumprir o escopo original permanece no mesmo Work Item;
- novo escopo gera novo Work Item;
- GMUD/Change ocorre em Pronto para Produção quando aplicável;
- produção inclui validação pós-deploy e observação;
- rollback impede consolidação na main;
- main representa produção estabilizada;
- conclusão ocorre após consolidação na main.

## 17. Pontos ainda pendentes

Ainda serão refinados:

- quantidade mínima universal de aprovações versus configuração por Project Profile;
- formato final das evidências de Acceptance Validation;
- duração e critérios objetivos da janela de observação;
- política detalhada de reexecução de gates após falha;
- fluxo de hotfix/emergency change;
- convenção de commits;
- Definition of Done formal;
- matriz formal de autoridade dos gates;
- modelo definitivo de automação, eventos e métricas.

Esses pontos não devem alterar decisões já fechadas sem revisão explícita da Golden.

## 18. Próximo bloco

O próximo bloco da Golden deve tratar de **Automação, Rastreabilidade e Auditoria**, incluindo:

- eventos da Golden;
- automação das transições;
- captura automática do Audit Trail;
- adapters por ferramenta;
- invalidação automática de gates;
- métricas de fluxo;
- suporte futuro a agentes e auditoria automatizada.
