import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { campoVisivelNaCondicao } from './visibilidade-condicional';
import type { Schema } from '../../../core/schema/schema-engine';

test('visibilidade avalia condições compostas, SENÃO e múltiplos ramos pelo contrato', () => {
  const schema: Schema = {
    type: 'object',
    properties: {
      tipo: { type: 'string' },
      idade: { type: 'integer' },
      detalhe: { type: 'string' },
      outro: { type: 'string' },
    },
    allOf: [
      {
        if: {
          properties: { tipo: { const: 'X' }, idade: { minimum: 18 } },
          required: ['tipo', 'idade'],
        },
        then: { required: ['detalhe'] },
        else: { required: ['outro'] },
      },
      {
        if: { properties: { tipo: { const: 'Y' } }, required: ['tipo'] },
        then: { required: ['detalhe'] },
      },
    ],
  };
  const visivel = (campo: string, valor: Record<string, unknown>) =>
    campoVisivelNaCondicao(schema, campo, valor, schema);
  assert.equal(visivel('detalhe', {}), false);
  assert.equal(visivel('detalhe', { tipo: 'X', idade: 17 }), false);
  assert.equal(visivel('detalhe', { tipo: 'X', idade: 18 }), true);
  assert.equal(visivel('outro', { tipo: 'X', idade: 18 }), false);
  assert.equal(visivel('outro', { tipo: 'X', idade: 17 }), true);
  assert.equal(visivel('detalhe', { tipo: 'Y' }), true);
  schema.required = ['detalhe'];
  assert.equal(visivel('detalhe', {}), true);
});

test('visibilidade explícita permite mostrar campos opcionais e alternar entre ramos', () => {
  const schema: Schema = {
    type: 'object',
    properties: { tipo: { type: 'string' }, detalhe: { type: 'string' } },
    allOf: [
      {
        if: { properties: { tipo: { const: 'X' } }, required: ['tipo'] },
        then: { properties: { detalhe: { 'x-ui': { visible: true } } } },
        else: { properties: { detalhe: { 'x-ui': { visible: false } } } },
      },
    ],
  };
  assert.equal(campoVisivelNaCondicao(schema, 'detalhe', { tipo: 'X' }, schema), true);
  assert.equal(campoVisivelNaCondicao(schema, 'detalhe', { tipo: 'Y' }, schema), false);
  assert.equal(campoVisivelNaCondicao(schema, 'detalhe', {}, schema), false);
  delete schema.allOf[0].else;
  assert.equal(campoVisivelNaCondicao(schema, 'detalhe', { tipo: 'Y' }, schema), false);
});
