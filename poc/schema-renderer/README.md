# Schema Renderer POC

POC Angular standalone executada com Node.js, sem integração com Maven, Shell ou backend.

## Execução

Requisitos: Node.js compatível com Angular 21 (Node 20.19+, 22.12+ ou 24+) e npm.

```bash
cd poc/schema-renderer
npm install
npm start
```

Abra http://localhost:4200. Execute `npm run build` para verificar compilação.

## Escopo

- Editor para colar JSON Schema Draft 2020-12, formulário e JSON produzido.
- Tipos primitivos, enum, objetos, arrays, $ref local, oneOf, anyOf, allOf e if/then/else com interpretação conservadora.
- Validação integral com Ajv 2020 e mensagens de erro.
- Para estruturas ambíguas, o editor JSON do valor continua disponível. O schema original é a autoridade.

## Limitações da POC

A renderização é heurística, não uma garantia de interface perfeita para todos os schemas válidos. O parser de apresentação não cobre referências remotas, recursão arbitrária, padrões dinâmicos ou todos os keywords de Draft 2020-12. O Ajv valida o objeto final independentemente da representação visual. Nenhuma chamada HTTP é feita. Não é uma biblioteca de produção.
