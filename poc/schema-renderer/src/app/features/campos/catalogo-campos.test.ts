import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { validarValor } from '../../core/schema/schema-engine';
import { CATALOGO_CAMPOS, criarSchemaDoCampo } from './catalogo-campos';

test('catálogo cria os seis tipos de campo com contratos válidos e o título informado', () => {
  const valores: Record<string, unknown> = {
    string: 'texto',
    integer: 1,
    number: 1.5,
    boolean: false,
    object: {},
    array: [],
  };
  assert.deepEqual(
    CATALOGO_CAMPOS.map((campo) => campo.rotulo),
    ['Texto', 'Inteiro', 'Decimal', 'Sim / Não', 'Objeto', 'Lista'],
  );
  for (const definicao of CATALOGO_CAMPOS) {
    const schema = criarSchemaDoCampo(definicao.tipo, 'Meu campo');
    assert.equal(schema.title, 'Meu campo');
    assert.equal(schema.type, definicao.tipo);
    assert.deepEqual(validarValor(schema, valores[definicao.tipo]), []);
  }
});

test('objetos e listas novos não compartilham estruturas mutáveis', () => {
  const objeto = criarSchemaDoCampo('object', 'A');
  objeto.properties.extra = { type: 'string' };
  assert.deepEqual(criarSchemaDoCampo('object', 'B').properties, {});
  const lista = criarSchemaDoCampo('array', 'A');
  lista.items.minLength = 4;
  assert.deepEqual(criarSchemaDoCampo('array', 'B').items, { type: 'string' });
});
