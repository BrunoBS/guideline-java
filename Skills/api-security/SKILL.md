---
name: api-security
description: Skill de segurança de apis para investigar, implementar e revisar sistemas Java de alta escala com decisões baseadas em evidências.
---

# Segurança de APIs

Status: pesquisa/curadoria v0.2. Independente de convenções Golden; não é norma aprovada.

## Gatilhos
Verificar autenticação, autorização por recurso, tenant isolation, JWT/OIDC, rate limiting, validação e segredos.

## Protocolo
1. Ler código, contratos, configuração, métricas e testes disponíveis; separar fatos de hipóteses.
2. Construir matriz identidade×recurso×ação e identificar fronteiras confiáveis, inclusive cabeçalhos e propagação.
3. Autorizar no backend por operação e no acesso a dados; validar claims; proteger erros/logs; testar acesso cruzado.
4. Identificar impacto em segurança, consistência, observabilidade e custo operacional.
5. Propor mudança mínima, critérios de aceitação, experimento controlado e reversão.

## Antipadrões
Não confiar em UI, headers arbitrários ou claims não verificados; não registrar tokens.

## Entregáveis
Testes de acesso negado, IDOR/BOLA, contexto ausente, token expirado e rate limit.

## Critérios de revisão
- [ ] Evidências e premissas explicitadas.
- [ ] Alternativas consideradas, inclusive não alterar.
- [ ] Comportamento em falha e sob carga descrito.
- [ ] Teste reproduzível e rollback definidos.
- [ ] Dependências entre Skills e conflitos registrados.

## Fontes para revisão aprofundada
DHA security/pentest-readiness; OWASP API Security Top 10.

> Texto original de curadoria, não transcrição de Skill de terceiros. Verificar APIs e versões na documentação oficial antes de gerar código.

## Contrato operacional e exemplos
Aplicar [contrato dos agentes](../CONTRATO-EXECUCAO-AGENTES.md) e [exemplos e contraindicações](references/EXEMPLOS-E-DECISOES.md). Exemplos didáticos: validar versão, imports, testes, segurança, rollback e evidências antes de recomendar adoção.

## Gate de segurança obrigatório
- Verificar autorização **no acesso ao objeto e na query**, com testes de tenant A→B, identificador enumerado, contexto ausente e troca de contexto entre requisições.
- Escolher 403/404 conforme contrato de ocultação de existência; não vazar existência, IDs ou detalhes de outro workspace em respostas, logs ou métricas.
- Rejeitar headers de identidade/tenant não autenticados; exigir proveniência verificável e validar permissões no servidor.
