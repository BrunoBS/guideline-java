import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  resolverEstruturaAtual,
  resolverSchemaDoCampo,
  criarValorInicial,
  obterTipoPrincipal,
  validarValor,
  obterTiposNaoNulos,
  possuiUniaoDeTipos,
  restringirTipoDoSchema,
  obterSchemaDoItem,
  obterSchemaDaPropriedade,
  validarNomeDaPropriedade,
  ajustarValorAoSchema,
  ehSchemaProibido,
  ehSchemaLivre,
} from './schema-engine';

const schema: any = {
  type: 'object',
  required: ['type', 'value'],
  properties: {
    version: { type: ['integer', 'null'], minimum: 0 },
    microserviceIdentifier: { type: 'string' },
    key: { type: 'string' },
    type: { enum: ['CONFIGURATION', 'EXPRESSION'] },
    value: {},
  },
  allOf: [
    {
      oneOf: [
        { required: ['microserviceIdentifier', 'key'], properties: { version: { type: 'null' } } },
        {
          required: ['version'],
          properties: { version: { type: 'integer' }, microserviceIdentifier: false, key: false },
        },
      ],
    },
    {
      if: { properties: { type: { const: 'EXPRESSION' } }, required: ['type'] },
      then: {
        properties: {
          value: {
            type: 'object',
            required: ['operator', 'valueType', 'value'],
            properties: {
              operator: { enum: ['EQUALS', 'CONTAINS'] },
              valueType: { enum: ['INTEGER', 'STRING'] },
              value: {},
            },
            allOf: [
              {
                if: { properties: { operator: { const: 'CONTAINS' } }, required: ['operator'] },
                then: { properties: { value: { type: 'array', minItems: 1 } } },
                else: { properties: { value: { not: { type: 'array' } } } },
              },
              {
                if: { properties: { valueType: { const: 'INTEGER' } }, required: ['valueType'] },
                then: {
                  if: { properties: { operator: { const: 'CONTAINS' } }, required: ['operator'] },
                  then: { properties: { value: { items: { type: 'integer' } } } },
                  else: { properties: { value: { type: 'integer' } } },
                },
              },
            ],
          },
        },
      },
    },
  ],
};

test('nullable version is editable as integer or null', () => {
  const create = resolverEstruturaAtual(
    schema,
    { type: 'EXPRESSION', value: {}, version: null },
    schema,
  );
  assert.deepEqual(create.properties.version.type, ['integer', 'null']);
  const update = resolverEstruturaAtual(
    schema,
    { type: 'EXPRESSION', value: {}, version: 1 },
    schema,
  );
  assert.deepEqual(update.properties.version.type, ['integer', 'null']);
});

test('CONTAINS + INTEGER resolves to array of integers', () => {
  const data = {
    type: 'EXPRESSION',
    value: { operator: 'CONTAINS', valueType: 'INTEGER', value: [1] },
    version: null,
    key: 'minha.chave',
    microserviceIdentifier: 'abc',
  };
  const field = resolverEstruturaAtual(schema, data, schema).properties.value.properties.value;
  assert.equal(obterTipoPrincipal(field), 'array');
  assert.equal(obterTipoPrincipal(field.items), 'integer');
  assert.deepEqual(validarValor(schema, data), []);
});

test('EQUALS + INTEGER resolves to scalar integer', () => {
  const data = {
    type: 'EXPRESSION',
    value: { operator: 'EQUALS', valueType: 'INTEGER', value: 1 },
    version: null,
    key: 'minha.chave',
    microserviceIdentifier: 'abc',
  };
  const field = resolverEstruturaAtual(schema, data, schema).properties.value.properties.value;
  assert.equal(obterTipoPrincipal(field), 'integer');
  assert.deepEqual(validarValor(schema, data), []);
});

test('creation and update alternatives validate independently', () => {
  const creation = {
    type: 'EXPRESSION',
    value: { operator: 'EQUALS', valueType: 'INTEGER', value: 1 },
    version: null,
    key: 'minha.chave',
    microserviceIdentifier: 'abc',
  };
  const update = {
    type: 'EXPRESSION',
    value: { operator: 'EQUALS', valueType: 'INTEGER', value: 1 },
    version: 1,
  };
  assert.deepEqual(validarValor(schema, creation), []);
  assert.deepEqual(validarValor(schema, update), []);
});

test('type unions expose all non-null alternatives', () => {
  const union: any = { type: ['string', 'integer', 'number', 'boolean', 'null'] };
  assert.equal(possuiUniaoDeTipos(union), true);
  assert.deepEqual(obterTiposNaoNulos(union), ['string', 'integer', 'number', 'boolean']);
  assert.equal(obterTipoPrincipal(restringirTipoDoSchema(union, 'boolean', union)), 'boolean');
});

test('optional properties are not created unless required/default/const', () => {
  const s: any = {
    type: 'object',
    required: ['requiredValue'],
    properties: {
      requiredValue: { type: 'string' },
      optionalValue: { type: 'string' },
      withDefault: { type: 'integer', default: 5 },
    },
  };
  assert.deepEqual(criarValorInicial(s, s), { requiredValue: '', withDefault: 5 });
});

test('optional nullable properties initialize as null', () => {
  const s: any = { type: 'object', properties: { description: { type: ['string', 'null'] } } };
  assert.deepEqual(criarValorInicial(s, s), { description: null });
});

test('optional non-nullable enum must be omitted instead of serialized as null', () => {
  const publisher: any = {
    type: 'object',
    required: ['code', 'settings'],
    properties: { code: { type: 'string', enum: ['HTTP'] }, settings: { type: 'object' } },
    allOf: [
      {
        if: { properties: { code: { const: 'HTTP' } }, required: ['code'] },
        then: {
          properties: {
            settings: {
              type: 'object',
              additionalProperties: false,
              required: ['endpoint'],
              properties: {
                endpoint: { type: 'string', format: 'uri' },
                method: { enum: ['POST', 'PUT'] },
              },
            },
          },
        },
      },
    ],
  };
  const initialValue = criarValorInicial(publisher, publisher);
  assert.deepEqual(initialValue, { code: 'HTTP', settings: { endpoint: '' } });
  assert.deepEqual(
    validarValor(publisher, { code: 'HTTP', settings: { endpoint: 'https://example.com' } }),
    [],
  );
  assert.notDeepEqual(
    validarValor(publisher, {
      code: 'HTTP',
      settings: { endpoint: 'https://example.com', method: null },
    }),
    [],
  );
  assert.deepEqual(
    ajustarValorAoSchema(
      publisher,
      { code: 'HTTP', settings: { endpoint: 'https://example.com', method: null } },
      publisher,
    ),
    { code: 'HTTP', settings: { endpoint: 'https://example.com' } },
  );
});

test('boolean schemas validate true and reject false', () => {
  assert.deepEqual(validarValor(true, { anything: 'goes' }), []);
  assert.notDeepEqual(validarValor(false, 'nope'), []);
  assert.equal(ehSchemaProibido(resolverEstruturaAtual(false, 'x', {})), true);
});

test('hybrid object preserves fixed and additional properties', () => {
  const s: any = {
    type: 'object',
    properties: { responsavel: { type: 'string' }, sigla: { type: 'string' } },
    additionalProperties: { type: 'string' },
  };
  const data = { responsavel: 'Bruno', sigla: 'PM', ownerTeam: 'platform' };
  assert.deepEqual(ajustarValorAoSchema(s, data, s), data);
  assert.equal(obterTipoPrincipal(obterSchemaDaPropriedade(s, 'ownerTeam', s)), 'string');
});

test('additionalProperties true allows unconstrained dynamic values', () => {
  const s: any = {
    type: 'object',
    properties: { name: { type: 'string' } },
    additionalProperties: true,
  };
  const data = { name: 'app', free: { nested: true }, count: 5 };
  assert.deepEqual(ajustarValorAoSchema(s, data, s), data);
});

test('additionalProperties false removes unknown values during reconciliation', () => {
  const s: any = {
    type: 'object',
    properties: { name: { type: 'string' } },
    additionalProperties: false,
  };
  assert.deepEqual(ajustarValorAoSchema(s, { name: 'app', unknown: 'x' }, s), { name: 'app' });
});

test('patternProperties selects schema for matching dynamic key', () => {
  const s: any = {
    type: 'object',
    patternProperties: { '^x-': { type: 'integer' } },
    additionalProperties: false,
  };
  assert.equal(obterTipoPrincipal(obterSchemaDaPropriedade(s, 'x-timeout', s)), 'integer');
  assert.equal(ehSchemaProibido(obterSchemaDaPropriedade(s, 'other', s)), true);
  assert.deepEqual(validarValor(s, { 'x-timeout': 10 }), []);
});

test('propertyNames validates dynamic keys', () => {
  const s: any = {
    type: 'object',
    propertyNames: { pattern: '^[a-z][a-z0-9-]*$' },
    additionalProperties: true,
  };
  assert.equal(validarNomeDaPropriedade(s, 'valid-key', s), '');
  assert.notEqual(validarNomeDaPropriedade(s, 'INVALID KEY', s), '');
});

test('prefixItems resolves tuple schemas by position', () => {
  const s: any = {
    type: 'array',
    prefixItems: [{ type: 'string' }, { type: 'integer' }],
    items: false,
  };
  assert.equal(obterTipoPrincipal(obterSchemaDoItem(s, 0, s)), 'string');
  assert.equal(obterTipoPrincipal(obterSchemaDoItem(s, 1, s)), 'integer');
  assert.equal(ehSchemaProibido(obterSchemaDoItem(s, 2, s)), true);
  assert.deepEqual(validarValor(s, ['code', 10]), []);
  assert.notDeepEqual(validarValor(s, ['code', 10, 'extra']), []);
});

test('dependentRequired becomes effective when trigger exists', () => {
  const s: any = {
    type: 'object',
    properties: { creditCard: { type: 'string' }, billingAddress: { type: 'string' } },
    dependentRequired: { creditCard: ['billingAddress'] },
  };
  const resolved = resolverEstruturaAtual(s, { creditCard: '123' }, s);
  assert.deepEqual(resolved.required, ['billingAddress']);
  assert.notDeepEqual(validarValor(s, { creditCard: '123' }), []);
  assert.deepEqual(validarValor(s, { creditCard: '123', billingAddress: 'Rua A' }), []);
});

test('dependentSchemas contributes properties when trigger exists', () => {
  const s: any = {
    type: 'object',
    properties: { mode: { type: 'string' } },
    dependentSchemas: {
      mode: { properties: { details: { type: 'string' } }, required: ['details'] },
    },
  };
  const resolved = resolverEstruturaAtual(s, { mode: 'advanced' }, s);
  assert.equal(obterTipoPrincipal(resolved.properties.details), 'string');
  assert.ok(resolved.required.includes('details'));
});

test('anyOf merges all branches currently satisfied by the value', () => {
  const s: any = {
    type: 'object',
    anyOf: [{ properties: { a: { type: 'string' } } }, { properties: { b: { type: 'integer' } } }],
  };
  const resolved = resolverEstruturaAtual(s, { a: 'x', b: 1 }, s);
  assert.equal(obterTipoPrincipal(resolved.properties.a), 'string');
  assert.equal(obterTipoPrincipal(resolved.properties.b), 'integer');
});

test('contains minContains and maxContains are delegated to JSON Schema validation', () => {
  const s: any = {
    type: 'array',
    contains: { type: 'integer', minimum: 10 },
    minContains: 1,
    maxContains: 2,
  };
  assert.deepEqual(validarValor(s, [1, 10, 20]), []);
  assert.notDeepEqual(validarValor(s, [1, 2, 3]), []);
  assert.notDeepEqual(validarValor(s, [10, 20, 30]), []);
});

test('minProperties and maxProperties are enforced by validation', () => {
  const s: any = { type: 'object', minProperties: 1, maxProperties: 2, additionalProperties: true };
  assert.notDeepEqual(validarValor(s, {}), []);
  assert.deepEqual(validarValor(s, { a: 1, b: 2 }), []);
  assert.notDeepEqual(validarValor(s, { a: 1, b: 2, c: 3 }), []);
});

test('not constraints remain enforced', () => {
  const s: any = { type: 'string', not: { const: 'FORBIDDEN' } };
  assert.deepEqual(validarValor(s, 'OK'), []);
  assert.notDeepEqual(validarValor(s, 'FORBIDDEN'), []);
});

test('unevaluatedProperties false removes fields not evaluated by the effective schema', () => {
  const s: any = {
    type: 'object',
    properties: { name: { type: 'string' } },
    unevaluatedProperties: false,
  };
  assert.deepEqual(ajustarValorAoSchema(s, { name: 'app', extra: 'x' }, s), { name: 'app' });
  assert.equal(ehSchemaProibido(obterSchemaDaPropriedade(s, 'extra', s)), true);
});

test('unevaluatedProperties schema is used for dynamic values', () => {
  const s: any = {
    type: 'object',
    properties: { name: { type: 'string' } },
    unevaluatedProperties: { type: 'integer' },
  };
  assert.equal(obterTipoPrincipal(obterSchemaDaPropriedade(s, 'priority', s)), 'integer');
  assert.deepEqual(ajustarValorAoSchema(s, { name: 'app', priority: 2 }, s), {
    name: 'app',
    priority: 2,
  });
});

test('external refs are exposed as free editable schemas instead of failing silently', () => {
  const s: any = { $ref: 'https://example.com/schemas/config.json' };
  const resolved = resolverEstruturaAtual(s, { a: 1 }, s);
  assert.equal(resolved.__externalRef, 'https://example.com/schemas/config.json');
  assert.equal(ehSchemaLivre(resolved), true);
});

test('switching conditional branch removes properties introduced only by the previous branch', () => {
  const notification: any = {
    type: 'object',
    required: ['tipo'],
    properties: { tipo: { type: 'string', enum: ['EMAIL', 'SMS'] } },
    allOf: [
      {
        if: { properties: { tipo: { const: 'EMAIL' } }, required: ['tipo'] },
        then: { required: ['email'], properties: { email: { type: 'string', format: 'email' } } },
      },
    ],
  };
  const stale = { tipo: 'SMS', email: 'bbs@bbs.com' };
  assert.deepEqual(ajustarValorAoSchema(notification, stale, notification), { tipo: 'SMS' });
});

test('conditional cleanup works for nested branch-only properties', () => {
  const publisher: any = {
    type: 'object',
    required: ['code', 'settings'],
    properties: { code: { type: 'string', enum: ['HTTP', 'KAFKA'] }, settings: { type: 'object' } },
    allOf: [
      {
        if: { properties: { code: { const: 'HTTP' } }, required: ['code'] },
        then: {
          properties: {
            settings: {
              type: 'object',
              properties: { endpoint: { type: 'string' }, method: { type: 'string' } },
            },
          },
        },
      },
      {
        if: { properties: { code: { const: 'KAFKA' } }, required: ['code'] },
        then: {
          properties: { settings: { type: 'object', properties: { topic: { type: 'string' } } } },
        },
      },
    ],
  };
  const stale = {
    code: 'KAFKA',
    settings: { topic: 'events', endpoint: 'https://example.com', method: 'POST' },
  };
  assert.deepEqual(ajustarValorAoSchema(publisher, stale, publisher), {
    code: 'KAFKA',
    settings: { topic: 'events' },
  });
});

test('field resolution retains nested alternatives and conditions for subsequent edits', () => {
  const nested = {
    type: 'object',
    properties: {
      mode: { enum: ['text', 'number'] },
      value: {},
      choice: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
    },
    if: { properties: { mode: { const: 'number' } }, required: ['mode'] },
    then: { properties: { value: { type: 'integer' } } },
    else: { properties: { value: { type: 'string' } } },
  };
  const root = { type: 'object', properties: { nested } };
  const parent = resolverSchemaDoCampo(root, { nested: { mode: 'text' } }, root);
  assert.deepEqual(parent.properties.nested, nested);
  const textField = resolverSchemaDoCampo(parent.properties.nested, { mode: 'text' }, root);
  assert.equal(textField.properties.value.type, 'string');
  assert.equal(textField.properties.choice.oneOf.length, 2);
  const numberField = resolverSchemaDoCampo(parent.properties.nested, { mode: 'number' }, root);
  assert.equal(numberField.properties.value.type, 'integer');
});

test('false properties remain forbidden through multiple allOf merges', () => {
  const contract = {
    type: 'object',
    properties: { blocked: false },
    allOf: [{ properties: { blocked: { type: 'string' } } }, { properties: { blocked: true } }],
  };
  assert.equal(
    ehSchemaProibido(
      resolverSchemaDoCampo(contract, { blocked: 'x' }, contract).properties.blocked,
    ),
    true,
  );
  assert.deepEqual(ajustarValorAoSchema(contract, { blocked: 'x' }, contract), {});
});

test('boolean conditional branches preserve false instead of replacing it with an empty schema', () => {
  for (const contract of [
    { if: true, then: false, else: {} },
    { if: false, then: {}, else: false },
  ]) {
    assert.equal(ehSchemaProibido(resolverSchemaDoCampo(contract, 'value', contract)), true);
    assert.notDeepEqual(validarValor(contract, 'value'), []);
  }
});

test('propertyNames false rejects every property name', () => {
  const contract = { type: 'object', propertyNames: false };
  assert.notEqual(validarNomeDaPropriedade(contract, 'any', contract), '');
  assert.deepEqual(validarValor(contract, {}), []);
  assert.notDeepEqual(validarValor(contract, { any: 1 }), []);
});

test('fixed properties also satisfy every matching patternProperties rule', () => {
  const contract = {
    type: 'object',
    properties: { code: { type: 'string' } },
    patternProperties: { '^co': { minLength: 3 }, de$: { maxLength: 5 } },
  };
  const field = obterSchemaDaPropriedade(contract, 'code', contract);
  assert.equal(field.type, 'string');
  assert.equal(field.minLength, 3);
  assert.equal(field.maxLength, 5);
});

test('JSON object enum and const values compare structurally when reconciling', () => {
  const object = { a: 1, b: [2, 3] };
  const enumContract = { enum: [object] };
  const value = { b: [2, 3], a: 1 };
  assert.equal(ajustarValorAoSchema(enumContract, value, enumContract), value);
  const constContract = { const: object, allOf: [{ const: { b: [2, 3], a: 1 } }] };
  assert.equal(ehSchemaProibido(resolverSchemaDoCampo(constContract, value, constContract)), false);
  assert.deepEqual(validarValor(constContract, value), []);
});

test('inherited JavaScript keys are treated as additional JSON properties', () => {
  const contract = { type: 'object', properties: {}, additionalProperties: false };
  assert.equal(ehSchemaProibido(obterSchemaDaPropriedade(contract, 'constructor', contract)), true);
  assert.deepEqual(ajustarValorAoSchema(contract, { constructor: 'data' }, contract), {});
});
