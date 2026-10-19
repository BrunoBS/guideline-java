import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { EditorCondicoes } from './edicao-condicoes';
import { Schema } from '../../../core/schema/schema-engine';
function preparar(
  campo: Schema,
  condicao: Schema = { properties: { valor: { const: '' } }, required: ['valor'] },
) {
  let schema: Schema = {
    type: 'object',
    properties: { valor: campo },
    allOf: [{ if: condicao, else: { title: 'preservar' } }],
  };
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
  return {
    editor,
    get schema() {
      return schema;
    },
  };
}
test('condição composta importada permanece intacta ao tentar edição simplificada', () => {
  const tela = preparar(
    { type: 'string' },
    {
      properties: { valor: { const: 'A' }, outro: { const: true } },
      required: ['valor', 'outro'],
      description: 'manter',
    },
  );
  const antes = structuredClone(tela.schema);
  tela.editor.definirValorEsperado(0, 'B');
  assert.deepEqual(tela.schema, antes);
  assert.match(tela.editor.mensagemErro, /avançada/);
});
test('if/else aparece e editar preserva ausência de required e anotações', () => {
  const tela = preparar(
    { type: 'string' },
    { properties: { valor: { const: 'A' } }, description: 'manter' },
  );
  assert.equal(tela.editor.condicoesVisiveis.length, 1);
  tela.editor.definirValorEsperado(0, 'B');
  assert.deepEqual(tela.schema.allOf[0], {
    if: { properties: { valor: { const: 'B' } }, description: 'manter' },
    else: { title: 'preservar' },
  });
});
for (const [campo, texto, esperado] of [
  [{ type: 'integer' }, '12', 12],
  [{ type: 'number' }, '1.5', 1.5],
  [{ type: ['string', 'null'] }, 'null', 'null'],
  [{ type: 'object' }, '{"a":1}', { a: 1 }],
  [{ type: 'array' }, '[1,true]', [1, true]],
  [{ enum: [false, 2, null] }, '2', 2],
] as [Schema, string, unknown][]) {
  test(`comparação converte ${JSON.stringify(campo)} sem transformar valores em texto`, () => {
    const tela = preparar(campo);
    if (campo.enum) tela.editor.definirValorTipadoEsperado(0, esperado);
    else tela.editor.definirValorEsperado(0, texto);
    assert.deepEqual(tela.schema.allOf[0].if.properties.valor.const, esperado);
    assert.equal(tela.editor.mensagemErro, '');
    assert.notEqual(tela.editor.obterValorEsperado(tela.schema.allOf[0]), '[object Object]');
  });
}
test('inteiro fracionário e JSON de tipo incorreto não alteram a condição', () => {
  for (const [campo, texto] of [
    [{ type: 'integer' }, '1.5'],
    [{ type: 'object' }, '[]'],
    [{ type: 'array' }, '{}'],
  ] as [Schema, string][]) {
    const tela = preparar(campo);
    const antes = structuredClone(tela.schema);
    tela.editor.definirValorEsperado(0, texto);
    assert.deepEqual(tela.schema, antes);
    assert.ok(tela.editor.mensagemErro);
  }
});

test('null explícito é distinto do texto null e trocar operador preserva o tipo', () => {
  const tela = preparar({ type: ['string', 'null'] });
  tela.editor.definirValorEsperado(0, 'null');
  assert.equal(tela.schema.allOf[0].if.properties.valor.const, 'null');
  tela.editor.definirTipoEsperado(0, 'null');
  assert.equal(tela.schema.allOf[0].if.properties.valor.const, null);
  tela.editor.definirOperadorDaCondicao(0, 'different');
  assert.deepEqual(tela.schema.allOf[0].if.properties.valor, { not: { const: null } });
});
test('enum não confunde valores com a mesma representação textual', () => {
  const tela = preparar({ enum: [2, '2', null, 'null', { a: 1 }] });
  for (const valor of tela.schema.properties.valor.enum) {
    tela.editor.definirValorTipadoEsperado(0, valor);
    assert.deepEqual(tela.editor.obterValorTipado(tela.schema.allOf[0]), valor);
    tela.editor.definirOperadorDaCondicao(0, 'different');
    assert.deepEqual(tela.editor.obterValorTipado(tela.schema.allOf[0]), valor);
  }
});
test('união permite selecionar tipo e recusa conversão inválida sem mudar o schema', () => {
  const tela = preparar({ type: ['string', 'integer', 'array', 'object', 'boolean', 'null'] });
  for (const tipo of ['integer', 'array', 'object', 'boolean', 'null', 'string']) {
    tela.editor.definirTipoEsperado(0, tipo);
    assert.equal(tela.editor.obterTipoEsperado(tela.schema.allOf[0]), tipo);
  }
  tela.editor.definirTipoEsperado(0, 'integer');
  const antes = structuredClone(tela.schema);
  tela.editor.definirValorEsperado(0, '1.5');
  assert.deepEqual(tela.schema, antes);
});

for (const booleano of [true, false]) {
  test(`ramos booleanos ${booleano} permanecem intactos em todos os comandos de edição`, () => {
    const tela = preparar({ type: 'string' });
    tela.schema.allOf[0].then = booleano;
    const antes = structuredClone(tela.schema);
    tela.editor.adicionarCampoExistenteAoRamo(0, 'then', 'valor');
    tela.editor.adicionarCampoAoRamo(0, 'then');
    tela.editor.definirRestricaoDoRamo(0, 'then', 'valor', { const: 'A' });
    tela.editor.definirObrigatoriedadeDoCampoDoRamo(0, 'then', 'valor', true);
    tela.editor.definirVisibilidadeDoCampoDoRamo(0, 'then', 'valor', true);
    tela.editor.removerCampoDoRamo(0, 'then', 'valor');
    assert.deepEqual(tela.schema, antes);
    assert.match(tela.editor.mensagemErro, /booleano preservado/);
  });
  test(`propriedade booleana ${booleano} não vira objeto ao editar obrigações e restrições`, () => {
    const tela = preparar({ type: 'string' });
    tela.schema.allOf[0].else = { properties: { valor: booleano }, description: 'manter' };
    const antes = structuredClone(tela.schema);
    tela.editor.definirObrigatoriedadeDoCampoDoRamo(0, 'else', 'valor', true);
    tela.editor.definirRestricaoDoRamo(0, 'else', 'valor', { const: 'A' });
    tela.editor.definirVisibilidadeDoCampoDoRamo(0, 'else', 'valor', true);
    assert.deepEqual(tela.schema, antes);
    assert.equal(tela.editor.listarCamposDoRamo(tela.schema.allOf[0], 'else')[0].schema, booleano);
  });
}

test('editar obrigatoriedade e visibilidade preserva referências e regras avançadas nos ramos', () => {
  const tela = preparar({ type: 'string' });
  const ramo = {
    $ref: '#/$defs/ramo',
    allOf: [{ minProperties: 1 }],
    'x-integracao': { id: 'ramo' },
    properties: {
      valor: {
        $ref: '#/$defs/valor',
        not: { anyOf: [{ const: 'A' }, { const: 'B' }] },
        'x-ui': { controle: 'texto' },
      },
    },
  };
  tela.schema.allOf[0].else = structuredClone(ramo);
  tela.editor.definirObrigatoriedadeDoCampoDoRamo(0, 'else', 'valor', true);
  tela.editor.definirObrigatoriedadeDoCampoDoRamo(0, 'else', 'valor', false);
  tela.editor.definirVisibilidadeDoCampoDoRamo(0, 'else', 'valor', false);
  const esperado = structuredClone(ramo);
  (esperado.properties.valor['x-ui'] as any).visible = false;
  assert.deepEqual(tela.schema.allOf[0].else, esperado);
});

test('presença e ausência distinguem campo omitido de valores false, null e texto vazio', () => {
  const tela = preparar({ type: ['string', 'null'] });
  tela.editor.definirOperadorDaCondicao(0, 'present');
  assert.deepEqual(tela.schema.allOf[0].if, { required: ['valor'] });
  assert.equal(tela.editor.obterCampoDaCondicao(tela.schema.allOf[0]), 'valor');
  assert.equal(tela.editor.condicaoEhAvancada(tela.schema.allOf[0]), false);
  tela.editor.definirOperadorDaCondicao(0, 'absent');
  assert.deepEqual(tela.schema.allOf[0].if, { not: { required: ['valor'] } });
  assert.equal(tela.editor.obterOperadorDaCondicao(tela.schema.allOf[0]), 'absent');
  tela.editor.definirOperadorDaCondicao(0, 'equals');
  assert.equal(tela.editor.obterOperadorDaCondicao(tela.schema.allOf[0]), 'equals');
  assert.deepEqual(tela.schema.allOf[0].if.required, ['valor']);
});
test('required vazio importado é preservado ao editar comparação', () => {
  const tela = preparar(
    { type: 'string' },
    { properties: { valor: { const: 'A' } }, required: [] },
  );
  tela.editor.definirValorEsperado(0, 'B');
  assert.deepEqual(tela.schema.allOf[0].if.required, []);
});
