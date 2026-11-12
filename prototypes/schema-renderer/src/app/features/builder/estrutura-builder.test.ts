import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { obterNoSchema, listarNosSchema, escaparSegmento } from './estrutura-builder';

test('árvore e navegação concordam para nomes com barra e til e para alternativas', () => {
  const schema = {
    type: 'object',
    properties: {
      'a/b~c': { type: 'array', items: { oneOf: [{ type: 'string' }, { type: 'number' }] } },
    },
  };
  const caminho = '/properties/' + escaparSegmento('a/b~c') + '/items/oneOf/1';
  const linha = listarNosSchema(schema).find((linha) => linha.path === caminho);
  assert.ok(linha);
  assert.equal(linha.schema, obterNoSchema(schema, caminho));
  assert.equal(linha.schema.type, 'number');
  assert.equal(obterNoSchema(schema, '/properties/inexistente'), undefined);
});
