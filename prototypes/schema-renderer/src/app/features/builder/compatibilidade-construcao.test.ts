import '@angular/compiler';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { avaliarCompatibilidadeDaConstrucao } from './compatibilidade-construcao';
import { SchemaBuilderComponent } from './schema-builder.component';
import type { Schema } from '../../core/schema/schema-engine';

const base = (): Schema => ({
  type: 'object',
  properties: {
    ativo: { type: 'boolean' },
    nome: { type: 'string' },
    itens: { type: 'array', items: { type: 'integer' } },
  },
});

test('perfil permite os seis tipos, listas homogêneas, enum e campos anuláveis', () => {
  const schema = base();
  Object.assign(schema.properties, {
    decimal: { type: 'number', minimum: 0 },
    grupo: { type: 'object', properties: {} },
    codigo: { type: ['null', 'integer'], enum: [null, 1] },
  });
  assert.deepEqual(avaliarCompatibilidadeDaConstrucao(schema), []);
});
test('condições guiadas e conjuntos de campos permanecem editáveis; alternativas por valor exigem Para Dev', () => {
  const schema = base();
  schema.allOf = [
    {
      if: { properties: { ativo: { const: true } } },
      then: {
        required: ['nome'],
        properties: { nome: { 'x-ui': { visible: true }, not: { const: 'X' } } },
      },
      else: {},
    },
  ];
  for (const opcoes of [
    [
      { required: ['nome'], not: { required: ['itens'] } },
      { required: ['itens'], not: { required: ['nome'] } },
    ],
    [
      { properties: { nome: { const: 'A' } }, required: ['nome'] },
      { properties: { nome: { const: 'B' } }, required: ['nome'] },
    ],
  ]) {
    schema.oneOf = opcoes;
    const antes = structuredClone(schema);
    assert.equal(
      avaliarCompatibilidadeDaConstrucao(schema).length === 0,
      !('properties' in opcoes[0]),
    );
    assert.deepEqual(schema, antes);
  }
});
for (const fragmento of [
  { $ref: '#/$defs/a' },
  { dependentRequired: { nome: ['itens'] } },
  { patternProperties: { '^x': { type: 'string' } } },
  { unevaluatedProperties: false },
  { allOf: [{ required: ['nome'] }] },
  { if: {}, then: { required: ['nome'] } },
  { oneOf: [{ properties: { nome: { const: 'A' } } }, { properties: { nome: { const: 'B' } } }] },
  {
    oneOf: [{ required: ['nome'], not: { required: ['itens', 'ativo'] } }, { required: ['itens'] }],
  },
])
  test(`perfil bloqueia combinação não representável: ${JSON.stringify(fragmento)}`, () => {
    const schema = { ...base(), ...fragmento };
    const antes = structuredClone(schema);
    assert.ok(avaliarCompatibilidadeDaConstrucao(schema).length);
    assert.deepEqual(schema, antes);
  });
for (const campo of [
  true,
  false,
  { type: ['string', 'number'] },
  { type: 'array', prefixItems: [{ type: 'string' }], items: false },
  { type: 'string', format: 'duration' },
  { type: 'boolean', enum: [true] },
])
  test(`perfil informa o caminho do campo avançado: ${JSON.stringify(campo)}`, () => {
    assert.ok(
      avaliarCompatibilidadeDaConstrucao({ type: 'object', properties: { 'a/b': campo } }).some(
        (motivo) => motivo.caminho.startsWith('/properties/a~1b'),
      ),
    );
  });
test('anotações são opacas e não confundidas com subschemas', () => {
  const schema = base();
  schema.examples = [{ dependentSchemas: {}, $ref: 'isto é um dado' }];
  assert.deepEqual(avaliarCompatibilidadeDaConstrucao(schema), []);
});
test('bloqueio impede mutações, emissão e modal, preserva original e desbloqueia novo schema', () => {
  const builder = new SchemaBuilderComponent();
  const original = { ...base(), dependentRequired: { nome: ['itens'] } };
  const antes = structuredClone(original);
  builder.schema = original;
  let emissoes = 0;
  builder.schemaChange.subscribe(() => emissoes++);
  assert.equal(builder.edicaoBloqueada, true);
  builder.abrirEditorDoCampo('/properties/nome');
  builder.aplicarAlteracaoDeRegra((root) => {
    root.title = 'alterado';
  });
  builder.validacoes.definirAtributo('title', 'alterado');
  builder.salvarEdicao();
  assert.equal(builder.editorModalOpen, false);
  assert.equal(emissoes, 0);
  assert.deepEqual(builder.schema, antes);
  assert.deepEqual(original, antes);
  builder.schema = base();
  assert.equal(builder.edicaoBloqueada, false);
  builder.abrirEditorDoCampo('/properties/nome');
  builder.validacoes.definirAtributo('title', 'Nome');
  builder.salvarEdicao();
  assert.equal(emissoes, 1);
});
test('JSON inválido externo bloqueia edição do último schema válido', () => {
  const builder = new SchemaBuilderComponent();
  builder.schema = base();
  builder.bloqueioExterno = 'JSON inválido';
  assert.equal(builder.edicaoBloqueada, true);
  builder.aplicarAlteracaoDeRegra((root) => {
    root.title = 'não salvar';
  });
  assert.equal(builder.schema.title, undefined);
  builder.bloqueioExterno = '';
  assert.equal(builder.edicaoBloqueada, false);
});
test('edição anulável preserva união e mantém controles do tipo principal', () => {
  const builder = new SchemaBuilderComponent();
  builder.schema = base();
  builder.abrirEditorDoCampo('/properties/nome');
  builder.definirCampoAnulavel(true);
  assert.equal(builder.obterSchemaDeEdicao(builder.schema.properties.nome).type, 'string');
  builder.salvarEdicao();
  assert.deepEqual(builder.schema.properties.nome.type, ['string', 'null']);
  assert.equal(builder.edicaoBloqueada, false);
});

for (const comparacao of [{ minimum: 3 }, { const: false }])
  test(`perfil recusa comparação incompatível com o tipo: ${JSON.stringify(comparacao)}`, () => {
    const schema = base();
    schema.allOf = [{ if: { properties: { nome: comparacao } }, then: {} }];
    assert.ok(avaliarCompatibilidadeDaConstrucao(schema).length);
  });
test('obrigatoriedade valida no atributo sem bloquear cadastro; itens avançados mantêm o perfil', () => {
  const schema = base();
  schema.required = ['nome'];
  schema.allOf = [
    {
      if: { properties: { ativo: { const: true } } },
      then: { properties: { nome: { 'x-ui': { visible: false } } } },
    },
  ];
  assert.deepEqual(avaliarCompatibilidadeDaConstrucao(schema), []);
  const builder = new SchemaBuilderComponent();
  builder.schema = schema;
  assert.equal(builder.edicaoBloqueada, false);
  assert.match(
    builder.condicoes.avisoDeOcultacao(schema.allOf[0], 'then', 'nome'),
    /obrigatório na origem/,
  );
  assert.equal(builder.condicoes.campoDoRamoEstaVisivel(schema.allOf[0], 'then', 'nome'), true);
  delete schema.allOf;
  schema.properties.itens.items = { type: 'integer', minimum: 1 };
  assert.ok(
    avaliarCompatibilidadeDaConstrucao(schema).some((motivo) =>
      motivo.caminho.endsWith('/items/minimum'),
    ),
  );
});

for (const expressao of [
  { not: { properties: { ativo: { const: true } } } },
  { allOf: [{ properties: { ativo: { const: true } } }, { anyOf: [{ required: ['nome'] }] }] },
  { anyOf: [{ allOf: [{ required: ['nome'] }] }] },
])
  test(`Construção bloqueia expressão avançada sem alterar o schema: ${JSON.stringify(expressao)}`, () => {
    const schema = base();
    schema.allOf = [{ if: expressao, then: { required: ['nome'] } }];
    const antes = structuredClone(schema);
    assert.ok(
      avaliarCompatibilidadeDaConstrucao(schema).some((motivo) =>
        motivo.mensagem.includes('Grupos aninhados'),
      ),
    );
    const builder = new SchemaBuilderComponent();
    builder.schema = schema;
    assert.equal(builder.edicaoBloqueada, true);
    builder.aplicarAlteracaoDeRegra((root) => {
      root.allOf = [];
    });
    assert.deepEqual(builder.schema, antes);
  });
test('E/OU plano mantém diferente e está ausente disponíveis como comparações simples', () => {
  const schema = base();
  for (const operador of ['allOf', 'anyOf']) {
    schema.allOf = [
      {
        if: {
          [operador]: [
            { properties: { nome: { not: { const: 'X' } } } },
            { not: { required: ['itens'] } },
          ],
        },
        then: {},
      },
    ];
    assert.deepEqual(avaliarCompatibilidadeDaConstrucao(schema), []);
  }
});
