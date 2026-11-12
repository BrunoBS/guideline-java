import '@angular/compiler';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { EditorCondicoes } from './edicao-condicoes';
import { SchemaBuilderComponent } from '../../builder/schema-builder.component';
import { avaliarCompatibilidadeDaConstrucao } from '../../builder/compatibilidade-construcao';
import {
  ajustarValorAoSchema,
  validarValor,
  type Schema,
} from '../../../core/schema/schema-engine';

const campos: [string, Schema, unknown, unknown][] = [
  ['string', { minLength: 10, maxLength: 500 }, 'Justificativa válida', 'curto'],
  ['integer', { minimum: 1, maximum: 100 }, 2, 0],
  ['number', { minimum: 0.01, maximum: 10, multipleOf: 0.01 }, 1.25, -1],
  ['boolean', {}, false, 'false'],
  [
    'object',
    {
      properties: { nome: { type: 'string', minLength: 2 } },
      required: ['nome'],
      additionalProperties: false,
    },
    { nome: 'Ana' },
    {},
  ],
  ['array', { items: { type: 'integer' }, minItems: 1, maxItems: 3, uniqueItems: true }, [1], []],
];
function preparar(origem: Schema) {
  let schema: Schema = {
    type: 'object',
    additionalProperties: false,
    properties: { ativo: { type: 'boolean' }, detalhe: origem },
    allOf: [
      { if: { properties: { ativo: { const: true } }, required: ['ativo'] }, then: {}, else: {} },
    ],
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
for (const [tipo, limites, valido, invalido] of campos) {
  test(`${tipo}: ocultação exige origem anulável, sem alterar seus limites`, () => {
    const tela = preparar({ type: tipo, ...limites });
    tela.editor.adicionarCampoExistenteAoRamo(0, 'else', 'detalhe');
    const antes = structuredClone(tela.schema);
    tela.editor.definirVisibilidadeDoCampoDoRamo(0, 'else', 'detalhe', false);
    assert.deepEqual(tela.schema, antes);
    assert.match(tela.editor.mensagemErro, /permita valor nulo/);
  });
  test(`${tipo}: gera schema válido, envia null oculto e valida o valor visível`, () => {
    const origem = { type: [tipo, 'null'], ...limites };
    const tela = preparar(origem);
    tela.editor.adicionarCampoExistenteAoRamo(0, 'then', 'detalhe');
    tela.editor.definirObrigatoriedadeDoCampoDoRamo(0, 'then', 'detalhe', true);
    tela.editor.definirVisibilidadeDoCampoDoRamo(0, 'else', 'detalhe', false);
    const schema = tela.schema;
    assert.deepEqual(schema.properties.detalhe, origem);
    assert.equal(schema.allOf[0].then.properties.detalhe.type, tipo);
    assert.equal(schema.allOf[0].else.properties.detalhe.type, 'null');
    assert.deepEqual(avaliarCompatibilidadeDaConstrucao(schema), []);
    for (const detalhe of [valido, invalido, null, undefined]) {
      const entrada = detalhe === undefined ? { ativo: false } : { ativo: false, detalhe };
      const antes = structuredClone(entrada);
      const payload = ajustarValorAoSchema(schema, entrada, schema);
      assert.deepEqual(payload, { ativo: false, detalhe: null });
      assert.deepEqual(entrada, antes);
      assert.deepEqual(validarValor(schema, payload), []);
    }
    assert.deepEqual(validarValor(schema, { ativo: true, detalhe: valido }), []);
    for (const detalhe of [null, invalido, undefined])
      assert.ok(validarValor(schema, { ativo: true, detalhe }).length);
    assert.ok(validarValor(schema, { ativo: false, detalhe: valido }).length);
    const ativado = ajustarValorAoSchema(schema, { ativo: true, detalhe: null }, schema);
    assert.notEqual(ativado.detalhe, null);
    // Retornar ao ramo oculto não pode manter o valor anterior de qualquer tipo.
    assert.equal(ajustarValorAoSchema(schema, { ...ativado, ativo: false }, schema).detalhe, null);
  });
}
for (const origem of [
  { type: ['string', 'null'], enum: ['A', 'B'] },
  { type: ['boolean', 'null'], const: false },
  { type: ['integer', 'null'], not: { const: null } },
])
  test('origem com null no tipo mas proibido por restrições não pode ser ocultada', () => {
    const tela = preparar(origem);
    tela.editor.adicionarCampoExistenteAoRamo(0, 'else', 'detalhe');
    const antes = structuredClone(tela.schema);
    tela.editor.definirVisibilidadeDoCampoDoRamo(0, 'else', 'detalhe', false);
    assert.deepEqual(tela.schema, antes);
    assert.match(tela.editor.mensagemErro, /permita valor nulo/);
  });
test('enum anulável e comparação incompatível: bloqueia ocultação até remover comparação', () => {
  const tela = preparar({ type: ['string', 'null'], enum: ['EMAIL', 'SMS', null] });
  tela.editor.adicionarCampoExistenteAoRamo(0, 'else', 'detalhe');
  tela.editor.definirRestricaoDoRamo(0, 'else', 'detalhe', {
    const: 'EMAIL',
    'x-ui': { visible: true },
  });
  const antes = structuredClone(tela.schema);
  tela.editor.definirVisibilidadeDoCampoDoRamo(0, 'else', 'detalhe', false);
  assert.deepEqual(tela.schema, antes);
  assert.match(tela.editor.mensagemErro, /comparação/);
  tela.editor.definirRestricaoDoRamo(0, 'else', 'detalhe', { 'x-ui': { visible: true } });
  tela.editor.definirVisibilidadeDoCampoDoRamo(0, 'else', 'detalhe', false);
  assert.deepEqual(validarValor(tela.schema, { ativo: false, detalhe: null }), []);
  const oculto = structuredClone(tela.schema);
  tela.editor.definirRestricaoDoRamo(0, 'else', 'detalhe', { const: 'SMS' });
  assert.deepEqual(tela.schema, oculto);
  tela.editor.definirVisibilidadeDoCampoDoRamo(0, 'else', 'detalhe', true);
  assert.equal(tela.schema.allOf[0].else.properties.detalhe.type, 'string');
});
test('obrigatoriedade global ou do ramo impede ocultação mesmo em campo anulável', () => {
  for (const global of [true, false]) {
    const tela = preparar({ type: ['string', 'null'] });
    tela.editor.adicionarCampoExistenteAoRamo(0, 'else', 'detalhe');
    if (global) tela.schema.required = ['detalhe'];
    else tela.editor.definirObrigatoriedadeDoCampoDoRamo(0, 'else', 'detalhe', true);
    const antes = structuredClone(tela.schema);
    tela.editor.definirVisibilidadeDoCampoDoRamo(0, 'else', 'detalhe', false);
    assert.deepEqual(tela.schema, antes);
  }
});
test('ocultação nula funciona em objetos internos e itens de lista', () => {
  const tela = preparar({ type: ['string', 'null'], minLength: 10 });
  tela.editor.adicionarCampoExistenteAoRamo(0, 'else', 'detalhe');
  tela.editor.definirVisibilidadeDoCampoDoRamo(0, 'else', 'detalhe', false);
  const schema = {
    type: 'object',
    properties: { grupo: tela.schema, lista: { type: 'array', items: tela.schema } },
  };
  const entrada = {
    grupo: { ativo: false, detalhe: 'curto' },
    lista: [{ ativo: false, detalhe: 'curto' }],
  };
  const payload = ajustarValorAoSchema(schema, entrada, schema);
  assert.equal(payload.grupo.detalhe, null);
  assert.equal(payload.lista[0].detalhe, null);
  assert.deepEqual(validarValor(schema, payload), []);
});
test('política de ocultação não bloqueia cadastro nem edição global da Construção', () => {
  const tela = preparar({ type: 'string', minLength: 10 });
  tela.schema.allOf[0].else = { properties: { detalhe: { 'x-ui': { visible: false } } } };
  const builder = new SchemaBuilderComponent();
  builder.schema = tela.schema;
  assert.equal(builder.edicaoBloqueada, false);
  builder.abrirEditorDoCampo('/properties/detalhe');
  assert.equal(builder.editorModalOpen, true);
  builder.definirCampoAnulavel(true);
  builder.salvarEdicao();
  assert.equal(builder.editorModalOpen, false);
  assert.equal(builder.edicaoBloqueada, false);
  assert.deepEqual(builder.schema.properties.detalhe.type, ['string', 'null']);
});
test('importação com ocultação incompatível permanece editável e valida no próprio campo', () => {
  const tela = preparar({ type: 'string', minLength: 10 });
  tela.schema.allOf[0].else = { properties: { detalhe: { 'x-ui': { visible: false } } } };
  const antes = structuredClone(tela.schema);
  assert.deepEqual(avaliarCompatibilidadeDaConstrucao(tela.schema), []);
  assert.match(tela.editor.avisoDoCampoNoRamo('detalhe'), /não aceita null/);
  assert.deepEqual(tela.schema, antes);
  // O motor não deve considerar null válido para um contrato que exige string.
  assert.ok(validarValor(tela.schema, { ativo: false, detalhe: null }).length);
});

test('Permitir nulo sincroniza enum e rótulos preservando os demais valores tipados', () => {
  const builder = new SchemaBuilderComponent();
  builder.schema = {
    type: 'object',
    properties: {
      canal: { type: 'string', enum: ['EMAIL', 'SMS'], 'x-enumLabels': ['Email', 'Mensagem'] },
    },
  };
  builder.abrirEditorDoCampo('/properties/canal');
  builder.definirCampoAnulavel(true);
  assert.deepEqual(builder.schema.properties.canal.enum, ['EMAIL', 'SMS', null]);
  assert.deepEqual(builder.schema.properties.canal['x-enumLabels'], ['Email', 'Mensagem', 'Nulo']);
  builder.definirCampoAnulavel(true);
  assert.deepEqual(builder.schema.properties.canal.enum, ['EMAIL', 'SMS', null]);
  builder.definirCampoAnulavel(false);
  assert.deepEqual(builder.schema.properties.canal.enum, ['EMAIL', 'SMS']);
  assert.deepEqual(builder.schema.properties.canal['x-enumLabels'], ['Email', 'Mensagem']);
});
test('origem com enum exclusivamente null não gera ramo visível impossível', () => {
  const tela = preparar({ type: ['string', 'null'], enum: [null] });
  const antes = structuredClone(tela.schema);
  tela.editor.adicionarCampoExistenteAoRamo(0, 'then', 'detalhe');
  assert.deepEqual(tela.schema, antes);
  assert.match(tela.editor.mensagemErro, /só permite null/);
});
