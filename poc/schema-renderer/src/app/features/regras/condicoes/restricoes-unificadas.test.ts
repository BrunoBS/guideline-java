import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  criarRestricaoUnificada,
  lerComparacaoUnificada,
  obterTipoDaRestricao,
  RascunhoRestricao,
} from './restricoes-unificadas';
import { validarValor, Schema } from '../../../core/schema/schema-engine';

const rascunho = (valores: Partial<RascunhoRestricao> = {}): RascunhoRestricao => ({
  operador: 'none',
  valor: '',
  ...valores,
});
for (const [tipo, minimo, maximo, validos, invalidos] of [
  ['string', 'minLength', 'maxLength', ['abc', 'abcde'], ['a', 'abcdef']],
  ['integer', 'minimum', 'maximum', [2, 5], [1, 6, 2.5]],
  ['number', 'minimum', 'maximum', [2, 2.5, 5], [1, 6]],
  [
    'array',
    'minItems',
    'maxItems',
    [
      [1, 2],
      [1, 2, 3, 4, 5],
    ],
    [[1], [1, 2, 3, 4, 5, 6]],
  ],
  [
    'object',
    'minProperties',
    'maxProperties',
    [
      { a: 1, b: 2 },
      { a: 1, b: 2, c: 3 },
    ],
    [{ a: 1 }, { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }],
  ],
] as const) {
  test(`comparações de ${tipo} preservam limites da origem e de ramos importados`, () => {
    const campo: Schema = { type: tipo, [minimo]: 2, [maximo]: 5 };
    const origem = structuredClone(campo);
    const atual = { [minimo]: 2, [maximo]: 5, 'x-ui': { visible: true } };
    const proxima = criarRestricaoUnificada(campo, atual, rascunho(), campo);
    assert.deepEqual(proxima, atual);
    assert.deepEqual(campo, origem);
    validos.forEach((valor) =>
      assert.deepEqual(validarValor({ allOf: [campo, proxima] }, valor), []),
    );
    invalidos.forEach((valor) =>
      assert.ok(validarValor({ allOf: [campo, proxima] }, valor).length),
    );
    const valor = validos[0];
    const texto = typeof valor === 'string' ? valor : JSON.stringify(valor);
    const exata = criarRestricaoUnificada(
      campo,
      atual,
      rascunho({ operador: 'equals', valor: texto }),
      campo,
    );
    assert.deepEqual(exata, { ...atual, const: valor });
    assert.deepEqual(criarRestricaoUnificada(campo, exata, rascunho(), campo), atual);
    const invalido = invalidos[0];
    assert.throws(() =>
      criarRestricaoUnificada(
        campo,
        atual,
        rascunho({
          operador: 'equals',
          valor: typeof invalido === 'string' ? invalido : JSON.stringify(invalido),
        }),
        campo,
      ),
    );
  });
}

test('valor exato substitui apenas a comparação e preserva limites do ramo', () => {
  const campo = { type: 'string', minLength: 2 };
  const atual = { pattern: '^A', minLength: 3, maxLength: 10, 'x-ui': { visible: true } };
  assert.deepEqual(
    criarRestricaoUnificada(campo, atual, rascunho({ operador: 'equals', valor: 'ABC' }), campo),
    { const: 'ABC', minLength: 3, maxLength: 10, 'x-ui': { visible: true } },
  );
  assert.throws(() =>
    criarRestricaoUnificada(campo, atual, rascunho({ operador: 'equals', valor: 'AB' }), campo),
  );
  assert.deepEqual(
    criarRestricaoUnificada(
      campo,
      { const: 'ABC' },
      rascunho({ operador: 'starts', valor: 'X' }),
      campo,
    ),
    { pattern: '^X' },
  );
});

test('comparações preservam os tipos booleano, numérico, objeto, lista e enum', () => {
  for (const [campo, valor, esperado] of [
    [{ type: 'boolean' }, 'false', false],
    [{ type: 'integer' }, '10', 10],
    [{ type: 'number' }, '1.5', 1.5],
    [{ type: 'object' }, '{"a":1}', { a: 1 }],
    [{ type: 'array' }, '[1,2]', [1, 2]],
    [{ type: ['null', 'string'], enum: [null, 'A'] }, 'null', null],
  ] as const) {
    assert.deepEqual(
      criarRestricaoUnificada(campo, {}, rascunho({ operador: 'equals', valor }), campo),
      { const: esperado },
    );
    assert.deepEqual(
      criarRestricaoUnificada(campo, {}, rascunho({ operador: 'different', valor }), campo),
      { not: { const: esperado } },
    );
  }
  assert.deepEqual(lerComparacaoUnificada({ not: { const: null } }), {
    operador: 'different',
    valor: 'null',
  });
  assert.equal(obterTipoDaRestricao({ type: ['null', 'boolean'] }), 'boolean');
});

test('rejeita comparações incompatíveis com tipo e limites de origem', () => {
  for (const [campo, draft] of [
    [{ type: 'integer' }, rascunho({ operador: 'equals', valor: '1.5' })],
    [{ type: 'array' }, rascunho({ operador: 'equals', valor: '{}' })],
    [{ type: 'object' }, rascunho({ operador: 'equals', valor: '[]' })],
    [{ type: 'boolean' }, rascunho({ operador: 'contains', valor: 'a' })],
    [{ type: 'string', minLength: 3 }, rascunho({ operador: 'equals', valor: 'AB' })],
    [{ type: 'string', maxLength: 5 }, rascunho({ operador: 'contains', valor: 'abcdef' })],
    [{ type: 'boolean', enum: [true] }, rascunho({ operador: 'different', valor: 'true' })],
  ] as const)
    assert.throws(() => criarRestricaoUnificada(campo, {}, draft, campo));
});

test('schemas avançados preservam suas comparações e limites importados', () => {
  const atual = {
    const: 'ABC',
    pattern: '^[A-Z]+$',
    not: { enum: ['X'] },
    minLength: 2,
    maxLength: 5,
    'x-ui': { visible: true },
  };
  assert.equal(lerComparacaoUnificada(atual).operador, 'advanced');
  assert.deepEqual(
    criarRestricaoUnificada({ type: 'string' }, atual, rascunho({ operador: 'advanced' }), {}),
    atual,
  );
  assert.throws(() =>
    criarRestricaoUnificada({ type: 'string' }, atual, rascunho({ operador: 'none' }), {}),
  );
});

test('comparação não substitui schemas booleanos mesmo quando chamada diretamente', () => {
  for (const atual of [true, false]) {
    assert.equal(lerComparacaoUnificada(atual as any).operador, 'advanced');
    assert.throws(
      () => criarRestricaoUnificada({}, atual as any, rascunho({ operador: 'advanced' }), {}),
      /booleano preservado/,
    );
  }
});

test('editar comparação de campo referenciado preserva referência, anotações e regras avançadas', () => {
  const raiz: Schema = { $defs: { codigo: { type: 'integer', minimum: 1 } } };
  const atual: Schema = {
    $ref: '#/$defs/codigo',
    description: 'manter',
    'x-integracao': { chave: 'codigo' },
    allOf: [{ maximum: 10 }],
    'x-ui': { visible: true },
  };
  const original = structuredClone(atual);
  const editado = criarRestricaoUnificada(
    { type: 'integer' },
    atual,
    rascunho({ operador: 'equals', valor: '5' }),
    raiz,
  );
  assert.deepEqual(editado, { ...original, const: 5 });
  const removido = criarRestricaoUnificada({ type: 'integer' }, editado, rascunho(), raiz);
  assert.deepEqual(removido, original);
  assert.deepEqual(atual, original);
  assert.throws(
    () =>
      criarRestricaoUnificada(
        { type: 'integer' },
        atual,
        rascunho({ operador: 'equals', valor: '11' }),
        raiz,
      ),
    /validações/,
  );
});
