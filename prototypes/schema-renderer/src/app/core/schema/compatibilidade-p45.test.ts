import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { lerDocumentoSchema } from './schema-validator';
import { resolverReferencia } from './referencias-schema';
import { resolverSchemaDoCampo } from './resolucao-schema';
import { validarValor } from './validacao-schema';
import { criarValorInicial } from './valores-iniciais';
import { indexarDocumento } from './documento-schema';
import { campoVisivelNaCondicao } from '../../features/campos/objeto/visibilidade-condicional';

test('recursos incorporados respeitam $id relativo, anchor e irmãos de $ref', () => {
  const raiz = {
    $id: 'https://example.test/root',
    $defs: {
      recurso: {
        $id: 'tipos',
        $defs: { codigo: { $anchor: 'codigo', type: 'integer', minimum: 1 } },
      },
    },
    type: 'object',
    properties: { codigo: { $ref: 'tipos#codigo', maximum: 10 } },
  };
  const resultado = resolverReferencia(raiz.properties.codigo, raiz);
  assert.equal(resultado.type, 'integer');
  assert.equal(resultado.minimum, 1);
  assert.equal(resultado.maximum, 10);
  assert.deepEqual(validarValor(raiz, { codigo: 2 }), []);
  assert.notDeepEqual(validarValor(raiz, { codigo: 11 }), []);
});

test('referência ausente gera diagnóstico e importação recusa sem buscar a rede', () => {
  for (const ref of ['#/ausente', '#naoExiste', 'https://example.test/ausente']) {
    const schema = { $ref: ref };
    assert.match(resolverReferencia(schema, schema).__jsonFallback, /Nenhum recurso externo/);
    assert.throws(() => lerDocumentoSchema(JSON.stringify(schema)));
    assert.notDeepEqual(validarValor(schema, {}), []);
  }
});

test('ciclo sem avanço e referência recursiva têm apresentação finita', () => {
  const ciclo = { $ref: '#' };
  assert.match(resolverReferencia(ciclo, ciclo).__jsonFallback, /cíclica/);
  const arvore = {
    $id: 'https://example.test/arvore',
    type: 'object',
    properties: { nome: { type: 'string' }, filho: { $ref: '#' } },
  };
  assert.equal(resolverReferencia(arvore.properties.filho, arvore).type, 'object');
  assert.deepEqual(validarValor(arvore, { nome: 'pai', filho: { nome: 'filho' } }), []);
  assert.notDeepEqual(validarValor(arvore, { filho: { nome: false } }), []);
  assert.doesNotThrow(() => criarValorInicial(arvore, arvore));
});

test('dynamicRef recursivo valida o documento e usa JSON em vez de controles aproximados', () => {
  const arvore = {
    $id: 'https://example.test/dinamica',
    $dynamicAnchor: 'node',
    type: 'object',
    required: ['nome'],
    properties: { nome: { type: 'string' }, filho: { $dynamicRef: '#node' } },
  };
  assert.match(resolverSchemaDoCampo(arvore, {}, arvore).__jsonFallback, /referência dinâmica/);
  assert.deepEqual(validarValor(arvore, { nome: 'pai', filho: { nome: 'filho' } }), []);
  assert.notDeepEqual(validarValor(arvore, { nome: 'pai', filho: {} }), []);
  assert.equal(
    indexarDocumento(arvore).some((e) => e.node.$dynamicAnchor === 'node'),
    true,
  );
});

test('required exige presença, minLength exige texto e null exige autorização própria', () => {
  const schema = { type: 'object', required: ['nome'], properties: { nome: { type: 'string' } } };
  assert.notDeepEqual(validarValor(schema, {}), []);
  assert.deepEqual(validarValor(schema, { nome: '' }), []);
  assert.notDeepEqual(validarValor(schema, { nome: null }), []);
  assert.notDeepEqual(
    validarValor(
      { ...schema, properties: { nome: { type: 'string', minLength: 1 } } },
      { nome: '' },
    ),
    [],
  );
  assert.deepEqual(
    validarValor({ ...schema, properties: { nome: { type: ['string', 'null'] } } }, { nome: null }),
    [],
  );
});

test('anotações não alteram a validação nem o payload e default é aplicado apenas na inicialização', () => {
  const schema = {
    type: 'object',
    properties: {
      senha: { type: 'string', writeOnly: true },
      codigo: { type: 'string', readOnly: true, default: 'A' },
    },
  };
  const dado = { senha: 'segredo', codigo: 'B' };
  assert.deepEqual(validarValor(schema, dado), []);
  assert.deepEqual(dado, { senha: 'segredo', codigo: 'B' });
  assert.deepEqual(criarValorInicial(schema, schema), { codigo: 'A' });
  assert.deepEqual(validarValor({ type: 'string', format: 'email' }, 'invalido').length > 0, true);
});

test('ocultar é apresentação: preserva dados e obrigatoriedade prevalece sobre ocultação', () => {
  const schema = {
    type: 'object',
    properties: { ativo: { type: 'boolean' }, detalhe: { type: 'string' } },
    allOf: [
      {
        if: { properties: { ativo: { const: true } }, required: ['ativo'] },
        then: { properties: { detalhe: { 'x-ui': { visible: true } } } },
        else: { properties: { detalhe: { 'x-ui': { visible: false } } } },
      },
    ],
  };
  const dado = { ativo: false, detalhe: 'preservado' };
  assert.equal(campoVisivelNaCondicao(schema, 'detalhe', dado, schema), false);
  assert.deepEqual(validarValor(schema, dado), []);
  assert.equal(dado.detalhe, 'preservado');
  const obrigatorio = { ...schema, required: ['detalhe'] };
  assert.equal(campoVisivelNaCondicao(obrigatorio, 'detalhe', dado, obrigatorio), true);
});

test('enum vazio e chave __proto__ validam sem reescrever o contrato recebido', () => {
  const vazio = { enum: [] };
  for (const valor of ['', null, 1, false, {}, []])
    assert.notDeepEqual(validarValor(vazio, valor), []);
  assert.deepEqual(vazio, { enum: [] });
  const schema = JSON.parse(
    '{"type":"object","properties":{"__proto__":{"type":"number"}},"additionalProperties":false}',
  );
  const original = JSON.stringify(schema);
  assert.deepEqual(validarValor(schema, JSON.parse('{"__proto__":2}')), []);
  assert.notDeepEqual(validarValor(schema, JSON.parse('{"__proto__":"texto"}')), []);
  assert.equal(JSON.stringify(schema), original);
});

test('multipleOf compara decimais sem erro binário ou overflow do quociente', () => {
  assert.deepEqual(validarValor({ multipleOf: 0.1 }, 0.3), []);
  assert.notDeepEqual(validarValor({ multipleOf: 0.1 }, 0.30000000000000004), []);
  assert.notDeepEqual(validarValor({ multipleOf: 0.123456789 }, 1e308), []);
  assert.deepEqual(validarValor({ multipleOf: 1e-300 }, 1e300), []);
});

test('apresentação JSON de contrato dinâmico mantém default sem alterar o documento', () => {
  const schema = {
    $id: 'https://example.test/default-dinamico',
    $dynamicAnchor: 'node',
    type: 'object',
    properties: { filho: { $dynamicRef: '#node' } },
    default: { filho: {} },
  };
  const inicial = criarValorInicial(schema, schema);
  assert.deepEqual(inicial, { filho: {} });
  inicial.filho.nome = 'novo';
  assert.deepEqual(schema.default, { filho: {} });
});
