import { allSchemas } from '../../data/schema-examples';
import '@angular/compiler';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { EditorEstruturasComponent } from './editor-estruturas.component';
import { EditorExpressaoComponent } from '../regras/condicoes/editor-expressao.component';
import { SchemaBuilderComponent } from './schema-builder.component';
import { lerDocumentoSchema } from '../../core/schema/schema-validator';
import { planejarRenomeacao } from './renomeacao-documento';
import { validarValor, type Schema } from '../../core/schema/schema-engine';
import { diagnosticarConflitosCondicionais } from '../regras/condicoes/conflitos-condicoes';
function estruturas(schema: Schema) {
  const editor = new EditorEstruturasComponent();
  editor.schema = structuredClone(schema);
  editor.alteracao.subscribe((editar) => {
    const copia = structuredClone(editor.schema);
    editar(copia);
    editor.schema = copia;
  });
  return editor;
}
for (const valor of [
  {
    type: 'string',
    pattern: '^[a-z]*$',
    minLength: 0,
    format: 'email',
    examples: ['a@b.com'],
    'x-externo': { properties: { nao: 'alterar' } },
  },
  {
    type: ['integer', 'null'],
    minimum: 1,
    exclusiveMaximum: 10,
    multipleOf: 2,
    enum: [null, 2, 4],
  },
  {
    type: 'object',
    properties: { livre: true, proibido: false },
    propertyNames: { minLength: 1 },
    patternProperties: { '^x': { type: 'string' } },
    dependentRequired: { livre: ['proibido'] },
    dependentSchemas: { livre: { not: { required: ['proibido'] } } },
    unevaluatedProperties: false,
  },
  {
    type: 'array',
    prefixItems: [true, false, { type: 'integer' }],
    items: false,
    contains: { type: 'integer' },
    minContains: 0,
    maxContains: 2,
    unevaluatedItems: false,
    uniqueItems: true,
  },
  {
    allOf: [{ anyOf: [{ type: 'string' }, { type: 'number' }] }],
    oneOf: [{ const: 'A' }, { const: 'B' }],
    not: { const: 'C' },
  },
  { $ref: '#/$defs/valor' },
] as Schema[]) {
  test(
    'round-trip de importação, edição pontual e exportação preserva ' +
      JSON.stringify(valor).slice(0, 55),
    () => {
      const original: Schema = {
        type: 'object',
        required: ['observacao'],
        properties: { valor, observacao: { type: 'string' } },
        $defs: { valor: { type: 'string' } },
        'x-desconhecido': { required: ['observacao'], const: { properties: { valor: false } } },
      };
      const builder = new SchemaBuilderComponent();
      builder.mode = 'dev';
      builder.schema = lerDocumentoSchema(JSON.stringify(original));
      builder.ngOnChanges({});
      builder.abrirEditorDoCampo('/properties/observacao');
      builder.validacoes.definirAtributo('description', 'editado');
      builder.salvarEdicao();
      const esperado = structuredClone(original);
      esperado.properties.observacao.description = 'editado';
      assert.deepEqual(lerDocumentoSchema(JSON.stringify(builder.schema)), esperado);
    },
  );
}
test('renomeação atravessa recurso com $id e preserva anchors estáveis', () => {
  const schema: Schema = {
    $id: 'https://example.com/form.json',
    type: 'object',
    $defs: {
      pessoa: {
        $id: 'pessoa.json',
        type: 'object',
        properties: { nome: { $anchor: 'nome', type: 'string' } },
        required: ['nome'],
      },
    },
    properties: {
      pessoa: { $ref: 'pessoa.json' },
      apelido: { $ref: 'pessoa.json#nome' },
      copia: { $ref: 'pessoa.json#/properties/nome' },
    },
    allOf: [{ properties: { pessoa: { properties: { nome: { minLength: 2 } } } } }],
  };
  const editar = planejarRenomeacao(schema, '/$defs/pessoa/properties/nome', 'titulo');
  editar(schema);
  assert.ok(schema.$defs.pessoa.properties.titulo);
  assert.deepEqual(schema.$defs.pessoa.required, ['titulo']);
  assert.equal(schema.properties.apelido.$ref, 'pessoa.json#nome');
  assert.equal(schema.properties.copia.$ref, 'pessoa.json#/properties/titulo');
  assert.ok(schema.allOf[0].properties.pessoa.properties.titulo);
  assert.deepEqual(
    validarValor(schema, { pessoa: { titulo: 'AA' }, apelido: 'B', copia: 'C' }),
    [],
  );
});
test('dependências guiadas preservam metadados e schema inválido não substitui o anterior', () => {
  const editor = estruturas({
    type: 'object',
    properties: { a: { type: 'string' }, b: { type: 'integer' } },
    'x-manter': true,
  });
  editor.gatilho = 'a';
  editor.dependente = 'b';
  editor.adicionarDependencia();
  assert.deepEqual(editor.node.dependentRequired, { a: ['b'] });
  editor.definirSchemaDependente('{"required":["b"],"x-regra":"manter"}');
  assert.equal(editor.node.dependentSchemas.a['x-regra'], 'manter');
  const antes = structuredClone(editor.schema);
  editor.definirSchemaDependente('{"type":"invalido"}');
  assert.deepEqual(editor.schema, antes);
  assert.ok(editor.erro);
  assert.equal(editor.node['x-manter'], true);
});
test('edição guiada de padrões, nomes e tuplas é validada antes de emitir', () => {
  const obj = estruturas({ type: 'object', propertyNames: { minLength: 2 }, properties: {} });
  obj.definirNomes('^[a-z]+$');
  assert.equal(obj.node.propertyNames.minLength, 2);
  obj.padrao = '^x';
  obj.tipo = 'integer';
  obj.adicionarPadrao();
  assert.deepEqual(obj.node.patternProperties['^x'], { type: 'integer' });
  obj.definirEntradaJson('patternProperties', '^x', 'false');
  assert.equal(obj.node.patternProperties['^x'], false);
  const lista = estruturas({ type: 'array', 'x-manter': true });
  lista.tipo = 'integer';
  lista.adicionarPosicao();
  lista.definirPosicao(0, '{"type":"integer","minimum":2}');
  lista.definirContains('{"type":"integer","minimum":3}', '1', '2');
  lista.definirItens('proibir');
  assert.deepEqual(validarValor(lista.schema, [3]), []);
  assert.ok(validarValor(lista.schema, [2]).length);
  const antes = structuredClone(lista.schema);
  lista.definirContains('{}', '3', '1');
  assert.deepEqual(lista.schema, antes);
  assert.ok(lista.erro);
});
test('expressão guiada combina E, OU, negação e caminho interno com presença nos pais', () => {
  const editor = new EditorExpressaoComponent();
  editor.objeto = {
    type: 'object',
    properties: { grupo: { type: 'object', properties: { ativo: { type: 'boolean' } } } },
  };
  editor.raiz = editor.objeto;
  editor.schema = { required: ['grupo'] };
  let expressao: Schema = {};
  editor.alteracao.subscribe((schema) => {
    expressao = schema;
    editor.schema = schema;
  });
  editor.caminho = '/grupo/ativo';
  editor.valor = 'false';
  editor.aplicarFolha();
  assert.deepEqual(validarValor(expressao, {}).length > 0, true);
  assert.deepEqual(validarValor(expressao, { grupo: { ativo: false } }), []);
  editor.agrupar('anyOf');
  assert.ok(expressao.anyOf);
  editor.adicionarFilho('anyOf');
  assert.equal(expressao.anyOf.length, 2);
  editor.negar();
  assert.ok(expressao.not);
  assert.ok(validarValor(expressao, { grupo: { ativo: false } }).length);
  editor.negar();
  assert.ok(expressao.anyOf);
});
test('diagnóstico identifica conflito entre origem e ramos simultâneos', () => {
  const objeto = {
    type: 'object',
    properties: { tipo: { type: 'string' }, idade: { type: 'integer', minimum: 10, maximum: 30 } },
    allOf: [
      {
        if: { properties: { tipo: { const: 'A' } } },
        then: { properties: { idade: { const: 5 } } },
      },
      {
        if: { properties: { tipo: { const: 'A' } } },
        then: { properties: { idade: { const: 20 } } },
      },
    ],
  };
  const avisos = diagnosticarConflitosCondicionais(objeto, objeto);
  assert.ok(avisos.some((a) => a.includes('idade')));
  assert.ok(avisos.some((a) => a.includes('simultâneas')));
});

test('condições distintas que podem estar ativas juntas expõem restrições incompatíveis', () => {
  const objeto = {
    type: 'object',
    properties: {
      tipo: { type: 'string' },
      ativo: { type: 'boolean' },
      idade: { type: 'integer' },
    },
    allOf: [
      {
        if: { properties: { tipo: { const: 'A' } }, required: ['tipo'] },
        then: { properties: { idade: { minimum: 10 } } },
      },
      {
        if: { properties: { ativo: { const: true } }, required: ['ativo'] },
        then: { properties: { idade: { maximum: 5 } } },
      },
    ],
  };
  assert.ok(
    diagnosticarConflitosCondicionais(objeto, objeto).some((aviso) =>
      aviso.includes('simultâneas'),
    ),
  );
});
test('exclusão de posição em tupla referenciada não desloca ponteiros silenciosamente', () => {
  const editor = estruturas({
    type: 'array',
    prefixItems: [{ type: 'string' }, { type: 'integer' }],
    $defs: { copia: { $ref: '#/prefixItems/1' } },
  });
  const antes = structuredClone(editor.schema);
  editor.removerPosicao(0);
  assert.deepEqual(editor.schema, antes);
  assert.match(editor.erro, /referência/);
});

for (const [nome, original] of Object.entries(allSchemas))
  test(`catálogo ${nome}: importação → edição → exportação preserva todas as regras`, () => {
    const builder = new SchemaBuilderComponent();
    builder.mode = 'dev';
    builder.schema = lerDocumentoSchema(JSON.stringify(original));
    builder.ngOnChanges({});
    builder.abrirEditorDoFormulario();
    builder.validacoes.definirAtributo('title', 'Título editado');
    builder.salvarEdicao();
    const esperado = JSON.parse(JSON.stringify(original));
    esperado.title = 'Título editado';
    assert.deepEqual(lerDocumentoSchema(JSON.stringify(builder.schema)), esperado);
  });

test('definição reutilizável sem consumidores também atualiza suas composições internas', () => {
  const schema: Schema = {
    $defs: {
      pessoa: {
        type: 'object',
        properties: { nome: { type: 'string' } },
        allOf: [{ required: ['nome'] }],
      },
    },
  };
  planejarRenomeacao(schema, '/$defs/pessoa/properties/nome', 'titulo')(schema);
  assert.deepEqual(schema.$defs.pessoa.allOf[0].required, ['titulo']);
});
test('referências dinâmicas são preservadas por recusa explícita até a cobertura de P4', () => {
  const schema: Schema = {
    type: 'object',
    properties: { nome: { type: 'string' } },
    $defs: { dinamico: { $dynamicRef: '#node' } },
  };
  const antes = structuredClone(schema);
  assert.throws(
    () => planejarRenomeacao(schema, '/properties/nome', 'titulo'),
    /dinâmica preservada/,
  );
  assert.deepEqual(schema, antes);
});
