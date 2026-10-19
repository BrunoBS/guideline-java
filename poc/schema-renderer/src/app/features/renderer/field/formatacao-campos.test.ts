import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  obterValorFormatado,
  converterValorFormatado,
  obterTipoDoControle,
} from './formatacao-campos';

test('data e hora passam pelo controle local preservando o instante original', () => {
  const schema = { format: 'date-time' };
  const instante = '2026-10-19T12:30:00.000Z';
  assert.equal(converterValorFormatado(schema, obterValorFormatado(schema, instante)), instante);
  assert.equal(obterTipoDoControle(schema), 'datetime-local');
});

test('formatação conserva valores incompletos durante a edição', () => {
  assert.equal(converterValorFormatado({ format: 'date-time' }, '2026-10'), '2026-10');
  assert.equal(obterValorFormatado({ format: 'date-time' }, null), '');
  assert.equal(obterValorFormatado({ format: 'time' }, '12:30:00Z'), '12:30');
});
