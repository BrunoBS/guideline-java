import '@angular/compiler';
import { SimpleChange } from '@angular/core';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { EditorEstruturasComponent } from './editor-estruturas.component';
import type { Schema } from '../../core/schema/schema-engine';
function preparar(schema: Schema) {
  const editor = new EditorEstruturasComponent();
  editor.schema = structuredClone(schema);
  editor.alteracao.subscribe((editar) => {
    const copia = structuredClone(editor.schema);
    editar(copia);
    editor.schema = copia;
  });
  return editor;
}
test('rascunho de dependência sobrevive à atualização de outras regras e à falha de validação', () => {
  const editor = preparar({
    type: 'object',
    properties: { a: {}, b: {} },
    dependentSchemas: { a: { required: ['b'] } },
  });
  const chave = 'dependentSchemas:a',
    origem = editor.json(editor.node.dependentSchemas.a);
  editor.textoDoRascunho(chave, origem);
  editor.editarRascunho(chave, '{');
  editor.gatilho = 'b';
  editor.dependente = 'a';
  editor.adicionarDependencia();
  assert.equal(editor.textoDoRascunho(chave, editor.json(editor.node.dependentSchemas.a)), '{');
  const antes = structuredClone(editor.schema);
  editor.definirEntradaJson('dependentSchemas', 'a', '{');
  assert.deepEqual(editor.schema, antes);
  assert.equal(editor.textoDoRascunho(chave, origem), '{');
});
test('rascunhos de padrões e contains preservam textos ao mudar origem enquanto editados', () => {
  const editor = preparar({ type: 'object' });
  for (const chave of ['patternProperties:^x', 'contains', 'minContains', 'propertyNames']) {
    editor.textoDoRascunho(chave, 'inicial');
    editor.editarRascunho(chave, 'editado');
    assert.equal(editor.textoDoRascunho(chave, 'outra origem'), 'editado');
  }
  editor.textoDoRascunho('intacto', 'inicial');
  assert.equal(editor.textoDoRascunho('intacto', 'nova origem'), 'nova origem');
});
test('remoção de posição desloca seu rascunho vizinho e troca de caminho limpa estado', () => {
  const editor = preparar({
    type: ['array', 'null'],
    prefixItems: [{ type: 'string' }, { type: 'integer' }],
  });
  const texto = editor.json(editor.node.prefixItems[1]);
  editor.textoDoRascunho('prefixItems:1', texto);
  editor.editarRascunho('prefixItems:1', '{"type":"integer","minimum":2}');
  editor.removerPosicao(0);
  assert.equal(
    editor.textoDoRascunho('prefixItems:0', editor.json(editor.node.prefixItems[0])),
    '{"type":"integer","minimum":2}',
  );
  editor.ngOnChanges({ caminho: new SimpleChange('', '/properties/grupo', false) });
  assert.equal(editor.textoDoRascunho('prefixItems:0', 'nova origem'), 'nova origem');
});
test('controles reconhecem objetos e listas anuláveis sem alterar a união de tipos', () => {
  for (const tipo of ['object', 'array']) {
    const editor = preparar({ type: [tipo, 'null'], properties: { a: {}, b: {} } });
    assert.equal(editor.ehObjeto, tipo === 'object');
    assert.equal(editor.ehLista, tipo === 'array');
    if (tipo === 'object') {
      editor.gatilho = 'a';
      editor.dependente = 'b';
      editor.adicionarDependencia();
    } else editor.adicionarPosicao();
    assert.deepEqual(editor.node.type, [tipo, 'null']);
  }
});
