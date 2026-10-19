import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { EditorAlternativas } from './edicao-alternativas';
import { Schema, validarValor } from '../../../core/schema/schema-engine';

function preparar(original: Schema, caminho = '') {
  let schema = structuredClone(original);
  const editor = new EditorAlternativas({
    obterSchema: () => schema,
    obterCaminhoAtivo: () => caminho,
    obterPaleta: () => [],
    informarErro: () => {},
    alterarSchema: (editar) => {
      const proximo = structuredClone(schema);
      editar(proximo);
      schema = proximo;
    },
  });
  return {
    editor,
    get schema() {
      return schema;
    },
    navegar(novo: string) {
      caminho = novo;
    },
  };
}

test('todos os comandos de alternativas usam o objeto selecionado e preservam a raiz', () => {
  const raiz: Schema = {
    type: 'object',
    properties: {
      modo: { type: 'string' },
      grupo: {
        type: 'object',
        properties: {
          canal: { type: 'string', enum: ['A', 'B', 'C'] },
          detalhe: { type: 'string' },
          proibido: { type: 'string' },
        },
      },
    },
    oneOf: [{ properties: { modo: { const: 'X' } } }, { properties: { modo: { const: 'Y' } } }],
  };
  const tela = preparar(raiz, '/properties/grupo');
  assert.equal(tela.editor.regrasVisiveis.length, 0);
  tela.editor.abrirSeletorDeModo();
  assert.equal(tela.editor.oneOfModePickerOpen, true);
  tela.editor.adicionarRegra('value');
  assert.equal(tela.editor.regrasVisiveis[0].schema, tela.schema.properties.grupo);
  tela.editor.renomearAlternativa(0, 'Primeira');
  tela.editor.adicionarCampoObrigatorio(0, 0, 'detalhe');
  tela.editor.adicionarCampoProibido(0, 0, 'proibido');
  assert.equal(tela.schema.properties.grupo.oneOf[0].title, 'Primeira');
  assert.deepEqual(tela.schema.properties.grupo.oneOf[0].required, ['canal', 'detalhe']);
  assert.deepEqual(tela.schema.properties.grupo.oneOf[0].not, { required: ['proibido'] });
  tela.editor.removerCampoObrigatorio(0, 'detalhe');
  tela.editor.removerCampoProibido(0, 'proibido');
  tela.editor.adicionarAlternativa();
  assert.equal(tela.schema.properties.grupo.oneOf.length, 3);
  tela.editor.removerAlternativa(2);
  assert.equal(tela.schema.properties.grupo.oneOf.length, 2);
  assert.deepEqual(tela.schema.oneOf, raiz.oneOf);
  tela.editor.removerRegra(0);
  assert.equal(tela.schema.properties.grupo.oneOf, undefined);
  assert.deepEqual(tela.schema.oneOf, raiz.oneOf);
  tela.navegar('');
  assert.equal(tela.editor.regrasVisiveis[0].schema, tela.schema);
  assert.equal(raiz.properties.grupo.oneOf, undefined);
});

test('campos obrigatórios na origem não são proibidos, removidos ou usados como exclusivos iniciais', () => {
  const raiz: Schema = {
    type: 'object',
    properties: { comum: { type: 'string' }, cartao: { type: 'string' }, pix: { type: 'string' } },
    required: ['comum'],
  };
  const tela = preparar(raiz);
  tela.editor.adicionarRegra('fields');
  assert.deepEqual(
    tela.schema.oneOf.map((opcao: Schema) => opcao.required),
    [['cartao'], ['pix']],
  );
  assert.deepEqual(validarValor(tela.schema, { comum: 'a', cartao: '123' }), []);
  assert.deepEqual(validarValor(tela.schema, { comum: 'a', pix: 'chave' }), []);
  assert.ok(validarValor(tela.schema, { comum: 'a', cartao: '123', pix: 'chave' }).length);
  const antes = structuredClone(tela.schema);
  tela.editor.adicionarCampoProibido(0, 0, 'comum');
  assert.match(tela.editor.mensagemErro, /obrigatório/);
  tela.editor.adicionarCampoProibido(0, 0, 'cartao');
  assert.match(tela.editor.mensagemErro, /obrigatório/);
  tela.editor.adicionarCampoObrigatorio(0, 0, 'pix');
  assert.match(tela.editor.mensagemErro, /proibido/);
  tela.editor.removerCampoObrigatorio(0, 'comum');
  assert.deepEqual(tela.schema, antes);
});

for (const [campo, esperados, edicao, valorEditado] of [
  [{ type: 'boolean' }, [false, true], 'false', false],
  [{ type: 'integer', minimum: 10, maximum: 20 }, [10, 11], '15', 15],
  [{ type: 'number', minimum: 0.5, multipleOf: 0.5 }, [0.5, 1], '1.5', 1.5],
  [{ type: 'string', minLength: 3, maxLength: 3 }, ['AAA', 'BBB'], 'XYZ', 'XYZ'],
] as const) {
  test(`criação e edição por valor preservam o tipo ${campo.type} e as regras da origem`, () => {
    const tela = preparar({ type: 'object', properties: { escolha: campo } });
    tela.editor.adicionarRegra('value');
    assert.deepEqual(
      tela.schema.oneOf.map((opcao: Schema) => opcao.properties.escolha.const),
      esperados,
    );
    tela.editor.definirValorDaAlternativa(0, 0, edicao);
    assert.equal(tela.schema.oneOf[0].properties.escolha.const, valorEditado);
    assert.deepEqual(validarValor(tela.schema, { escolha: valorEditado }), []);
    const antes = structuredClone(tela.schema);
    tela.editor.definirValorTipadoDaAlternativa(0, 0, esperados[1]);
    assert.match(tela.editor.mensagemErro, /diferente/);
    assert.deepEqual(tela.schema, antes);
  });
}

test('enum mantém null, booleanos, números e objetos sem duplicatas estruturais', () => {
  for (const [tipo, valores] of [
    ['boolean', [null, true, false]],
    ['number', [1, 2, 3]],
    ['object', [{ a: 1, b: 2 }, { a: 2 }, { b: 2, a: 1 }]],
  ] as const) {
    const tela = preparar({
      type: 'object',
      properties: {
        escolha: { type: tipo === 'boolean' ? ['null', 'boolean'] : tipo, enum: valores },
      },
    });
    tela.editor.adicionarRegra('value');
    assert.deepEqual(tela.schema.oneOf[0].properties.escolha.const, valores[0]);
    if (tipo === 'object') {
      const antes = structuredClone(tela.schema);
      tela.editor.adicionarAlternativa();
      assert.match(tela.editor.mensagemErro, /Não há/);
      assert.deepEqual(tela.schema, antes);
    } else {
      tela.editor.adicionarAlternativa();
      assert.equal(tela.schema.oneOf.length, 3);
      assert.deepEqual(tela.schema.oneOf[2].properties.escolha.const, valores[2]);
    }
  }
});

test('trocar o campo de escolha preserva regras existentes e seleciona valores do novo tipo', () => {
  const raiz: Schema = {
    type: 'object',
    properties: {
      canal: { type: 'string', enum: ['A', 'B'] },
      ativo: { type: 'boolean' },
      outro: { type: 'string' },
    },
    required: ['canal'],
    oneOf: [
      {
        properties: { canal: { const: 'A', description: 'manter' }, outro: { minLength: 2 } },
        required: ['canal', 'outro'],
        not: { required: ['bloqueado'] },
      },
      { properties: { canal: { const: 'B' } }, required: ['canal'] },
    ],
  };
  const tela = preparar(raiz);
  assert.equal(tela.editor.definirCampoDeEscolha(0, 'ativo'), true);
  assert.deepEqual(
    tela.schema.oneOf.map((opcao: Schema) => opcao.properties.ativo.const),
    [false, true],
  );
  assert.deepEqual(tela.schema.oneOf[0].properties.canal, { description: 'manter' });
  assert.deepEqual(tela.schema.oneOf[0].properties.outro, { minLength: 2 });
  assert.deepEqual(tela.schema.oneOf[0].required, ['outro', 'ativo']);
  assert.deepEqual(tela.schema.oneOf[0].not, { required: ['bloqueado'] });
  assert.deepEqual(tela.schema.required, ['canal']);
  assert.deepEqual(raiz.oneOf[0].properties.canal, { const: 'A', description: 'manter' });
});

test('configurações sem candidatos válidos falham sem criar alternativas impossíveis', () => {
  const tela = preparar({
    type: 'object',
    properties: { unico: { type: 'integer', minimum: 10, maximum: 10 } },
  });
  tela.editor.abrirSeletorDeModo();
  tela.editor.adicionarRegra('value');
  assert.equal(tela.schema.oneOf, undefined);
  assert.equal(tela.editor.oneOfModePickerOpen, true);
  assert.match(tela.editor.mensagemErro, /dois valores/);
  tela.editor.adicionarRegra('fields');
  assert.equal(tela.schema.oneOf, undefined);
  assert.match(tela.editor.mensagemErro, /dois campos/);
  const numero = preparar({
    type: 'object',
    properties: { escolha: { type: 'integer', minimum: 1, maximum: 5 } },
  });
  numero.editor.adicionarRegra('value');
  const antes = structuredClone(numero.schema);
  numero.editor.definirValorDaAlternativa(0, 0, '1.5');
  assert.deepEqual(numero.schema, antes);
  numero.editor.definirValorDaAlternativa(0, 0, '20');
  assert.deepEqual(numero.schema, antes);
});
