import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { compilarValidador } from './schema-validator';
import { validarValor } from './validacao-schema';

test('formatos são configuráveis e o cache separa os perfis sem mudar o contrato', () => {
  const schema = { type: 'string', format: 'email' };
  const padrao = compilarValidador(schema);
  const anotacao = compilarValidador(schema, { formatos: 'anotacao' });
  assert.equal(padrao('email-invalido'), false);
  assert.equal(anotacao('email-invalido'), true);
  assert.notEqual(padrao, anotacao);
  assert.deepEqual(schema, { type: 'string', format: 'email' });
});

test('registro externo é explícito, isolado, usa URI de recuperação e não modifica os recursos', () => {
  const schema = { $ref: 'https://example.test/recuperado#/$defs/valor' };
  const recursos = {
    'https://example.test/recuperado': {
      $id: 'https://example.test/canonico',
      $defs: { valor: { type: 'integer' } },
    },
  };
  const antes = structuredClone(recursos);
  assert.throws(() => compilarValidador(schema));
  const validar = compilarValidador(schema, { recursos });
  assert.equal(validar(2), true);
  assert.equal(validar('2'), false);
  assert.deepEqual(recursos, antes);
  assert.throws(() => compilarValidador(schema));
  assert.notEqual(
    compilarValidador(schema, {
      recursos: { 'https://example.test/recuperado': { $defs: { valor: { type: 'string' } } } },
    }),
    validar,
  );
});

test('registro aceita recurso booleano e recursos encadeados', () => {
  const recursos = {
    'https://example.test/base/a': { $ref: 'b' },
    'https://example.test/base/b': true,
  };
  assert.deepEqual(validarValor({ $ref: 'https://example.test/base/a' }, {}, { recursos }), []);
  assert.notDeepEqual(
    validarValor(
      { $ref: 'https://example.test/base/a' },
      {},
      { recursos: { ...recursos, 'https://example.test/base/b': false } },
    ),
    [],
  );
});

test('escopos dinâmicos não vazam entre ramos e respeitam anchors destacados', () => {
  const schema = {
    $id: 'https://example.test/main',
    if: { properties: { tipo: { const: 'inteiro' } }, required: ['tipo'] },
    then: { $ref: 'numeros' },
    else: { $ref: 'textos' },
    $defs: {
      base: {
        $id: 'base',
        properties: { itens: { items: { $dynamicRef: '#item' } } },
        $defs: { item: { $dynamicAnchor: 'item' } },
      },
      numeros: {
        $id: 'numeros',
        $ref: 'base',
        $defs: { item: { $dynamicAnchor: 'item', type: 'integer' } },
      },
      textos: {
        $id: 'textos',
        $ref: 'base',
        $defs: { item: { $dynamicAnchor: 'item', type: 'string' } },
      },
    },
  };
  for (const [dado, valido] of [
    [{ tipo: 'inteiro', itens: [1] }, true],
    [{ tipo: 'texto', itens: ['um'] }, true],
    [{ tipo: 'inteiro', itens: ['um'] }, false],
    [{ tipo: 'texto', itens: [1] }, false],
  ] as const)
    assert.equal(validarValor(schema, dado).length === 0, valido);
});

test('unevaluated combina if sem ramo, contains mínimo zero e nomes escapados', () => {
  assert.deepEqual(
    validarValor(
      { if: { properties: { 'a/b': { type: 'integer' } } }, unevaluatedProperties: false },
      { 'a/b': 1 },
    ),
    [],
  );
  assert.notDeepEqual(
    validarValor(
      { if: { properties: { 'a/b': { type: 'integer' } } }, unevaluatedProperties: false },
      { 'a/b': 'x' },
    ),
    [],
  );
  assert.deepEqual(
    validarValor({ contains: { type: 'string' }, minContains: 0, unevaluatedItems: false }, [
      'a',
      'b',
    ]),
    [],
  );
  assert.notDeepEqual(
    validarValor({ contains: { type: 'string' }, minContains: 0, unevaluatedItems: false }, [
      'a',
      1,
    ]),
    [],
  );
  const erro = validarValor({ unevaluatedProperties: { type: 'integer' } }, { 'a/b~c': 'x' });
  assert.match(erro[0], /a~1b~0c/);
});

test('ciclos sem avanço e orçamento de profundidade não aceitam dados silenciosamente', () => {
  assert.notDeepEqual(validarValor({ $ref: '#' }, {}), []);
  const schema = { type: 'object', properties: { filho: { $ref: '#' } } };
  let dado: Record<string, unknown> = {};
  for (let i = 0; i < 300; i++) dado = { filho: dado };
  assert.match(validarValor(schema, dado).join(' '), /Limite de avaliação/);
});

test('metaschema registrado pode omitir validation, mas vocabulário obrigatório desconhecido é recusado', () => {
  const meta = 'https://example.test/meta';
  const schema = { $schema: meta, properties: { numero: { minimum: 10 } } };
  const recursos = {
    [meta]: {
      $id: meta,
      $vocabulary: {
        'https://json-schema.org/draft/2020-12/vocab/core': true,
        'https://json-schema.org/draft/2020-12/vocab/applicator': true,
      },
    },
  };
  assert.deepEqual(validarValor(schema, { numero: 1 }, { recursos }), []);
  assert.throws(() => compilarValidador(schema));
  assert.throws(
    () =>
      compilarValidador(schema, {
        recursos: { [meta]: { $id: meta, $vocabulary: { 'https://example.test/vocab': true } } },
      }),
    /Vocabulário obrigatório/,
  );
});

test('identificadores e anchors duplicados são recusados em documentos compostos', () => {
  assert.throws(
    () =>
      compilarValidador({
        $ref: '#/$defs/a',
        $defs: {
          a: { $id: 'https://example.test/repetido' },
          b: { $id: 'https://example.test/repetido' },
        },
      }),
    /duplicada/,
  );
  assert.throws(
    () =>
      compilarValidador({ $ref: '#a', $defs: { a: { $anchor: 'a' }, b: { $dynamicAnchor: 'a' } } }),
    /duplicado/,
  );
});

test('falha ao preparar um alvo dinâmico não é aceita na segunda validação', () => {
  const schema = {
    $id: 'https://example.test/root',
    $ref: 'generico',
    $defs: {
      alvo: { $dynamicAnchor: 'item', $ref: 'ausente' },
      generico: {
        $id: 'generico',
        items: { $dynamicRef: '#item' },
        $defs: { item: { $dynamicAnchor: 'item' } },
      },
    },
  };
  const validar = compilarValidador(schema);
  assert.throws(() => validar([1]), /resolve reference/);
  assert.throws(() => validar([1]), /resolve reference/);
});
