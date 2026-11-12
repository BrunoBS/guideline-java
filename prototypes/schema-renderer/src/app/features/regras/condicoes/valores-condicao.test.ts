import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { escolherValorInicialDaCondicao, resolverCampoDaCondicao } from './valores-condicao';
import { valorAtendeSchema, type Schema } from '../../../core/schema/schema-engine';
import { EditorCondicoes } from './edicao-condicoes';

test('valores iniciais atendem à origem inclusive limites, enum null, objetos e listas', () => {
  for (const campo of [
    { type: 'integer', minimum: 10, multipleOf: 3 },
    { type: 'number', exclusiveMinimum: 0, multipleOf: 0.5 },
    { type: 'string', minLength: 4, maxLength: 6 },
    { type: ['null', 'boolean'] },
    { enum: [null, 'null'] },
    { type: 'object', required: ['nome'], properties: { nome: { type: 'string' } } },
    { type: 'array', minItems: 2, items: { type: 'boolean' } },
  ] as Schema[]) {
    const inicial = escolherValorInicialDaCondicao(campo, campo);
    assert.ok(valorAtendeSchema(campo, inicial, campo));
  }
});
test('referência local combina restrições e determina controle e valor inicial sem alterar a definição', () => {
  let schema: Schema = {
    type: 'object',
    $defs: { codigo: { type: 'integer', minimum: 10 } },
    properties: { valor: { $ref: '#/$defs/codigo', maximum: 20 }, texto: { type: 'string' } },
  };
  const antes = structuredClone(schema);
  const editor = new EditorCondicoes({
    obterSchema: () => schema,
    obterCaminhoAtivo: () => '',
    obterPaleta: () => [],
    informarErro: () => {},
    alterarSchema: (editar) => {
      const copia = structuredClone(schema);
      editar(copia);
      schema = copia;
    },
  });
  editor.adicionarCondicao();
  assert.equal(editor.obterTipoEsperado(schema.allOf[0]), 'integer');
  assert.ok(schema.allOf[0].if.properties.valor.const >= 10);
  editor.definirValorEsperado(0, '12');
  assert.equal(schema.allOf[0].if.properties.valor.const, 12);
  editor.definirCampoDaCondicao(0, 'texto');
  assert.equal(schema.allOf[0].if.properties.texto.const, '');
  editor.definirCampoDaCondicao(0, 'valor');
  assert.ok(schema.allOf[0].if.properties.valor.const >= 10);
  assert.deepEqual(schema.$defs, antes.$defs);
  assert.deepEqual(schema.properties, antes.properties);
});
test('referências não resolvidas e campos sem candidato válido falham explicitamente', () => {
  assert.throws(() => resolverCampoDaCondicao({ $ref: 'https://example.com/a' }, {}), /Referência/);
  assert.throws(() => resolverCampoDaCondicao({ $ref: '#/$defs/ausente' }, {}), /Referência/);
  assert.throws(
    () => escolherValorInicialDaCondicao({ type: 'integer', minimum: 5, maximum: 1 }, {}),
    /valor inicial/,
  );
});
