import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { criarComparacaoDaCondicao, lerComparacaoDaCondicao } from './comparacoes-condicao';
import { valorAtendeSchema } from '../../../core/schema/schema-engine';
for (const [operador, esperados] of [
  ['greater', [false, false, true]],
  ['greaterOrEqual', [false, true, true]],
  ['less', [true, false, false]],
  ['lessOrEqual', [true, true, false]],
] as [string, boolean[]][]) {
  test(`SE ${operador} respeita os limites na validação e pode ser reaberto`, () => {
    const comparacao = criarComparacaoDaCondicao(operador, 5, ['integer']);
    assert.deepEqual(lerComparacaoDaCondicao(comparacao), { operador, valor: 5 });
    assert.deepEqual(
      [4, 5, 6].map((valor) => valorAtendeSchema(comparacao, valor, comparacao)),
      esperados,
    );
  });
}
for (const [operador, valores] of [
  ['contains', ['a.b', 'x a.b y', 'axb']],
  ['starts', ['a.b', 'a.b resto', 'x a.b']],
  ['ends', ['a.b', 'antes a.b', 'a.b x']],
] as [string, string[]][]) {
  test(`SE ${operador} e sua negação tratam o trecho literalmente`, () => {
    const comparacao = criarComparacaoDaCondicao(operador, 'a.b', ['string']);
    assert.deepEqual(lerComparacaoDaCondicao(comparacao), { operador, valor: 'a.b' });
    assert.deepEqual(
      valores.map((valor) => valorAtendeSchema(comparacao, valor, comparacao)),
      [true, true, false],
    );
    const negada = criarComparacaoDaCondicao(
      'not' + operador[0].toUpperCase() + operador.slice(1),
      'a.b',
      ['string'],
    );
    assert.deepEqual(
      valores.map((valor) => valorAtendeSchema(negada, valor, negada)),
      [false, false, true],
    );
  });
}
test('comparações combinadas importadas permanecem avançadas e operadores incompatíveis são recusados', () => {
  assert.equal(lerComparacaoDaCondicao({ minimum: 1, maximum: 10 }), undefined);
  assert.equal(lerComparacaoDaCondicao({ pattern: '^[A-Z]{3}$' }), undefined);
  assert.throws(() => criarComparacaoDaCondicao('greater', 2, ['string']), /incompatível/);
  assert.throws(() => criarComparacaoDaCondicao('contains', '', ['string']), /trecho/);
});

test('required e not required verificam presença independentemente do conteúdo', () => {
  for (const valor of [false, null, '', 0, {}, []]) {
    assert.equal(valorAtendeSchema({ required: ['campo'] }, { campo: valor }, {}), true);
    assert.equal(valorAtendeSchema({ not: { required: ['campo'] } }, { campo: valor }, {}), false);
  }
  assert.equal(valorAtendeSchema({ required: ['campo'] }, {}, {}), false);
  assert.equal(valorAtendeSchema({ not: { required: ['campo'] } }, {}, {}), true);
});
