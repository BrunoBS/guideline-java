import '@angular/compiler';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { EditorExpressaoComponent } from './editor-expressao.component';
import { criarCondicaoNoCaminho, expressaoEhGuiada } from './expressoes-condicao';
import { converterTextoDaCondicao } from './conversao-valor-condicao';
import { valorAtendeSchema, type Schema } from '../../../core/schema/schema-engine';

function folha(campo: Schema) {
  const editor = new EditorExpressaoComponent();
  editor.objeto = { type: 'object', properties: { campo } };
  editor.raiz = editor.objeto;
  editor.schema = { required: ['campo'] };
  editor.caminho = '/campo';
  const emitidos: Schema[] = [];
  editor.alteracao.subscribe((schema) => emitidos.push(schema));
  return { editor, emitidos };
}
for (const [tipo, texto] of [
  ['boolean', '"false"'],
  ['integer', '"12"'],
  ['number', '"1.2"'],
  ['object', '[]'],
  ['array', '{}'],
] as const)
  test(`comparação ${tipo} recusa ${texto} sem gerar const incompatível`, () => {
    const { editor, emitidos } = folha({ type: tipo });
    editor.valor = texto;
    editor.aplicarFolha();
    assert.equal(emitidos.length, 0);
    assert.ok(editor.erro);
  });
for (const [tipo, texto, esperado] of [
  ['boolean', 'false', false],
  ['integer', '12', 12],
  ['number', '1.2', 1.2],
  ['object', '{"a":1}', { a: 1 }],
  ['array', '[1]', [1]],
  ['string', 'null', 'null'],
] as [string, string, unknown][])
  test(`comparação ${tipo} usa o valor convertido`, () => {
    const { editor, emitidos } = folha({ type: tipo });
    editor.valor = texto;
    editor.aplicarFolha();
    assert.equal(editor.erro, '');
    assert.deepEqual(emitidos[0].properties.campo.const, esperado);
    assert.equal(valorAtendeSchema(emitidos[0], { campo: esperado }, editor.raiz), true);
  });
test('tipo nulo exige seleção explícita, sem confundir texto null', () => {
  const campo = { type: ['null', 'string'] };
  assert.equal(converterTextoDaCondicao(campo, 'null', 'string'), 'null');
  assert.equal(converterTextoDaCondicao(campo, 'null', 'null'), null);
});
test('enum misto preserva valores com a mesma representação textual no editor composto', () => {
  const valores = [false, 'false', 12, '12', null, 'null', { a: 1 }, [1]];
  const { editor, emitidos } = folha({ enum: valores });
  for (const valor of valores) {
    editor.definirValor(valor);
    editor.aplicarFolha();
    assert.equal(editor.erro, '');
    assert.deepEqual(emitidos.at(-1)!.properties.campo.const, valor);
  }
});
test('união de tipos usa o tipo escolhido e recusa listas como objetos', () => {
  const { editor, emitidos } = folha({
    type: ['object', 'array', 'null', 'string', 'boolean', 'integer'],
  });
  editor.definirTipo('object');
  editor.valor = '[]';
  editor.aplicarFolha();
  assert.equal(emitidos.length, 0);
  editor.definirTipo('array');
  editor.valor = '[]';
  editor.aplicarFolha();
  assert.deepEqual(emitidos[0].properties.campo.const, []);
  editor.definirTipo('string');
  editor.valor = 'false';
  editor.aplicarFolha();
  assert.equal(emitidos[1].properties.campo.const, 'false');
});
test('caminhos internos rejeitam pais ausentes, nulos e não objetos', () => {
  const expressao = criarCondicaoNoCaminho(['grupo', 'interno', 'ativo'], { const: false });
  assert.equal(expressaoEhGuiada(expressao), true);
  for (const valor of [
    {},
    { grupo: null },
    { grupo: [] },
    { grupo: false },
    { grupo: { interno: null } },
    { grupo: { interno: [] } },
    null,
  ])
    assert.equal(valorAtendeSchema(expressao, valor, {}), false);
  assert.equal(valorAtendeSchema(expressao, { grupo: { interno: { ativo: false } } }, {}), true);
  const presente = criarCondicaoNoCaminho(['grupo', 'ativo'], undefined),
    ausente = criarCondicaoNoCaminho(['grupo', 'ativo'], undefined, true);
  assert.equal(valorAtendeSchema(presente, { grupo: { ativo: null } }, {}), true);
  assert.equal(valorAtendeSchema(ausente, { grupo: null }, {}), true);
  assert.equal(valorAtendeSchema(ausente, { grupo: { ativo: false } }, {}), false);
});
test('trocar operador do grupo altera E/OU, preservando filhos, anotações e nível', () => {
  const a = { required: ['a'] },
    b = { required: ['b'] };
  const editor = new EditorExpressaoComponent();
  editor.schema = { title: 'manter', description: 'descrição', allOf: [a, b] };
  editor.alteracao.subscribe((s) => (editor.schema = s));
  assert.equal(valorAtendeSchema(editor.schema, { a: 1 }, {}), false);
  editor.trocarOperadorDoGrupo('anyOf');
  assert.deepEqual(editor.schema, { title: 'manter', description: 'descrição', anyOf: [a, b] });
  assert.equal(valorAtendeSchema(editor.schema, { a: 1 }, {}), true);
  editor.adicionarSubgrupo('allOf');
  assert.equal(editor.grupo, 'anyOf');
  assert.equal(editor.schema.anyOf.length, 3);
  assert.deepEqual(editor.schema.anyOf[2], { allOf: [a] });
  const avancada = structuredClone(editor.schema);
  editor.trocarOperadorDoGrupo('allOf');
  assert.deepEqual(editor.schema, avancada);
  assert.equal(editor.guiada, false);
});
