import '@angular/compiler';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { SchemaBuilderComponent } from './schema-builder.component';
import type { Schema } from '../../core/schema/schema-engine';

function criarConstrutor(schema: Schema) {
  const construtor = new SchemaBuilderComponent();
  construtor.schema = schema;
  construtor.ngOnChanges({});
  return construtor;
}

test('cancelar edição descarta alterações de validação e nome sem emitir schema', () => {
  const original = { type: 'object', properties: { nome: { type: 'string' } }, required: ['nome'] };
  const construtor = criarConstrutor(original);
  const publicados: Schema[] = [];
  construtor.schemaChange.subscribe((schema) => publicados.push(schema));
  construtor.abrirEditorDoCampo('/properties/nome');
  construtor.validacoes.definirAtributo('title', 'Nome completo');
  construtor.propriedades.aoEditarNomeDaPropriedade('nomeCompleto');
  construtor.propriedades.confirmarNomeDaPropriedade();
  assert.ok(construtor.schema.properties.nomeCompleto);
  construtor.cancelarEdicao();
  assert.deepEqual(construtor.schema, original);
  assert.deepEqual(publicados, []);
});

test('salvar edição confirma nome, obrigatoriedade e regras em uma única emissão', () => {
  const original = { type: 'object', properties: { nome: { type: 'string' } }, required: ['nome'] };
  const construtor = criarConstrutor(original);
  const publicados: Schema[] = [];
  construtor.schemaChange.subscribe((schema) => publicados.push(schema));
  construtor.abrirEditorDoCampo('/properties/nome');
  construtor.validacoes.definirLimiteNumerico('minLength', 3, 0, true);
  construtor.propriedades.aoEditarNomeDaPropriedade('nomeCompleto');
  construtor.salvarEdicao();
  assert.equal(publicados.length, 1);
  assert.equal(publicados[0].properties.nomeCompleto.minLength, 3);
  assert.deepEqual(publicados[0].required, ['nomeCompleto']);
  assert.deepEqual(original.properties, { nome: { type: 'string' } });
});

test('condições convertem valores numéricos e atualizam o cache após uma alteração', () => {
  const construtor = criarConstrutor({
    type: 'object',
    properties: { idade: { type: 'integer' } },
  });
  assert.deepEqual(construtor.condicoes.condicoesVisiveis, []);
  construtor.condicoes.adicionarCondicao();
  construtor.condicoes.definirValorEsperado(0, '18');
  assert.equal(construtor.condicoes.condicoesVisiveis.length, 1);
  assert.equal(construtor.schema.allOf[0].if.properties.idade.const, 18);
  construtor.condicoes.removerCondicao(0);
  assert.deepEqual(construtor.condicoes.condicoesVisiveis, []);
});

test('condições editam o objeto aberto sem alterar regras da raiz', () => {
  const construtor = criarConstrutor({
    type: 'object',
    properties: { endereco: { type: 'object', properties: { pais: { type: 'string' } } } },
  });
  construtor.abrirObjeto('/properties/endereco');
  construtor.condicoes.adicionarCondicao();
  assert.equal(construtor.schema.allOf, undefined);
  assert.deepEqual(construtor.schema.properties.endereco.allOf[0].if.required, ['pais']);
});

test('obrigatoriedade de origem não pode ser alterada ou ocultada pelo ramo', () => {
  const construtor = criarConstrutor({
    type: 'object',
    properties: { tipo: { type: 'string' }, detalhe: { type: 'string' } },
    required: ['detalhe'],
  });
  construtor.condicoes.adicionarCondicao();
  construtor.condicoes.adicionarCampoExistenteAoRamo(0, 'then', 'detalhe');
  assert.deepEqual(construtor.schema.required, ['detalhe']);
  construtor.condicoes.definirObrigatoriedadeDoCampoDoRamo(0, 'then', 'detalhe', true);
  assert.deepEqual(construtor.schema.required, ['detalhe']);
  assert.equal(construtor.schema.allOf[0].then.required, undefined);
  const antes = structuredClone(construtor.schema);
  construtor.condicoes.definirObrigatoriedadeDoCampoDoRamo(0, 'then', 'detalhe', false);
  construtor.condicoes.definirVisibilidadeDoCampoDoRamo(0, 'then', 'detalhe', false);
  assert.deepEqual(construtor.schema, antes);
});

test('editor de alternativas preserva regras not avançadas ao recusar uma edição', () => {
  const regra = {
    title: 'A',
    required: ['nome'],
    not: { properties: { nome: { const: 'bloqueado' } } },
  };
  const construtor = criarConstrutor({
    type: 'object',
    properties: { nome: { type: 'string' } },
    oneOf: [regra, { required: [] }],
  });
  construtor.alternativas.adicionarCampoProibido(0, 0, 'nome');
  assert.deepEqual(construtor.schema.oneOf[0], regra);
  assert.match(construtor.error, /avançada/);
});

test('restrição unificada no ramo preserva o schema original e é descartada ao cancelar o rascunho', () => {
  const original: Schema = {
    type: 'object',
    properties: {
      endereco: {
        type: 'object',
        properties: { tipo: { type: 'string' }, numero: { type: 'integer' } },
        allOf: [
          {
            if: { properties: { tipo: { const: 'X' } } },
            then: { properties: { numero: { minimum: 1 } } },
          },
        ],
      },
    },
  };
  const construtor = criarConstrutor(original);
  construtor.abrirObjeto('/properties/endereco');
  construtor.abrirEditorDoCampo('/properties/endereco');
  construtor.condicoes.definirRestricaoDoRamo(0, 'then', 'numero', { minimum: 2, maximum: 20 });
  assert.deepEqual(construtor.schema.properties.endereco.allOf[0].then.properties.numero, {
    minimum: 2,
    maximum: 20,
  });
  assert.equal(original.properties.endereco.allOf[0].then.properties.numero.minimum, 1);
  construtor.cancelarEdicao();
  assert.deepEqual(construtor.schema, original);
});

test('adicionar campo separa visibilidade e obrigatoriedade sem apagar validações', () => {
  const construtor = criarConstrutor({
    type: 'object',
    properties: { tipo: { type: 'string' }, detalhe: { type: 'string' } },
    allOf: [{ if: { properties: { tipo: { const: 'X' } }, required: ['tipo'] }, then: {} }],
  });
  construtor.condicoes.adicionarCampoExistenteAoRamo(0, 'then', 'detalhe');
  let regra = construtor.schema.allOf[0];
  assert.equal(regra.then.required, undefined);
  assert.equal(construtor.condicoes.campoDoRamoEstaVisivel(regra, 'then', 'detalhe'), true);
  construtor.condicoes.definirRestricaoDoRamo(0, 'then', 'detalhe', {
    'x-ui': { visible: true },
    not: { const: 'proibido' },
  });
  construtor.condicoes.definirObrigatoriedadeDoCampoDoRamo(0, 'then', 'detalhe', true);
  construtor.condicoes.definirVisibilidadeDoCampoDoRamo(0, 'then', 'detalhe', false);
  assert.equal(construtor.schema.allOf[0].then.properties.detalhe['x-ui'].visible, true);
  construtor.condicoes.definirObrigatoriedadeDoCampoDoRamo(0, 'then', 'detalhe', false);
  regra = construtor.schema.allOf[0];
  assert.equal(regra.then.required, undefined);
  assert.equal(regra.then.properties.detalhe['x-ui'].visible, true);
  construtor.condicoes.definirVisibilidadeDoCampoDoRamo(0, 'then', 'detalhe', false);
  assert.deepEqual(construtor.schema.allOf[0].then.properties.detalhe, {
    'x-ui': { visible: false },
    not: { const: 'proibido' },
  });
  construtor.condicoes.adicionarCampoExistenteAoRamo(0, 'then', 'detalhe');
  assert.equal(construtor.schema.allOf[0].then.properties.detalhe['x-ui'].visible, false);
});

test('objeto fechado permite limites de propriedades e alternar propriedades adicionais os preserva', () => {
  const construtor = criarConstrutor({
    type: 'object',
    properties: {
      grupo: {
        type: 'object',
        additionalProperties: false,
        properties: { a: { type: 'string' }, b: { type: 'string' } },
      },
    },
  });
  construtor.abrirEditorDoCampo('/properties/grupo');
  construtor.validacoes.definirLimiteNumerico('maxProperties', 1, 0, true);
  assert.equal(construtor.schema.properties.grupo.maxProperties, 1);
  construtor.validacoes.definirAtributoBooleano('additionalProperties', true);
  construtor.validacoes.definirAtributoBooleano('additionalProperties', false);
  assert.equal(construtor.schema.properties.grupo.maxProperties, 1);
});

test('renomear campo referenciado mantém regras e pode ser cancelado sem alterar a origem', () => {
  const original = {
    type: 'object',
    properties: { canal: { type: 'string' } },
    allOf: [{ if: { properties: { canal: { const: 'EMAIL' } }, required: ['canal'] }, then: {} }],
  };
  const construtor = criarConstrutor(original);
  construtor.abrirEditorDoCampo('/properties/canal');
  construtor.propriedades.aoEditarNomeDaPropriedade('meio');
  construtor.propriedades.confirmarNomeDaPropriedade();
  assert.deepEqual(construtor.schema.allOf[0].if.required, ['meio']);
  assert.equal(construtor.schema.allOf[0].if.properties.meio.const, 'EMAIL');
  assert.equal(construtor.selectedPath, '/properties/meio');
  construtor.cancelarEdicao();
  assert.deepEqual(construtor.schema, original);
});
test('exclusão referenciada e renomeação conflitante não alteram o contrato', () => {
  const schema = {
    type: 'object',
    properties: { canal: { type: 'string' } },
    allOf: [{ properties: { canal: {}, meio: {} } }],
  };
  const construtor = criarConstrutor(schema);
  construtor.abrirEditorDoCampo('/properties/canal');
  construtor.propriedades.removerCampoSelecionado();
  assert.match(construtor.error, /regras/);
  assert.deepEqual(construtor.schema, schema);
  construtor.propriedades.aoEditarNomeDaPropriedade('meio');
  assert.equal(construtor.propriedades.validarNomeDaPropriedadeSelecionada(), false);
  assert.match(construtor.propriedades.propertyNameError, /novo nome/);
});

test('campo interno restringido por regra de outro nível é renomeado junto com a regra', () => {
  const original = {
    type: 'object',
    properties: { grupo: { type: 'object', properties: { nome: { type: 'string' } } } },
    allOf: [{ properties: { grupo: { required: ['nome'] } } }],
  };
  const construtor = criarConstrutor(original);
  construtor.abrirEditorDoCampo('/properties/grupo/properties/nome');
  construtor.propriedades.aoEditarNomeDaPropriedade('titulo');
  assert.equal(construtor.propriedades.validarNomeDaPropriedadeSelecionada(), true);
  construtor.propriedades.confirmarNomeDaPropriedade();
  assert.ok(construtor.schema.properties.grupo.properties.titulo);
  assert.deepEqual(construtor.schema.allOf[0].properties.grupo.required, ['titulo']);
  construtor.cancelarEdicao();
  assert.deepEqual(construtor.schema, original);
});
