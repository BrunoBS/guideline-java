import schemaAjustado from '../../data/environment-type-compatibility.schema.json';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { schemaCompatibilidadeTipos as schema } from '../../testes/fixtures/compatibilidade-tipos.schema';
import {
  validarValor,
  resolverSchemaDoCampo,
  valorAtendeSchema,
  obterProblemasDeValidacao,
} from './schema-engine';

test('compatibilidade valida as 16 combinações, permitindo apenas pai e filho diferentes', () => {
  const tipos = schema.properties.parentTypeCode.enum as string[];
  for (const pai of tipos)
    for (const filho of tipos) {
      assert.equal(
        validarValor(schema, { parentTypeCode: pai, childTypeCode: filho }).length === 0,
        pai !== filho,
        `${pai} -> ${filho}`,
      );
      const campo = resolverSchemaDoCampo(
        schema,
        { parentTypeCode: pai, childTypeCode: filho },
        schema,
      ).properties.childTypeCode;
      assert.equal(valorAtendeSchema(campo, filho, schema), pai !== filho);
    }
});

test('sem o pai, todas as condições sem required se aplicam e nenhuma negação é perdida', () => {
  const campo = resolverSchemaDoCampo(schema, { childTypeCode: 'DEFAULT' }, schema).properties
    .childTypeCode;
  for (const tipo of schema.properties.childTypeCode.enum)
    assert.equal(valorAtendeSchema(campo, tipo, schema), false);
  assert.notDeepEqual(validarValor(schema, { childTypeCode: 'CUSTOM' }), []);
});

test('schema ajustado mantém as 16 combinações e só ativa o SE quando o pai existe', () => {
  for (const regra of schemaAjustado.allOf) {
    assert.deepEqual(regra.if.required, ['parentTypeCode']);
    assert.equal(valorAtendeSchema(regra.if, {}, schemaAjustado), false);
  }
  const tipos = schemaAjustado.properties.parentTypeCode.enum;
  for (const pai of tipos)
    for (const filho of tipos) {
      const valor = { parentTypeCode: pai, childTypeCode: filho };
      assert.equal(validarValor(schemaAjustado, valor).length === 0, pai !== filho);
      assert.equal(
        validarValor(schemaAjustado, valor).length === 0,
        validarValor(schema, valor).length === 0,
      );
    }
  const incompleto = { childTypeCode: 'CUSTOM' };
  assert.deepEqual(
    obterProblemasDeValidacao(schemaAjustado, incompleto).map((problema) => problema.path),
    ['/parentTypeCode'],
  );
  const campo = resolverSchemaDoCampo(schemaAjustado, incompleto, schemaAjustado).properties
    .childTypeCode;
  for (const tipo of tipos) assert.equal(valorAtendeSchema(campo, tipo, schemaAjustado), true);
  assert.deepEqual(
    validarValor(schemaAjustado, { parentTypeCode: 'DEFAULT', childTypeCode: 'CUSTOM', campo: 1 }),
    [],
  );
});
