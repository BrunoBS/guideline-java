// Instantiate the controller without rendering; DOM flows require browser tests.
import '@angular/compiler';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { AppComponent } from './app.component';

const requiredName = {
  type: 'object',
  properties: { name: { type: 'string' } },
  required: ['name'],
  additionalProperties: false,
};

test('creating a new builder document resets payload, validation and previews', () => {
  const app = new AppComponent();
  app.value = { old: 'value' };
  app.errors = ['old validation'];
  app.previewOpen = true;
  app.schemaPreviewOpen = true;
  app.schemaCopied = true;
  app.criarNovoSchema();
  assert.deepEqual(app.value, {});
  assert.deepEqual(app.errors, []);
  assert.equal(app.developerSource, '{}');
  assert.equal(app.previewOpen, false);
  assert.equal(app.schemaPreviewOpen, false);
  assert.equal(app.schemaCopied, false);
});

test('opening developer preview reconciles payload and validates the current builder document', () => {
  const app = new AppComponent();
  app.entrarNoConstrutor();
  app.value = { obsolete: 'data' };
  app.aoAlterarSchema(requiredName);
  app.selecionarAbaDoConstrutor('dev');
  assert.deepEqual(app.value, {});
  assert.equal(app.developerSource, '{}');
  assert.ok(app.issues.some((issue) => issue.path === '/name'));
});

test('entering renderer refreshes validation after construction edits', () => {
  const app = new AppComponent();
  app.entrarNoConstrutor();
  app.aoAlterarSchema(requiredName);
  app.entrarNoRenderizador();
  assert.equal(app.area, 'renderer');
  assert.ok(app.issues.some((issue) => issue.path === '/name'));
});

test('navigation preserves an invalid developer draft for correction', () => {
  const app = new AppComponent();
  app.aoEditarJsonDoValor('{broken');
  app.entrarNoRenderizador();
  assert.equal(app.developerSource, '{broken');
  assert.notEqual(app.valueError, '');
});

test('validar schema em Para Dev confirma o contrato sem reiniciar os valores da prévia', () => {
  const app = new AppComponent();
  app.entrarNoConstrutor();
  app.selecionarAbaDoConstrutor('dev');
  app.aoEditarSchemaDoConstrutor(JSON.stringify(requiredName));
  app.aoAlterarValor({ name: 'Ana' });
  const schema = app.schema;
  const valor = app.value;
  const texto = app.builderSource;
  app.validarSchemaDoConstrutor();
  assert.equal(app.builderSchemaError, '');
  assert.equal(app.schemaValidated, true);
  assert.equal(app.schema, schema);
  assert.equal(app.value, valor);
  assert.equal(app.builderSource, texto);
});

test('formatar schema em Para Dev indenta o JSON sem reiniciar o formulário', () => {
  const app = new AppComponent();
  app.entrarNoConstrutor();
  app.selecionarAbaDoConstrutor('dev');
  app.aoEditarSchemaDoConstrutor(JSON.stringify(requiredName));
  app.aoAlterarValor({ name: 'Ana' });
  const schema = app.schema;
  const valor = app.value;
  app.formatarSchemaDoConstrutor();
  assert.equal(app.builderSource, JSON.stringify(requiredName, null, 2));
  assert.equal(app.builderSchemaError, '');
  assert.equal(app.schema, schema);
  assert.equal(app.value, valor);
});

test('ações de Para Dev preservam texto inválido e o último formulário válido', () => {
  for (const acao of ['validarSchemaDoConstrutor', 'formatarSchemaDoConstrutor'] as const) {
    for (const texto of ['{incompleto', '{"type":"tipo-inexistente"}']) {
      const app = new AppComponent();
      app.entrarNoConstrutor();
      app.selecionarAbaDoConstrutor('dev');
      const schema = app.schema;
      const valor = app.value;
      app.aoEditarSchemaDoConstrutor(texto);
      app[acao]();
      assert.equal(app.builderSource, texto);
      assert.notEqual(app.builderSchemaError, '');
      assert.equal(app.schemaValidated, false);
      assert.equal(app.schema, schema);
      assert.equal(app.value, valor);
    }
  }
});

test('catálogo carrega o exemplo de compatibilidade com as condições ajustadas', () => {
  const app = new AppComponent();
  const id = 'environmentTypeCompatibilityConditional';
  assert.ok(app.schemaExamples.some((exemplo) => exemplo.id === id));
  app.carregarExemplo(id);
  assert.equal(app.selectedExample, id);
  assert.equal(app.schema.allOf.length, 4);
  for (const regra of app.schema.allOf) assert.deepEqual(regra.if.required, ['parentTypeCode']);
  assert.deepEqual(app.schema.required, ['parentTypeCode', 'childTypeCode']);
  app.validarDocumentoSchema();
  assert.equal(app.parseError, '');
});

test('Escape fecha as visualizações e preserva o contrato', () => {
  const app = new AppComponent();
  const schema = app.schema;
  app.previewOpen = true;
  app.schemaPreviewOpen = true;
  app.fecharVisualizacoes();
  assert.equal(app.previewOpen, false);
  assert.equal(app.schemaPreviewOpen, false);
  assert.equal(app.schema, schema);
});
