---
name: solid-clean-code
description: Guia de solid / clean code para implementação e revisão de APIs Java de alta escala com decisões verificáveis.
---

# SOLID / Clean Code

Status: DRAFT v0.2; engenharia independente, sem substituir políticas Golden.

## Quando ativar
Tarefas de implementação, diagnóstico, revisão ou refatoração relacionadas a solid / clean code.

## Procedimento
1. Ler contratos, código, configuração, versões e testes relevantes; separar fatos de suposições.
2. Definir comportamento esperado, requisitos não funcionais e possíveis regressões.
3. Aplicar os critérios técnicos abaixo e comparar alternativas, inclusive não modificar.
4. Planejar mudança mínima, validação, observabilidade e rollback.
5. Produzir relatório de evidências, riscos e limitações.

## Critérios técnicos
1. SRP: identificar razões independentes de mudança, não impor uma classe por método.
2. OCP/DIP: introduzir portas e estratégias quando houver variação real ou isolamento testável, não interfaces cerimoniais.
3. LSP/ISP: contratos, pré/pós-condições e interfaces mínimas; evitar hierarquias que exigem instanceof.
4. Revisar nomes, acoplamento, coesão, efeitos colaterais, exceções e propagação de contexto.
5. Refatoração segura: caracterizar comportamento, fazer alteração pequena, executar testes e comparar contratos.

## Entrega obrigatória
- Contexto, hipóteses e evidências existentes.
- Recomendação com justificativa e alternativas rejeitadas.
- Impacto em compatibilidade, carga, segurança e operação.
- Plano de teste, critérios de aceitação e reversão.

## Fontes e cautelas
Fonte: DHA code-quality; Awesome Java java-clean-code.

Não copiar código ou regras de fonte externa sem revisar versão, licença e aderência ao projeto. Para conflitos, registrar na matriz de divergências antes de alterar normas.
