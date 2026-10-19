import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  validarValor,
  resolverSchemaDoCampo,
  obterSchemaDoItem,
  obterSchemaDaPropriedade,
  valorAtendeSchema,
} from './schema-engine';
import { lerDocumentoSchema } from './schema-validator';

test('composições aninhadas preservam interseção de limites e negações na apresentação', () => {
  const schema = {
    type: 'integer',
    minimum: 2,
    maximum: 20,
    allOf: [{ minimum: 5 }, { allOf: [{ minimum: 3 }, { maximum: 10 }, { not: { const: 7 } }] }],
  };
  const atual = resolverSchemaDoCampo(schema, 6, schema);
  assert.equal(atual.minimum, 5);
  assert.equal(atual.maximum, 10);
  assert.equal(valorAtendeSchema(atual, 4, schema), false);
  assert.equal(valorAtendeSchema(atual, 7, schema), false);
  assert.deepEqual(validarValor(schema, 6), []);
});
test('oneOf diferencia nenhuma alternativa de sobreposição e identifica cada falha', () => {
  const schema = {
    oneOf: [
      { type: 'integer', minimum: 5 },
      { type: 'integer', maximum: 10 },
    ],
  };
  assert.match(validarValor(schema, 7).join(' '), /Mais de uma.*1, 2/);
  assert.match(validarValor(schema, 'a').join(' '), /Nenhuma/);
  assert.match(validarValor(schema, 'a').join(' '), /Alternativa 1/);
  assert.match(validarValor(schema, 'a').join(' '), /Alternativa 2/);
});
test('anyOf une apenas alternativas satisfeitas e mantém not aninhado', () => {
  const schema = {
    type: 'object',
    anyOf: [
      { required: ['a'], properties: { a: { type: 'integer' } } },
      { required: ['b'], properties: { b: { type: 'string' } }, not: { required: ['c'] } },
    ],
  };
  const atual = resolverSchemaDoCampo(schema, { a: 1, b: 'x' }, schema);
  assert.ok(atual.properties.a);
  assert.ok(atual.properties.b);
  assert.ok(validarValor(schema, { c: 1 }).length);
  assert.deepEqual(validarValor(schema, { a: 1, b: 'x' }), []);
});
test('unevaluatedProperties considera referências e alternativas válidas', () => {
  const schema = {
    $defs: { base: { type: 'object', properties: { a: { type: 'integer' } } } },
    allOf: [{ $ref: '#/$defs/base' }],
    anyOf: [
      { required: ['b'], properties: { b: { type: 'string' } } },
      { required: ['c'], properties: { c: { type: 'boolean' } } },
    ],
    unevaluatedProperties: false,
  };
  assert.deepEqual(validarValor(schema, { a: 1, b: 'x' }), []);
  assert.ok(validarValor(schema, { a: 1, b: 'x', extra: 1 }).length);
});
test('unevaluatedItems considera prefixItems por referência e aplica schema ao restante', () => {
  const schema = {
    type: 'array',
    $defs: { tupla: { prefixItems: [{ type: 'string' }] } },
    allOf: [{ $ref: '#/$defs/tupla' }],
    unevaluatedItems: { type: 'integer' },
  };
  assert.deepEqual(validarValor(schema, ['a', 2, 3]), []);
  assert.ok(validarValor(schema, ['a', false]).length);
  const atual = resolverSchemaDoCampo(schema, ['a', 2], schema);
  assert.equal(obterSchemaDoItem(atual, 1, schema).type, 'integer');
});
test('contains avalia somente os índices correspondentes antes de unevaluatedItems', () => {
  const schema = { type: 'array', contains: { type: 'string' }, unevaluatedItems: false };
  assert.deepEqual(validarValor(schema, ['a', 'b']), []);
  assert.ok(validarValor(schema, ['a', 2]).length);
});
test('ramos inválidos de anyOf não liberam propriedades não avaliadas', () => {
  const schema = {
    type: 'object',
    anyOf: [
      { properties: { a: { type: 'integer' } }, required: ['a'] },
      { properties: { b: { type: 'string' } }, required: ['b'] },
    ],
    unevaluatedProperties: false,
  };
  assert.deepEqual(validarValor(schema, { a: 1 }), []);
  assert.ok(validarValor(schema, { a: 1, b: 2 }).length);
});
test('patternProperties coincidentes mantêm ambas as restrições em allOf', () => {
  const schema = {
    type: 'object',
    allOf: [
      { patternProperties: { '^x': { type: 'integer', minimum: 5 } } },
      { patternProperties: { '^x': { maximum: 10 } } },
    ],
  };
  const atual = resolverSchemaDoCampo(schema, { x: 7 }, schema),
    filho = obterSchemaDaPropriedade(atual, 'x', schema);
  assert.equal(filho.minimum, 5);
  assert.equal(filho.maximum, 10);
  assert.ok(validarValor(schema, { x: 4 }).length);
});
test('política de boolean schemas na importação explica a limitação sem rejeitar sua validade no motor', () => {
  assert.deepEqual(validarValor(true, { a: 1 }), []);
  assert.ok(validarValor(false, {}).length);
  for (const source of ['true', 'false'])
    assert.throws(() => lerDocumentoSchema(source), /booleano é válido.*Studio exige um objeto/);
  assert.deepEqual(validarValor(lerDocumentoSchema('{}'), 123), []);
  assert.ok(validarValor(lerDocumentoSchema('{"not":{}}'), 123).length);
});

test('anotações de anyOf com recurso interno e anchor permitem somente propriedades avaliadas', () => {
  const schema = {
    $id: 'https://example.com/root.json',
    type: 'object',
    $defs: {
      ramo: {
        $id: 'ramo.json',
        $anchor: 'objeto',
        type: 'object',
        properties: { nome: { type: 'string' } },
        required: ['nome'],
      },
    },
    anyOf: [{ $ref: 'ramo.json#objeto' }],
    unevaluatedProperties: false,
  };
  assert.deepEqual(validarValor(schema, { nome: 'A' }), []);
  assert.ok(validarValor(schema, { nome: 'A', extra: 1 }).length);
});
test('avaliação de fragmentos mantém referências para properties da raiz', () => {
  const raiz = {
    type: 'object',
    properties: { codigo: { type: 'integer', minimum: 2 }, copia: { $ref: '#/properties/codigo' } },
  };
  assert.equal(valorAtendeSchema(raiz.properties.copia, 3, raiz), true);
  assert.equal(valorAtendeSchema(raiz.properties.copia, 1, raiz), false);
});
