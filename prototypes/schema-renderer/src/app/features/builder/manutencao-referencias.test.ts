import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  renomearUsosDaPropriedade,
  verificarExclusaoReferenciada,
  verificarRenomeacaoReferenciada,
  verificarReferenciasAoNo,
} from './manutencao-referencias';
import { validarValor, type Schema } from '../../core/schema/schema-engine';

test('renomear atualiza condições, alternativas, dependências e ponteiros sem alterar outros escopos ou valores', () => {
  const schema: Schema = {
    type: 'object',
    additionalProperties: false,
    required: ['canal'],
    properties: {
      canal: { type: 'string' },
      detalhe: { type: 'string' },
      copia: { $ref: '#/properties/canal' },
      grupo: { type: 'object', properties: { canal: { type: 'string' } }, required: ['canal'] },
    },
    allOf: [
      {
        if: { properties: { canal: { const: 'EMAIL' } }, required: ['canal'] },
        then: { required: ['detalhe'] },
      },
    ],
    oneOf: [
      { properties: { canal: { const: 'EMAIL' } } },
      { properties: { canal: { const: 'SMS' } } },
    ],
    dependentRequired: { canal: ['detalhe'], detalhe: ['canal'] },
    dependentSchemas: { canal: { properties: { canal: { minLength: 2 } } } },
    examples: [{ canal: 'não é regra' }],
    'x-integracao': { required: ['canal'] },
  };
  const antes = structuredClone(schema);
  const validacoes = ['EMAIL', 'SMS', 'OUTRO'].map(
    (canal) => validarValor(antes, { canal, detalhe: 'a' }).length === 0,
  );
  assert.equal(verificarRenomeacaoReferenciada(schema, schema, 'canal', 'meio'), '');
  renomearUsosDaPropriedade(
    schema,
    schema,
    'canal',
    'meio',
    '/properties/canal',
    '/properties/meio',
  );
  assert.equal(schema.properties.canal, undefined);
  assert.equal(schema.properties.copia.$ref, '#/properties/meio');
  assert.equal(schema.allOf[0].if.properties.meio.const, 'EMAIL');
  assert.deepEqual(schema.dependentRequired, { meio: ['detalhe'], detalhe: ['meio'] });
  assert.equal(schema.dependentSchemas.meio.properties.meio.minLength, 2);
  assert.deepEqual(schema.properties.grupo, antes.properties.grupo);
  assert.deepEqual(schema.examples, antes.examples);
  assert.deepEqual(schema['x-integracao'], antes['x-integracao']);
  assert.deepEqual(
    ['EMAIL', 'SMS', 'OUTRO'].map(
      (meio) => validarValor(schema, { meio, detalhe: 'a' }).length === 0,
    ),
    validacoes,
  );
});

test('ponteiros escapados e referências descendentes são atualizados com limites exatos', () => {
  const schema: Schema = {
    properties: { 'a/b': { properties: { codigo: { type: 'string' } } }, 'a/bc': {} },
    $defs: {
      uso: { $ref: '#/properties/a~1b/properties/codigo' },
      outro: { $ref: '#/properties/a~1bc' },
    },
  };
  renomearUsosDaPropriedade(schema, schema, 'a/b', 'c~d', '/properties/a~1b', '/properties/c~0d');
  assert.equal(schema.$defs.uso.$ref, '#/properties/c~0d/properties/codigo');
  assert.equal(schema.$defs.outro.$ref, '#/properties/a~1bc');
});
test('excluir campo usado em regras ou referências é recusado; required da origem pode ser removido', () => {
  const simples: Schema = { properties: { campo: {} }, required: ['campo'] };
  assert.equal(verificarExclusaoReferenciada(simples, simples, 'campo', '/properties/campo'), '');
  for (const regra of [
    { if: { required: ['campo'] } },
    { not: { required: ['campo'] } },
    { properties: { campo: false } },
  ]) {
    const schema = { ...simples, allOf: [regra] };
    assert.match(
      verificarExclusaoReferenciada(schema, schema, 'campo', '/properties/campo'),
      /regras/,
    );
  }
  const schema = { ...simples, $defs: { copia: { $ref: '#/properties/campo' } } };
  assert.match(
    verificarExclusaoReferenciada(schema, schema, 'campo', '/properties/campo'),
    /referência/,
  );
  assert.match(
    verificarReferenciasAoNo({ $defs: { copia: { $ref: '#/oneOf/1' } } }, '/oneOf'),
    /referência/,
  );
});
test('colisões em ramos e referências avançadas impedem renomeação', () => {
  const schema: Schema = { properties: { a: {} }, allOf: [{ properties: { a: {}, b: {} } }] };
  assert.match(verificarRenomeacaoReferenciada(schema, schema, 'a', 'b'), /novo nome/);
  for (const referencia of [{ $ref: '#ancora' }, { $dynamicRef: '#node' }, { $id: 'filho' }]) {
    const raiz = { properties: { a: {}, uso: referencia } };
    assert.ok(verificarRenomeacaoReferenciada(raiz, raiz, 'a', 'b'));
  }
});

test('nomes repetidos em objetos independentes não propagam alterações', () => {
  const raiz: Schema = {
    properties: {
      grupo: { properties: { nome: {} }, required: ['nome'] },
      outro: { properties: { nome: {} }, required: ['nome'] },
    },
  };
  const original = structuredClone(raiz.properties.outro);
  renomearUsosDaPropriedade(
    raiz,
    raiz.properties.grupo,
    'nome',
    'titulo',
    '/properties/grupo/properties/nome',
    '/properties/grupo/properties/titulo',
  );
  assert.deepEqual(raiz.properties.outro, original);
  assert.deepEqual(raiz.properties.grupo.required, ['titulo']);
});
