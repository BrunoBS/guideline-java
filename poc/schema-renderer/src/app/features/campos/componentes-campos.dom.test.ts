import '@angular/compiler';
import { EditorExpressaoComponent } from '../regras/condicoes/editor-expressao.component';
import { EditorValorCondicaoComponent } from '../regras/condicoes/editor-valor-condicao.component';
import { EditorEstruturasComponent } from '../builder/editor-estruturas.component';
import { lerPadraoDeTexto } from '../regras/condicoes/restricoes-texto-condicional';
import { schemaCompatibilidadeTipos } from '../../testes/fixtures/compatibilidade-tipos.schema';
import { AppComponent } from '../../app.component';
import { provideZonelessChangeDetection, ɵresolveComponentResources } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { JSDOM } from 'jsdom';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import type { Schema } from '../../core/schema/schema-engine';
import { validarValor } from '../../core/schema/schema-engine';
import { SchemaBuilderComponent } from '../builder/schema-builder.component';
import { EditorAlternativasComponent } from '../regras/alternativas/editor-alternativas.component';
import { EditorCondicoesComponent } from '../regras/condicoes/editor-condicoes.component';
import { FieldComponent } from '../renderer/field/field.component';
import { CampoBooleanoComponent } from './booleano/campo-booleano.component';
import { EditorBooleanoComponent } from './booleano/editor-booleano.component';
import { CampoListaComponent } from './lista/campo-lista.component';
import { EditorListaComponent } from './lista/editor-lista.component';
import { CampoNumeroComponent } from './numero/campo-numero.component';
import { EditorNumeroComponent } from './numero/editor-numero.component';
import { CampoObjetoComponent } from './objeto/campo-objeto.component';
import { EditorObjetoComponent } from './objeto/editor-objeto.component';
import { CampoTextoComponent } from './texto/campo-texto.component';
import { EditorTextoComponent } from './texto/editor-texto.component';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
for (const chave of [
  'window',
  'document',
  'Node',
  'HTMLElement',
  'Element',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'HTMLInputElement',
  'HTMLSelectElement',
]) {
  Object.defineProperty(globalThis, chave, {
    value: (dom.window as any)[chave],
    configurable: true,
  });
}
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
const componentes = [
  [EditorExpressaoComponent, '../regras/condicoes/editor-expressao.component.html'],
  [EditorValorCondicaoComponent, '../regras/condicoes/editor-valor-condicao.component.html'],
  [EditorEstruturasComponent, '../builder/editor-estruturas.component.html'],
  [AppComponent, '../../app.component.html'],
  [EditorCondicoesComponent, '../regras/condicoes/editor-condicoes.component.html'],
  [EditorAlternativasComponent, '../regras/alternativas/editor-alternativas.component.html'],
  [FieldComponent, '../renderer/field/field.component.html'],
  [SchemaBuilderComponent, '../builder/schema-builder.component.html'],
  [CampoTextoComponent, './texto/campo-texto.component.html'],
  [CampoNumeroComponent, './numero/campo-numero.component.html'],
  [CampoBooleanoComponent, './booleano/campo-booleano.component.html'],
  [CampoObjetoComponent, './objeto/campo-objeto.component.html'],
  [CampoListaComponent, './lista/campo-lista.component.html'],
  [EditorTextoComponent, './texto/editor-texto.component.html'],
  [EditorNumeroComponent, './numero/editor-numero.component.html'],
  [EditorBooleanoComponent, './booleano/editor-booleano.component.html'],
  [EditorObjetoComponent, './objeto/editor-objeto.component.html'],
  [EditorListaComponent, './lista/editor-lista.component.html'],
] as const;

before(async () => {
  await ɵresolveComponentResources(async (url) => {
    // Layout CSS is outside the DOM suite; load the real templates only.
    if (url.endsWith('.css')) return '';
    for (const [, caminho] of componentes) {
      const candidato = url.endsWith('.css') ? caminho.replace(/\.html$/, '.css') : caminho;
      if (candidato.split('/').at(-1) === url.split('/').at(-1))
        return readFileSync(new URL(candidato, import.meta.url), 'utf8');
    }
    throw new Error('Recurso de teste não encontrado: ' + url);
  });
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
});
after(() => {
  TestBed.resetTestEnvironment();
  dom.window.close();
});

async function prepararComponentes() {
  TestBed.resetTestingModule();
  for (const [componente, caminho] of componentes) {
    TestBed.overrideComponent(componente, {
      set: {
        template: readFileSync(new URL(caminho, import.meta.url), 'utf8'),
        templateUrl: undefined,
        styleUrl: undefined,
        styleUrls: [],
        styles: [],
      },
    });
  }
  TestBed.configureTestingModule({
    imports: [FieldComponent, SchemaBuilderComponent],
    providers: [provideZonelessChangeDetection()],
  });
  await TestBed.compileComponents();
}

async function renderizarCampo(schema: Schema, valor: any) {
  await prepararComponentes();
  const tela = TestBed.createComponent(FieldComponent);
  tela.componentRef.setInput('schema', schema);
  tela.componentRef.setInput('root', schema);
  tela.componentRef.setInput('required', true);
  tela.componentRef.setInput('value', valor);
  const emitidos: any[] = [];
  tela.componentInstance.valueChange.subscribe((valor) => {
    emitidos.push(valor);
    tela.componentRef.setInput('value', valor);
  });
  tela.detectChanges();
  await tela.whenStable();
  return { tela, emitidos, elemento: tela.nativeElement as HTMLElement };
}

function editar(controle: HTMLInputElement | HTMLSelectElement, valor: string, evento = 'input') {
  controle.value = valor;
  controle.dispatchEvent(new dom.window.Event(evento, { bubbles: true }));
}

test('renderiza os controles especializados e preserva eventos de texto, inteiro, decimal e booleano', async () => {
  for (const [tipo, inicial, novo] of [
    ['string', 'antes', 'depois'],
    ['integer', 1, '2'],
    ['number', 1, '2.5'],
    ['boolean', false, true],
  ] as const) {
    const { tela, emitidos, elemento } = await renderizarCampo({ type: tipo }, inicial);
    const controle = elemento.querySelector(
      'app-campo-texto input,app-campo-numero input,app-campo-booleano input',
    ) as HTMLInputElement;
    assert.ok(controle);
    if (tipo === 'boolean') {
      controle.checked = true;
      controle.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    } else editar(controle, String(novo), tipo === 'string' ? 'input' : 'change');
    await tela.whenStable();
    assert.equal(emitidos.at(-1), tipo === 'integer' || tipo === 'number' ? Number(novo) : novo);
    tela.destroy();
  }
});

test('objeto com lista de objetos renderiza filhos pelo dispatcher e propaga o payload completo', async () => {
  const schema = {
    type: 'object',
    properties: {
      itens: { type: 'array', items: { type: 'object', properties: { nome: { type: 'string' } } } },
    },
  };
  const { tela, elemento, emitidos } = await renderizarCampo(schema, {
    itens: [{ nome: 'original' }],
  });
  const texto = elemento.querySelector(
    'app-campo-lista app-campo-objeto app-campo-texto input',
  ) as HTMLInputElement;
  assert.ok(texto, elemento.innerHTML);
  editar(texto, 'alterado');
  await tela.whenStable();
  assert.deepEqual(emitidos.at(-1), { itens: [{ nome: 'alterado' }] });
  tela.destroy();
});

test('controle numérico inteiro recusa valor fracionário e modo somente leitura chega ao input', async () => {
  const { tela, elemento, emitidos } = await renderizarCampo(
    { type: 'integer', readOnly: true },
    3,
  );
  const controle = elemento.querySelector('app-campo-numero input') as HTMLInputElement;
  assert.equal(controle.disabled, true);
  editar(controle, '2.5', 'change');
  await tela.whenStable();
  assert.equal(emitidos.length, 0);
  assert.equal(controle.value, '3');
  tela.destroy();
});

test('editor de texto altera apenas o rascunho e cancelar restaura o contrato', async () => {
  await prepararComponentes();
  const tela = TestBed.createComponent(SchemaBuilderComponent);
  const schema = { type: 'object', properties: { nome: { type: 'string' } } };
  tela.componentRef.setInput('schema', schema);
  tela.detectChanges();
  tela.componentInstance.abrirEditorDoCampo('/properties/nome');
  tela.changeDetectorRef.markForCheck();
  tela.componentInstance.editorTab = 'validation';
  tela.detectChanges();
  await tela.whenStable();
  const formato = tela.nativeElement.querySelector('app-editor-texto select') as HTMLSelectElement;
  assert.ok(formato);
  editar(formato, 'email', 'change');
  await tela.whenStable();
  assert.equal(tela.componentInstance.schema.properties.nome.format, 'email');
  assert.equal((schema.properties.nome as Schema).format, undefined);
  tela.componentInstance.cancelarEdicao();
  tela.changeDetectorRef.markForCheck();
  tela.detectChanges();
  assert.deepEqual(tela.componentInstance.schema, schema);
  tela.destroy();
});

test('editor de lista configura itens e opções no rascunho e salvar emite uma vez', async () => {
  await prepararComponentes();
  const tela = TestBed.createComponent(SchemaBuilderComponent);
  const schema = {
    type: 'object',
    properties: { valores: { type: 'array', items: { type: 'string' } } },
  };
  tela.componentRef.setInput('schema', schema);
  tela.detectChanges();
  const emitidos: Schema[] = [];
  tela.componentInstance.schemaChange.subscribe((schema) => emitidos.push(schema));
  tela.componentInstance.abrirEditorDoCampo('/properties/valores');
  tela.changeDetectorRef.markForCheck();
  tela.componentInstance.editorTab = 'validation';
  tela.detectChanges();
  await tela.whenStable();
  const seletores = tela.nativeElement.querySelectorAll(
    'app-editor-lista select',
  ) as NodeListOf<HTMLSelectElement>;
  editar(seletores[0], 'integer', 'change');
  await tela.whenStable();
  editar(seletores[1], 'checkboxes', 'change');
  await tela.whenStable();
  const adicionar = Array.from(
    tela.nativeElement.querySelectorAll('app-editor-lista button') as NodeListOf<HTMLButtonElement>,
  ).find((botao) => botao.textContent?.includes('Adicionar opção'));
  assert.ok(adicionar);
  adicionar.click();
  await tela.whenStable();
  assert.deepEqual(tela.componentInstance.schema.properties.valores.items.enum, [0]);
  assert.deepEqual(emitidos, []);
  tela.componentInstance.salvarEdicao();
  tela.changeDetectorRef.markForCheck();
  tela.detectChanges();
  assert.equal(emitidos.length, 1);
  assert.deepEqual(emitidos[0].properties.valores.items.enum, [0]);
  assert.equal(schema.properties.valores.items.type, 'string');
  tela.destroy();
});

test('alternativas estruturais preservam campos comuns e alternam os campos exclusivos', async () => {
  const schema = {
    type: 'object',
    properties: {
      comum: { type: 'string' },
      primeiro: { type: 'string' },
      segundo: { type: 'string' },
    },
    oneOf: [
      { title: 'Primeira', required: ['primeiro'], not: { required: ['segundo'] } },
      { title: 'Segunda', required: ['segundo'], not: { required: ['primeiro'] } },
    ],
  };
  const { tela, elemento, emitidos } = await renderizarCampo(schema, {
    comum: 'mantido',
    primeiro: 'a',
  });
  const seletor = elemento.querySelector('.schema-meta-row select') as HTMLSelectElement;
  assert.ok(seletor);
  editar(seletor, seletor.options[1].value, 'change');
  await tela.whenStable();
  assert.deepEqual(emitidos.at(-1), { comum: 'mantido' });
  assert.match(elemento.textContent || '', /segundo/);
  assert.doesNotMatch(elemento.querySelector('app-campo-objeto')?.textContent || '', /primeiro/);
  tela.destroy();
});

test('propriedades dinâmicas usam o mesmo dispatcher e preservam o caminho do erro', async () => {
  const schema = { type: 'object', properties: {}, additionalProperties: { type: 'string' } };
  const { tela, elemento, emitidos } = await renderizarCampo(schema, { extra: 'antes' });
  tela.componentRef.setInput('issues', [{ path: '/extra', message: 'Valor inválido' }]);
  await tela.whenStable();
  const texto = elemento.querySelector('.map-value app-campo-texto input') as HTMLInputElement;
  assert.ok(texto);
  assert.match(elemento.textContent || '', /Valor inválido/);
  editar(texto, 'depois');
  await tela.whenStable();
  assert.deepEqual(emitidos.at(-1), { extra: 'depois' });
  tela.destroy();
});

test('lista anulável sai do estado nulo e cria itens pelo renderizador especializado', async () => {
  const schema = { type: ['array', 'null'], items: { type: 'integer' } };
  const { tela, elemento, emitidos } = await renderizarCampo(schema, null);
  const controle = elemento.querySelector(
    'app-campo-lista .value-state-selector select',
  ) as HTMLInputElement;
  assert.ok(controle);
  editar(controle, 'preenchido', 'change');
  await tela.whenStable();
  assert.deepEqual(emitidos.at(-1), []);
  const adicionar = Array.from(elemento.querySelectorAll('app-campo-lista button')).find((botao) =>
    botao.textContent?.includes('Adicionar item'),
  ) as HTMLButtonElement;
  assert.ok(adicionar);
  adicionar.click();
  await tela.whenStable();
  assert.deepEqual(emitidos.at(-1), [0]);
  assert.ok(elemento.querySelector('app-campo-numero input'));
  tela.destroy();
});

async function abrirEtapaDeRegras(schema: Schema) {
  await prepararComponentes();
  const tela = TestBed.createComponent(SchemaBuilderComponent);
  tela.componentRef.setInput('schema', schema);
  tela.componentInstance.builderStep = 'rules';
  tela.detectChanges();
  await tela.whenStable();
  return tela;
}

test('componente de condição configura SE e ENTÃO por eventos e preserva o schema original', async () => {
  const original = {
    type: 'object',
    properties: { tipo: { type: 'string' }, detalhe: { type: 'string' } },
    required: ['tipo'],
  };
  const tela = await abrirEtapaDeRegras(original);
  const elemento = tela.nativeElement as HTMLElement;
  (
    elemento.querySelector('app-editor-condicoes .builder-actions button') as HTMLButtonElement
  ).click();
  await tela.whenStable();
  const esperado = elemento.querySelector(
    'app-editor-condicoes .condition-grid input',
  ) as HTMLInputElement;
  editar(esperado, 'especial');
  await tela.whenStable();
  const entao = elemento.querySelector(
    'app-editor-condicoes .condition-branch.true > label:last-of-type select',
  ) as HTMLSelectElement;
  editar(entao, 'detalhe', 'change');
  await tela.whenStable();
  const controlesDoRamo = elemento.querySelectorAll(
    '.condition-branch.true .condition-required input',
  ) as NodeListOf<HTMLInputElement>;
  assert.equal(controlesDoRamo[0].checked, true);
  assert.equal(controlesDoRamo[1].checked, false);
  controlesDoRamo[1].click();
  await tela.whenStable();

  const schema = tela.componentInstance.schema;
  assert.equal(schema.allOf[0].if.properties.tipo.const, 'especial');
  assert.deepEqual(schema.allOf[0].then.required, ['detalhe']);
  assert.notDeepEqual(validarValor(schema, { tipo: 'especial' }), []);
  assert.deepEqual(validarValor(schema, { tipo: 'comum' }), []);
  assert.equal((original as Schema).allOf, undefined);
  (
    elemento.querySelector('app-editor-condicoes .condition-title button') as HTMLButtonElement
  ).click();
  await tela.whenStable();
  assert.equal(tela.componentInstance.schema.allOf, undefined);
  tela.destroy();
});

test('componente de alternativas cria oneOf por valor e mantém alterações e exclusão no builder', async () => {
  const original = {
    type: 'object',
    properties: { canal: { type: 'string', enum: ['EMAIL', 'SMS'] }, destino: { type: 'string' } },
  };
  const tela = await abrirEtapaDeRegras(original);
  const elemento = tela.nativeElement as HTMLElement;
  (
    elemento.querySelector('app-editor-alternativas .builder-actions button') as HTMLButtonElement
  ).click();
  await tela.whenStable();
  const modos = elemento.querySelectorAll('app-editor-alternativas .oneof-mode-choice');
  assert.equal(modos.length, 2);
  (modos[1] as HTMLButtonElement).click();
  await tela.whenStable();
  const titulo = elemento.querySelector(
    'app-editor-alternativas .oneof-alternative input',
  ) as HTMLInputElement;
  editar(titulo, 'Contato por email', 'change');
  await tela.whenStable();
  assert.equal(tela.componentInstance.schema.oneOf[0].title, 'Contato por email');
  assert.deepEqual(
    tela.componentInstance.schema.oneOf.map((regra: Schema) => regra.properties.canal.const),
    ['EMAIL', 'SMS'],
  );
  assert.deepEqual(validarValor(tela.componentInstance.schema, { canal: 'EMAIL' }), []);
  assert.notDeepEqual(validarValor(tela.componentInstance.schema, {}), []);
  assert.equal((original as Schema).oneOf, undefined);
  const excluir = elemento.querySelector(
    'app-editor-alternativas .condition-card .condition-title button',
  ) as HTMLButtonElement;
  excluir.click();
  await tela.whenStable();
  assert.equal(tela.componentInstance.schema.oneOf, undefined);
  tela.destroy();
});

test('Para Dev oferece validar e formatar sem importação duplicada na Construção', async () => {
  await prepararComponentes();
  const tela = TestBed.createComponent(AppComponent);
  tela.componentInstance.entrarNoConstrutor();
  tela.componentInstance.selecionarAbaDoConstrutor('dev');
  tela.detectChanges();
  await tela.whenStable();
  const elemento = tela.nativeElement as HTMLElement;
  const buscarBotao = (texto: string) =>
    Array.from(elemento.querySelectorAll('button')).find(
      (botao) => botao.textContent?.trim() === texto,
    ) as HTMLButtonElement;
  const editor = elemento.querySelector('#builder-schema-source') as HTMLTextAreaElement;
  assert.ok(editor);
  assert.ok(buscarBotao('Validar JSON'));
  assert.ok(buscarBotao('Formatar JSON'));
  const schema = { type: 'object', properties: { nome: { type: 'string' } } };
  editor.value = JSON.stringify(schema);
  editor.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await tela.whenStable();
  tela.componentInstance.aoAlterarValor({ nome: 'Ana' });
  tela.changeDetectorRef.markForCheck();
  tela.detectChanges();
  buscarBotao('Formatar JSON').click();
  await tela.whenStable();
  assert.equal(editor.value, JSON.stringify(schema, null, 2));
  assert.deepEqual(tela.componentInstance.value, { nome: 'Ana' });
  buscarBotao('Validar JSON').click();
  await tela.whenStable();
  assert.equal(tela.componentInstance.builderSchemaError, '');
  assert.deepEqual(tela.componentInstance.value, { nome: 'Ana' });
  assert.equal(elemento.querySelector('app-field'), null);
  const visualizar = Array.from(elemento.querySelectorAll('button')).find((botao) =>
    botao.textContent?.includes('Visualizar formulário'),
  ) as HTMLButtonElement;
  assert.ok(visualizar);
  visualizar.click();
  await tela.whenStable();
  const modal = elemento.querySelector('[role="dialog"][aria-label="Preview do formulário"]');
  assert.ok(modal);
  assert.equal(elemento.querySelectorAll('app-field').length, 2);
  const nome = modal.querySelector('app-campo-texto input') as HTMLInputElement;
  assert.equal(nome.value, 'Ana');
  (modal.querySelector('[aria-label="Fechar preview"]') as HTMLButtonElement).click();
  await tela.whenStable();
  assert.equal(elemento.querySelector('app-field'), null);
  assert.ok(elemento.querySelector('#builder-schema-source'));
  const ultimoSchema = tela.componentInstance.schema;
  editor.value = '{"type":"invalido"}';
  editor.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await tela.whenStable();
  buscarBotao('Validar JSON').click();
  await tela.whenStable();
  assert.notEqual(tela.componentInstance.builderSchemaError, '');
  assert.equal(tela.componentInstance.schema, ultimoSchema);
  buscarBotao('Formatar JSON').click();
  await tela.whenStable();
  assert.equal(editor.value, '{"type":"invalido"}');
  buscarBotao('Construção').click();
  await tela.whenStable();
  assert.equal(elemento.querySelector('#builder-import'), null);
  assert.equal(buscarBotao('Importar JSON Schema'), undefined);
  tela.destroy();
});

test('schema de compatibilidade apresenta as quatro condições e exibe not const no ramo ENTÃO', async () => {
  const original = structuredClone(schemaCompatibilidadeTipos);
  const tela = await abrirEtapaDeRegras(original);
  const elemento = tela.nativeElement as HTMLElement;
  const cartoes = elemento.querySelectorAll('app-editor-condicoes .condition-card');
  assert.equal(cartoes.length, 4);
  const tipos = original.properties.parentTypeCode.enum as string[];
  tipos.forEach((tipo, indice) => {
    const cartao = cartoes[indice];
    assert.equal(
      (cartao.querySelector('.condition-grid select') as HTMLSelectElement).value,
      'parentTypeCode',
    );
    assert.equal(
      (
        cartao.querySelectorAll('.condition-grid select')[2] as HTMLSelectElement
      ).selectedOptions[0].textContent?.trim(),
      tipo,
    );
    assert.ok(
      cartao
        .querySelector('.condition-branch.true .condition-field-constraints')
        ?.textContent?.includes(`Não pode ser igual a "${tipo}".`),
    );
  });
  assert.deepEqual(tela.componentInstance.schema.allOf, original.allOf);
  tela.componentInstance.abrirEditorDoCampo('/properties/campo');
  tela.componentInstance.validacoes.definirAtributo('title', 'Campo alterado');
  tela.componentInstance.salvarEdicao();
  assert.deepEqual(JSON.parse(JSON.stringify(tela.componentInstance.schema)).allOf, original.allOf);
  assert.deepEqual(original, schemaCompatibilidadeTipos);
  tela.destroy();
});

test('enum desabilita o tipo do pai no campo filho e recalcula ao mudar a condição sem apagar valores', async () => {
  const { tela, elemento, emitidos } = await renderizarCampo(schemaCompatibilidadeTipos, {
    parentTypeCode: 'DEFAULT',
    childTypeCode: 'CUSTOM',
  });
  const seletores = elemento.querySelectorAll('.control > select') as NodeListOf<HTMLSelectElement>;
  assert.equal(seletores.length, 2);
  const [pai, filho] = Array.from(seletores);
  const opcao = (seletor: HTMLSelectElement, tipo: string) =>
    Array.from(seletor.options).find((item) => item.textContent?.trim() === tipo)!;
  for (const tipo of schemaCompatibilidadeTipos.properties.childTypeCode.enum)
    assert.equal(opcao(filho, tipo).disabled, tipo === 'DEFAULT');
  editar(pai, opcao(pai, 'CUSTOM').value, 'change');
  await tela.whenStable();
  assert.deepEqual(emitidos.at(-1), { parentTypeCode: 'CUSTOM', childTypeCode: 'CUSTOM' });
  assert.equal(opcao(filho, 'CUSTOM').disabled, true);
  assert.equal(opcao(filho, 'DEFAULT').disabled, false);
  assert.notDeepEqual(validarValor(schemaCompatibilidadeTipos, emitidos.at(-1)), []);
  editar(filho, opcao(filho, 'CELL').value, 'change');
  await tela.whenStable();
  assert.deepEqual(validarValor(schemaCompatibilidadeTipos, emitidos.at(-1)), []);
  tela.destroy();
});

test('interface cria e altera comparações nos ramos ENTÃO e SENÃO com valores de enum', async () => {
  const original = structuredClone(schemaCompatibilidadeTipos);
  const tela = await abrirEtapaDeRegras(original);
  const elemento = tela.nativeElement as HTMLElement;
  const cartao = elemento.querySelector('.condition-card')!;
  const entao = cartao.querySelector('.condition-branch.true .condition-comparison')!;
  const seletores = entao.querySelectorAll('select');
  assert.equal(seletores[0].value, 'different');
  assert.equal(seletores[1].value, 'DEFAULT');
  editar(seletores[1], 'CELL', 'change');
  (entao.querySelector('button') as HTMLButtonElement).click();
  await tela.whenStable();
  assert.deepEqual(tela.componentInstance.schema.allOf[0].then.properties.childTypeCode, {
    not: { const: 'CELL' },
  });
  const senao = cartao.querySelector('.condition-branch.false')!;
  editar(senao.querySelector('label select') as HTMLSelectElement, 'childTypeCode', 'change');
  await tela.whenStable();
  const comparacao = senao.querySelector('.condition-comparison')!;
  const controles = comparacao.querySelectorAll('select');
  editar(controles[0], 'equals', 'change');
  await tela.whenStable();
  editar(comparacao.querySelectorAll('select')[1], 'CUSTOM', 'change');
  (comparacao.querySelector('button') as HTMLButtonElement).click();
  await tela.whenStable();
  assert.deepEqual(tela.componentInstance.schema.allOf[0].else.properties.childTypeCode, {
    'x-ui': { visible: true },
    const: 'CUSTOM',
  });
  assert.deepEqual(tela.componentInstance.schema.required, original.required);
  assert.equal(tela.componentInstance.schema.allOf[0].else.required, undefined);
  assert.deepEqual(original, schemaCompatibilidadeTipos);
  tela.destroy();
});

test('interface configura contém e começa com preservando o tamanho mínimo da origem', async () => {
  const original = {
    type: 'object',
    properties: { categoria: { type: 'string' }, descricao: { type: 'string', minLength: 5 } },
    allOf: [
      {
        if: { properties: { categoria: { const: 'OUTRO' } }, required: ['categoria'] },
        then: { properties: { descricao: {} } },
        else: { properties: { descricao: {} } },
      },
    ],
  };
  const tela = await abrirEtapaDeRegras(original);
  const elemento = tela.nativeElement as HTMLElement;
  for (const [ramo, operador, trecho] of [
    ['true', 'contains', 'a.b'],
    ['false', 'starts', 'ABC'],
  ]) {
    const editor = elemento.querySelector(`.condition-branch.${ramo} .condition-unified`)!;
    editar(editor.querySelector('select') as HTMLSelectElement, operador, 'change');
    await tela.whenStable();
    const entradas = editor.querySelectorAll('input');
    editar(entradas[0], trecho);
    (editor.querySelector('button') as HTMLButtonElement).click();
    await tela.whenStable();
  }
  const schema = tela.componentInstance.schema;
  assert.deepEqual(schema.allOf[0].then.properties.descricao, { pattern: 'a\\.b' });
  assert.deepEqual(schema.allOf[0].else.properties.descricao, { pattern: '^ABC' });
  assert.deepEqual(validarValor(schema, { categoria: 'OUTRO', descricao: 'xa.by' }), []);
  assert.ok(validarValor(schema, { categoria: 'OUTRO', descricao: 'xazby' }).length);
  assert.ok(validarValor(schema, { categoria: 'OUTRO', descricao: 'a.b' }).length);
  assert.deepEqual(validarValor(schema, { categoria: 'COMUM', descricao: 'ABCde' }), []);
  assert.ok(validarValor(schema, { categoria: 'COMUM', descricao: 'xABCde' }).length);
  assert.deepEqual(original.allOf[0].then.properties.descricao, {});
  tela.destroy();
});

test('campo condicional aparece e é obrigatório apenas quando o atributo controlador é igual a X', async () => {
  const schema = {
    type: 'object',
    properties: { tipo: { type: 'string' }, detalhe: { type: 'string' } },
    allOf: [
      {
        if: { properties: { tipo: { const: 'X' } }, required: ['tipo'] },
        then: { required: ['detalhe'] },
      },
    ],
  };
  const { tela, elemento } = await renderizarCampo(schema, { tipo: '' });
  assert.equal(elemento.querySelectorAll('app-campo-texto').length, 1);
  const tipo = elemento.querySelector('app-campo-texto input') as HTMLInputElement;
  editar(tipo, 'X');
  await tela.whenStable();
  assert.equal(elemento.querySelectorAll('app-campo-texto').length, 2);
  assert.ok(validarValor(schema, { tipo: 'X' }).some((erro) => erro.includes('detalhe')));
  const detalhe = elemento.querySelectorAll('app-campo-texto input')[1] as HTMLInputElement;
  editar(detalhe, 'Informação preenchida');
  await tela.whenStable();
  assert.deepEqual(validarValor(schema, { tipo: 'X', detalhe: 'Informação preenchida' }), []);
  editar(tipo, 'Y');
  await tela.whenStable();
  assert.equal(elemento.querySelectorAll('app-campo-texto').length, 1);
  assert.equal(tela.componentInstance.value.detalhe, 'Informação preenchida');
  assert.deepEqual(validarValor(schema, { tipo: 'Y' }), []);
  editar(tipo, 'X');
  await tela.whenStable();
  assert.equal(
    (elemento.querySelectorAll('app-campo-texto input')[1] as HTMLInputElement).value,
    'Informação preenchida',
  );
  tela.destroy();
});

test('trecho de texto fica desativado sem comparação e acompanha a troca de todas as opções', async () => {
  const schema = {
    type: 'object',
    properties: { tipo: { type: 'string' }, texto: { type: 'string' } },
    allOf: [
      {
        if: { properties: { tipo: { const: 'X' } }, required: ['tipo'] },
        then: { properties: { texto: {} } },
        else: { properties: { texto: { pattern: 'fim(?![\\s\\S])' } } },
      },
    ],
  };
  const tela = await abrirEtapaDeRegras(schema);
  const elemento = tela.nativeElement as HTMLElement;
  const editor = elemento.querySelector('.condition-branch.true .condition-unified')!;
  const seletor = editor.querySelector('select') as HTMLSelectElement;
  const trecho = editor.querySelector('input') as HTMLInputElement;
  assert.equal(seletor.value, 'none');
  assert.equal(trecho.disabled, true);
  for (const operador of ['contains', 'starts', 'ends', 'notContains', 'notStarts', 'notEnds']) {
    editar(seletor, operador, 'change');
    await tela.whenStable();
    assert.equal(trecho.disabled, false);
    editar(trecho, 'teste');
    (editor.querySelector('button') as HTMLButtonElement).click();
    await tela.whenStable();
    const padrao = tela.componentInstance.schema.allOf[0].then.properties.texto.pattern;
    assert.equal(lerPadraoDeTexto(padrao).operador, operador);
  }
  editar(seletor, 'none', 'change');
  await tela.whenStable();
  assert.equal(trecho.disabled, true);
  (editor.querySelector('button') as HTMLButtonElement).click();
  await tela.whenStable();
  assert.equal(tela.componentInstance.schema.allOf[0].then.properties.texto.pattern, undefined);
  const senao = elemento.querySelector('.condition-branch.false .condition-unified')!;
  assert.equal((senao.querySelector('select') as HTMLSelectElement).value, 'ends');
  assert.equal((senao.querySelector('input') as HTMLInputElement).disabled, false);
  tela.destroy();
});

test('SE booleano usa liga/desliga e mantém valores booleanos com igual e diferente', async () => {
  const original = {
    type: 'object',
    properties: { ativo: { type: ['null', 'boolean'] }, nome: { type: 'string' } },
    allOf: [
      {
        if: { properties: { ativo: { const: false } }, required: ['ativo'] },
        then: { required: ['nome'] },
      },
    ],
  };
  const tela = await abrirEtapaDeRegras(original);
  const elemento = tela.nativeElement as HTMLElement;
  const grade = elemento.querySelector('.condition-grid')!;
  let controle = grade.querySelector('input[role="switch"]') as HTMLInputElement;
  assert.equal(controle.checked, false);
  assert.ok(grade.textContent?.includes('Não (desligado)'));
  controle.click();
  await tela.whenStable();
  assert.equal(tela.componentInstance.schema.allOf[0].if.properties.ativo.const, true);
  assert.ok(grade.textContent?.includes('Sim (ligado)'));
  const seletores = grade.querySelectorAll('select');
  editar(seletores[1], 'different', 'change');
  await tela.whenStable();
  controle = grade.querySelector('input[role="switch"]') as HTMLInputElement;
  controle.click();
  await tela.whenStable();
  assert.deepEqual(tela.componentInstance.schema.allOf[0].if.properties.ativo, {
    not: { const: false },
  });
  assert.deepEqual(tela.componentInstance.schema.allOf[0].then, original.allOf[0].then);
  editar(seletores[0], 'nome', 'change');
  await tela.whenStable();
  assert.equal(grade.querySelector('input[role="switch"]'), null);
  assert.equal((grade.querySelector('input') as HTMLInputElement).type, 'text');
  editar(seletores[0], 'ativo', 'change');
  await tela.whenStable();
  assert.equal((grade.querySelector('input[role="switch"]') as HTMLInputElement).checked, false);
  assert.equal(original.allOf[0].if.properties.ativo.const, false);
  tela.destroy();
});

test('editor único preserva a origem e adapta comparação e controles aos seis tipos de campo', async () => {
  const tipos = ['string', 'integer', 'number', 'boolean', 'object', 'array'];
  const schema: Schema = {
    type: 'object',
    properties: Object.fromEntries(tipos.map((tipo) => [tipo, { type: tipo }])),
    allOf: [{ if: {}, then: { properties: Object.fromEntries(tipos.map((tipo) => [tipo, {}])) } }],
  };
  const tela = await abrirEtapaDeRegras(schema);
  const elemento = tela.nativeElement as HTMLElement;
  const editores = elemento.querySelectorAll('.condition-branch.true app-editor-restricao');
  assert.equal(editores.length, 6);
  for (const [index, tipo] of tipos.entries()) {
    const editor = editores[index];
    const operador = editor.querySelector('select') as HTMLSelectElement;
    assert.equal(operador.value, 'none');
    const minimo = editor.querySelector('.restriction-minimum') as HTMLInputElement | null;
    const maximo = editor.querySelector('.restriction-maximum') as HTMLInputElement | null;
    assert.equal(minimo, null);
    assert.equal(maximo, null);
    if (tipo === 'boolean')
      assert.equal(
        (editor.querySelector('input[role="switch"]') as HTMLInputElement).disabled,
        true,
      );
    editar(operador, 'equals', 'change');
    await tela.whenStable();
    assert.equal(editor.querySelector('.restriction-minimum'), null);
    assert.equal(editor.querySelector('.restriction-maximum'), null);
    const valores: Record<string, string> = {
      string: 'ABC',
      integer: '3',
      number: '2.5',
      object: '{"a":1}',
      array: '[1,2]',
    };
    if (tipo === 'boolean')
      (editor.querySelector('input[role="switch"]') as HTMLInputElement).click();
    else editar(editor.querySelector('input,textarea') as HTMLInputElement, valores[tipo]);
    (editor.querySelector('button') as HTMLButtonElement).click();
    await tela.whenStable();
    const regra = tela.componentInstance.schema.allOf[0].then.properties[tipo];
    const esperados: Record<string, unknown> = {
      string: 'ABC',
      integer: 3,
      number: 2.5,
      boolean: true,
      object: { a: 1 },
      array: [1, 2],
    };
    assert.deepEqual(regra, { const: esperados[tipo] });
    assert.equal(editor.querySelector('[role="alert"]'), null);
  }
  tela.destroy();
});

test('comparação exata respeita os limites da origem e mantém limites importados', async () => {
  const schema: Schema = {
    type: 'object',
    properties: { texto: { type: 'string', minLength: 3, maxLength: 10 } },
    allOf: [{ if: {}, then: { properties: { texto: { minLength: 4, maxLength: 8 } } } }],
  };
  const original = structuredClone(schema);
  const tela = await abrirEtapaDeRegras(schema);
  const elemento = tela.nativeElement as HTMLElement;
  const editor = elemento.querySelector('app-editor-restricao')!;
  editar(editor.querySelector('select') as HTMLSelectElement, 'equals', 'change');
  await tela.whenStable();
  assert.equal(editor.querySelector('.restriction-minimum'), null);
  assert.equal(editor.querySelector('.restriction-maximum'), null);
  const valor = editor.querySelector('input') as HTMLInputElement;
  editar(valor, 'AB');
  (editor.querySelector('button') as HTMLButtonElement).click();
  await tela.whenStable();
  assert.ok(editor.querySelector('[role="alert"]'));
  assert.deepEqual(tela.componentInstance.schema, schema);
  editar(valor, 'ABCD');
  (editor.querySelector('button') as HTMLButtonElement).click();
  await tela.whenStable();
  assert.equal(editor.querySelector('[role="alert"]'), null);
  assert.deepEqual(tela.componentInstance.schema.allOf[0].then.properties.texto, {
    minLength: 4,
    maxLength: 8,
    const: 'ABCD',
  });
  assert.deepEqual(tela.componentInstance.schema.properties.texto, original.properties.texto);
  assert.deepEqual(schema, original);
  tela.destroy();
});

test('obrigatório na origem bloqueia os controles do ramo e apresenta tooltip', async () => {
  const schema: Schema = {
    type: 'object',
    properties: { tipo: { type: 'string' }, detalhe: { type: 'string' } },
    required: ['detalhe'],
    allOf: [
      {
        if: { properties: { tipo: { const: 'X' } } },
        then: { properties: { detalhe: {} } },
        else: { properties: { detalhe: { 'x-ui': { visible: false } } } },
      },
    ],
  };
  const tela = await abrirEtapaDeRegras(schema);
  const elemento = tela.nativeElement as HTMLElement;
  for (const ramo of ['true', 'false']) {
    const campo = elemento.querySelector(`.condition-branch.${ramo} .condition-branch-field`)!;
    const controles = campo.querySelectorAll(
      '.condition-required input',
    ) as NodeListOf<HTMLInputElement>;
    assert.equal(controles.length, 2);
    for (const controle of controles) {
      assert.equal(controle.disabled, true);
      assert.equal(controle.checked, true);
      assert.ok(controle.closest('label')?.title.includes('Campo obrigatório na origem'));
      controle.click();
    }
    const dica = campo.querySelector('.condition-origin-hint') as HTMLElement;
    assert.equal(dica.tabIndex, 0);
    assert.ok(dica.title.includes('Altere a configuração do campo'));
    assert.equal(dica.getAttribute('aria-label'), dica.title);
  }
  await tela.whenStable();
  assert.deepEqual(tela.componentInstance.schema, schema);
  tela.destroy();
});

test('alternativas por campos bloqueiam proibir atributos obrigatórios e preservam a origem', async () => {
  const schema: Schema = {
    type: 'object',
    properties: { comum: { type: 'string' }, cartao: { type: 'string' }, pix: { type: 'string' } },
    required: ['comum'],
  };
  const tela = await abrirEtapaDeRegras(schema);
  const elemento = tela.nativeElement as HTMLElement;
  (
    elemento.querySelector('app-editor-alternativas .builder-actions button') as HTMLButtonElement
  ).click();
  await tela.whenStable();
  (
    elemento.querySelector('app-editor-alternativas .oneof-mode-choice') as HTMLButtonElement
  ).click();
  await tela.whenStable();
  const proibidos = elemento.querySelector(
    '[aria-label="Proibir campo na alternativa 1"]',
  ) as HTMLSelectElement;
  assert.equal(
    Array.from(proibidos.options).find((opcao) => opcao.value === 'comum')?.disabled,
    true,
  );
  assert.equal(
    Array.from(proibidos.options).find((opcao) => opcao.value === 'cartao')?.disabled,
    true,
  );
  assert.ok(elemento.textContent?.includes('Obrigatórios na origem: comum'));
  assert.deepEqual(tela.componentInstance.schema.required, ['comum']);
  assert.deepEqual(validarValor(tela.componentInstance.schema, { comum: 'a', cartao: '123' }), []);
  assert.ok(
    validarValor(tela.componentInstance.schema, { comum: 'a', cartao: '123', pix: 'chave' }).length,
  );
  assert.equal(schema.oneOf, undefined);
  tela.destroy();
});

test('enum numérico mantém valores tipados e restaura a seleção ao recusar duplicatas', async () => {
  const tela = await abrirEtapaDeRegras({
    type: 'object',
    properties: { escolha: { type: 'integer', enum: [1, 2, 3] } },
  });
  const elemento = tela.nativeElement as HTMLElement;
  (
    elemento.querySelector('app-editor-alternativas .builder-actions button') as HTMLButtonElement
  ).click();
  await tela.whenStable();
  (
    elemento.querySelectorAll('app-editor-alternativas .oneof-mode-choice')[1] as HTMLButtonElement
  ).click();
  await tela.whenStable();
  const select = elemento.querySelector('.oneof-alternative select') as HTMLSelectElement;
  const opcao = (numero: number) =>
    Array.from(select.options).find((item) => item.textContent?.trim() === String(numero))!;
  editar(select, opcao(3).value, 'change');
  await tela.whenStable();
  assert.equal(tela.componentInstance.schema.oneOf[0].properties.escolha.const, 3);
  editar(select, opcao(2).value, 'change');
  await tela.whenStable();
  assert.equal(tela.componentInstance.schema.oneOf[0].properties.escolha.const, 3);
  assert.equal(select.value, opcao(3).value);
  assert.match(
    elemento.querySelector('app-editor-alternativas [role="alert"]')?.textContent || '',
    /diferente/,
  );
  tela.destroy();
});

test('controle booleano de alternativas preserva false e rejeita valor já usado', async () => {
  const tela = await abrirEtapaDeRegras({
    type: 'object',
    properties: { ativo: { type: 'boolean' } },
  });
  const elemento = tela.nativeElement as HTMLElement;
  (
    elemento.querySelector('app-editor-alternativas .builder-actions button') as HTMLButtonElement
  ).click();
  await tela.whenStable();
  (
    elemento.querySelectorAll('app-editor-alternativas .oneof-mode-choice')[1] as HTMLButtonElement
  ).click();
  await tela.whenStable();
  const toggle = elemento.querySelector(
    '.oneof-alternative input[role="switch"]',
  ) as HTMLInputElement;
  assert.equal(toggle.checked, false);
  toggle.click();
  await tela.whenStable();
  assert.equal(toggle.checked, false);
  assert.equal(tela.componentInstance.schema.oneOf[0].properties.ativo.const, false);
  assert.equal(tela.componentInstance.schema.oneOf[1].properties.ativo.const, true);
  assert.ok(elemento.querySelector('app-editor-alternativas [role="alert"]'));
  tela.destroy();
});

test('interface cria e exclui oneOf no objeto interno mantendo a regra da raiz', async () => {
  const schema: Schema = {
    type: 'object',
    properties: {
      modo: { type: 'string' },
      grupo: { type: 'object', properties: { canal: { type: 'string', enum: ['EMAIL', 'SMS'] } } },
    },
    oneOf: [{ properties: { modo: { const: 'A' } } }, { properties: { modo: { const: 'B' } } }],
  };
  const tela = await abrirEtapaDeRegras(schema);
  tela.componentInstance.abrirObjeto('/properties/grupo');
  tela.changeDetectorRef.markForCheck();
  await tela.whenStable();
  const elemento = tela.nativeElement as HTMLElement;
  assert.equal(elemento.querySelector('app-editor-alternativas .oneof-alternative'), null);
  (
    elemento.querySelector('app-editor-alternativas .builder-actions button') as HTMLButtonElement
  ).click();
  await tela.whenStable();
  (
    elemento.querySelectorAll('app-editor-alternativas .oneof-mode-choice')[1] as HTMLButtonElement
  ).click();
  await tela.whenStable();
  assert.equal(elemento.querySelectorAll('app-editor-alternativas .oneof-alternative').length, 2);
  assert.equal(
    tela.componentInstance.schema.properties.grupo.oneOf[0].properties.canal.const,
    'EMAIL',
  );
  assert.deepEqual(tela.componentInstance.schema.oneOf, schema.oneOf);
  (
    elemento.querySelector(
      'app-editor-alternativas .condition-card .condition-title button',
    ) as HTMLButtonElement
  ).click();
  await tela.whenStable();
  assert.equal(tela.componentInstance.schema.properties.grupo.oneOf, undefined);
  assert.deepEqual(tela.componentInstance.schema.oneOf, schema.oneOf);
  tela.destroy();
});

test('SE distingue texto null de nulo e edita JSON sem salvar conteúdo parcial', async () => {
  const schema = {
    type: 'object',
    properties: { valor: { type: ['string', 'null', 'object', 'array', 'integer'] } },
    allOf: [{ if: { properties: { valor: { const: 'null' } }, required: ['valor'] }, then: {} }],
  };
  const tela = await abrirEtapaDeRegras(schema);
  const elemento = tela.nativeElement as HTMLElement;
  const grade = elemento.querySelector('.condition-grid')!;
  const tipo = grade.querySelector('[aria-label="Tipo do valor esperado"]') as HTMLSelectElement;
  assert.equal((grade.querySelector('input') as HTMLInputElement).value, 'null');
  editar(tipo, 'null', 'change');
  await tela.whenStable();
  assert.equal(tela.componentInstance.schema.allOf[0].if.properties.valor.const, null);
  assert.equal(grade.querySelector('input'), null);
  editar(tipo, 'object', 'change');
  await tela.whenStable();
  const json = grade.querySelector('textarea')!;
  json.value = '{';
  json.dispatchEvent(new Event('input', { bubbles: true }));
  await tela.whenStable();
  assert.deepEqual(tela.componentInstance.schema.allOf[0].if.properties.valor.const, {});
  json.dispatchEvent(new Event('change', { bubbles: true }));
  await tela.whenStable();
  assert.ok(elemento.querySelector('[role="alert"]'));
  json.value = '{"codigo":1}';
  json.dispatchEvent(new Event('change', { bubbles: true }));
  await tela.whenStable();
  assert.deepEqual(tela.componentInstance.schema.allOf[0].if.properties.valor.const, { codigo: 1 });
  editar(tipo, 'array', 'change');
  await tela.whenStable();
  const lista = grade.querySelector('textarea')!;
  lista.value = '[1,"a"]';
  lista.dispatchEvent(new Event('change', { bubbles: true }));
  await tela.whenStable();
  assert.deepEqual(tela.componentInstance.schema.allOf[0].if.properties.valor.const, [1, 'a']);
  editar(tipo, 'integer', 'change');
  await tela.whenStable();
  assert.equal((grade.querySelector('input') as HTMLInputElement).type, 'number');
  assert.equal((grade.querySelector('input') as HTMLInputElement).step, '1');
  tela.destroy();
});

test('ramos booleanos importados desabilitam edição e preservam true e false ao editar SE', async () => {
  const original = {
    type: 'object',
    properties: { ativo: { type: 'boolean' } },
    allOf: [
      {
        if: { properties: { ativo: { const: true } }, required: ['ativo'] },
        then: false,
        else: true,
      },
    ],
  };
  const tela = await abrirEtapaDeRegras(original);
  const elemento = tela.nativeElement as HTMLElement;
  const ramos = elemento.querySelectorAll(
    'fieldset.condition-branch',
  ) as NodeListOf<HTMLFieldSetElement>;
  assert.equal(ramos.length, 2);
  assert.ok([...ramos].every((ramo) => ramo.disabled));
  assert.ok(ramos[0].textContent?.includes('Schema booleano false preservado'));
  elemento.querySelector<HTMLInputElement>('.condition-grid input[role="switch"]')!.click();
  await tela.whenStable();
  assert.equal(tela.componentInstance.schema.allOf[0].then, false);
  assert.equal(tela.componentInstance.schema.allOf[0].else, true);
  assert.equal(tela.componentInstance.schema.allOf[0].if.properties.ativo.const, false);
  tela.destroy();
});

test('SE oferece comparações numéricas e de texto e grava os keywords correspondentes', async () => {
  const tela = await abrirEtapaDeRegras({
    type: 'object',
    properties: { idade: { type: 'integer' }, nome: { type: 'string' } },
    allOf: [{ if: { properties: { idade: { const: 18 } }, required: ['idade'] }, then: {} }],
  });
  const grade = (tela.nativeElement as HTMLElement).querySelector('.condition-grid')!;
  const seletores = grade.querySelectorAll('select');
  editar(seletores[1], 'greaterOrEqual', 'change');
  await tela.whenStable();
  assert.deepEqual(tela.componentInstance.schema.allOf[0].if.properties.idade, { minimum: 18 });
  editar(grade.querySelector('input')!, '21');
  await tela.whenStable();
  assert.deepEqual(tela.componentInstance.schema.allOf[0].if.properties.idade, { minimum: 21 });
  editar(seletores[0], 'nome', 'change');
  await tela.whenStable();
  editar(grade.querySelector('input')!, 'a.b');
  await tela.whenStable();
  editar(seletores[1], 'contains', 'change');
  await tela.whenStable();
  assert.equal(tela.componentInstance.schema.allOf[0].if.properties.nome.pattern, 'a\\.b');
  assert.equal(seletores[1].value, 'contains');
  tela.destroy();
});

test('SE presente e ausente não exibem valor esperado e preservam os ramos', async () => {
  const schema = {
    type: 'object',
    properties: { nome: { type: 'string' } },
    allOf: [
      {
        if: { properties: { nome: { const: 'A' } }, required: ['nome'] },
        then: { title: 'manter' },
      },
    ],
  };
  const tela = await abrirEtapaDeRegras(schema);
  const grade = (tela.nativeElement as HTMLElement).querySelector('.condition-grid')!;
  const operador = grade.querySelectorAll('select')[1];
  editar(operador, 'present', 'change');
  await tela.whenStable();
  assert.equal(grade.querySelector('input'), null);
  assert.deepEqual(tela.componentInstance.schema.allOf[0].if, { required: ['nome'] });
  editar(operador, 'absent', 'change');
  await tela.whenStable();
  assert.deepEqual(tela.componentInstance.schema.allOf[0].if, { not: { required: ['nome'] } });
  editar(operador, 'equals', 'change');
  await tela.whenStable();
  assert.ok(grade.querySelector('input'));
  assert.deepEqual(tela.componentInstance.schema.allOf[0].then, { title: 'manter' });
  tela.destroy();
});

test('editor recursivo cria grupo OU, condição interna e negação por eventos reais', async () => {
  const schema = {
    type: 'object',
    properties: {
      tipo: { type: 'string' },
      grupo: { type: 'object', properties: { ativo: { type: 'boolean' } } },
    },
    allOf: [
      {
        if: { properties: { tipo: { const: 'A' } }, required: ['tipo'] },
        then: { title: 'preservar' },
      },
    ],
  };
  const tela = await abrirEtapaDeRegras(schema);
  const elemento = tela.nativeElement as HTMLElement;
  const agrupar = [...elemento.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('Agrupar: Qualquer'),
  )!;
  agrupar.click();
  await tela.whenStable();
  assert.ok(tela.componentInstance.schema.allOf[0].if.anyOf);
  const folha = elemento.querySelector('app-editor-expressao app-editor-expressao')!;
  const campo = [...folha.querySelectorAll('select')][0];
  editar(campo, '/grupo/ativo', 'change');
  await tela.whenStable();
  const input = folha.querySelector('input[role="switch"]') as HTMLInputElement;
  assert.equal(input.checked, false);
  await tela.whenStable();
  [...folha.querySelectorAll('button')]
    .find((b) => b.textContent?.trim() === 'Aplicar condição')!
    .click();
  await tela.whenStable();
  assert.equal(
    tela.componentInstance.schema.allOf[0].if.anyOf[0].properties.grupo.properties.ativo.const,
    false,
  );
  assert.equal(tela.componentInstance.schema.allOf[0].then.title, 'preservar');
  tela.destroy();
});

test('editor guiado de estruturas adiciona dependência obrigatória em rascunho por eventos reais', async () => {
  const tela = await abrirEtapaDeRegras({
    type: 'object',
    properties: {
      grupo: { type: 'object', properties: { a: { type: 'string' }, b: { type: 'integer' } } },
    },
  });
  tela.componentInstance.abrirEditorDoCampo('/properties/grupo');
  tela.componentInstance.editorTab = 'validation';
  tela.changeDetectorRef.markForCheck();
  await tela.whenStable();
  const editor = (tela.nativeElement as HTMLElement).querySelector(
    '.editor-modal-shell app-editor-estruturas',
  )!;
  const selects = editor.querySelectorAll('select');
  editar(selects[0], 'a', 'change');
  editar(selects[1], 'b', 'change');
  await tela.whenStable();
  [...editor.querySelectorAll('button')]
    .find((b) => b.textContent?.includes('Adicionar dependência obrigatória'))!
    .click();
  await tela.whenStable();
  assert.deepEqual(tela.componentInstance.schema.properties.grupo.dependentRequired, { a: ['b'] });
  tela.componentInstance.cancelarEdicao();
  assert.equal(tela.componentInstance.schema.properties.grupo.dependentRequired, undefined);
  tela.destroy();
});

test('dependências guiadas também estão disponíveis no objeto raiz na etapa Regras', async () => {
  const tela = await abrirEtapaDeRegras({
    type: 'object',
    properties: { a: { type: 'string' }, b: { type: 'string' } },
  });
  const editor = (tela.nativeElement as HTMLElement).querySelector('app-editor-estruturas')!;
  const seletores = editor.querySelectorAll('select');
  editar(seletores[0], 'a', 'change');
  editar(seletores[1], 'b', 'change');
  await tela.whenStable();
  [...editor.querySelectorAll('button')]
    .find((b) => b.textContent?.includes('Adicionar dependência obrigatória'))!
    .click();
  await tela.whenStable();
  assert.deepEqual(tela.componentInstance.schema.dependentRequired, { a: ['b'] });
  tela.destroy();
});

test('rascunhos de dependências e padrões preservam o DOM e JSON parcial durante outras alterações', async () => {
  const tela = await abrirEtapaDeRegras({
    type: 'object',
    properties: { a: { type: 'string' }, b: { type: 'string' } },
    dependentSchemas: { a: { required: ['b'] } },
    patternProperties: { '^x': { type: 'string' } },
  });
  const elemento = tela.nativeElement as HTMLElement,
    editor = elemento.querySelector('app-editor-estruturas')!;
  const dependencia = editor.querySelector(
    'textarea[aria-label="Schema dependente de a"]',
  ) as HTMLTextAreaElement;
  const padrao = editor.querySelector(
    'textarea[aria-label="Regra do padrão ^x"]',
  ) as HTMLTextAreaElement;
  dependencia.value = '{';
  dependencia.dispatchEvent(new Event('input', { bubbles: true }));
  padrao.value = '{"type":';
  padrao.dispatchEvent(new Event('input', { bubbles: true }));
  await tela.whenStable();
  const seletores = editor.querySelectorAll('select');
  editar(seletores[0], 'b', 'change');
  editar(seletores[1], 'a', 'change');
  await tela.whenStable();
  [...editor.querySelectorAll('button')]
    .find((b) => b.textContent?.includes('Adicionar dependência obrigatória'))!
    .click();
  await tela.whenStable();
  assert.equal(editor.querySelector('textarea[aria-label="Schema dependente de a"]'), dependencia);
  assert.equal(dependencia.value, '{');
  assert.equal(editor.querySelector('textarea[aria-label="Regra do padrão ^x"]'), padrao);
  assert.equal(padrao.value, '{"type":');
  const antes = structuredClone(tela.componentInstance.schema);
  [...dependencia.closest('.structure-entry')!.querySelectorAll('button')]
    .find((b) => b.textContent?.trim() === 'Aplicar dependência')!
    .click();
  await tela.whenStable();
  assert.deepEqual(tela.componentInstance.schema, antes);
  assert.equal(dependencia.value, '{');
  assert.ok(editor.querySelector('[role="alert"]'));
  tela.destroy();
});

test('SE composto compartilha switch e enum tipado, preservando rascunho ao aplicar outra condição e trocar E/OU', async () => {
  const tela = await abrirEtapaDeRegras({
    type: 'object',
    properties: { ativo: { type: 'boolean' }, codigo: { enum: [12, '12', null, 'null'] } },
    allOf: [
      {
        if: {
          anyOf: [
            { properties: { ativo: { const: false } }, required: ['ativo'] },
            { properties: { codigo: { const: 12 } }, required: ['codigo'] },
          ],
        },
        then: { title: 'preservar' },
      },
    ],
  });
  const elemento = tela.nativeElement as HTMLElement,
    grupo = elemento.querySelector('app-editor-expressao')!;
  const filhos = grupo.querySelectorAll('.expression-child');
  const bool = filhos[0],
    enums = filhos[1];
  const seletor = enums.querySelector(
    'app-valor-condicao select[aria-label="Valor esperado"]',
  ) as HTMLSelectElement;
  editar(seletor, seletor.options[1].value, 'change');
  await tela.whenStable();
  const controle = bool.querySelector('input[role="switch"]') as HTMLInputElement;
  controle.click();
  await tela.whenStable();
  (bool.querySelector('.apply-condition') as HTMLButtonElement).click();
  await tela.whenStable();
  assert.equal(tela.componentInstance.schema.allOf[0].if.anyOf[0].properties.ativo.const, true);
  assert.equal(enums.querySelector('select[aria-label="Valor esperado"]'), seletor);
  assert.equal(seletor.selectedIndex, 1);
  const operador = grupo.querySelector(
    'select[aria-label="Operador do grupo"]',
  ) as HTMLSelectElement;
  editar(operador, 'allOf', 'change');
  await tela.whenStable();
  assert.ok(tela.componentInstance.schema.allOf[0].if.allOf);
  assert.equal(tela.componentInstance.schema.allOf[0].if.anyOf, undefined);
  assert.equal(enums.querySelector('select[aria-label="Valor esperado"]'), seletor);
  assert.equal(seletor.selectedIndex, 1);
  (enums.querySelector('.apply-condition') as HTMLButtonElement).click();
  await tela.whenStable();
  assert.equal(tela.componentInstance.schema.allOf[0].if.allOf[1].properties.codigo.const, '12');
  assert.equal(tela.componentInstance.schema.allOf[0].then.title, 'preservar');
  tela.destroy();
});

test('estruturas de objeto e lista anuláveis mostram seções e mantêm rascunhos contains', async () => {
  const tela = await abrirEtapaDeRegras({
    type: 'object',
    properties: {
      grupo: { type: ['object', 'null'], properties: { a: {}, b: {} } },
      lista: {
        type: ['array', 'null'],
        prefixItems: [{ type: 'string' }],
        contains: { type: 'integer' },
      },
    },
  });
  tela.componentInstance.abrirEditorDoCampo('/properties/grupo');
  tela.componentInstance.editorTab = 'validation';
  tela.changeDetectorRef.markForCheck();
  await tela.whenStable();
  let editor = (tela.nativeElement as HTMLElement).querySelector(
    '.editor-modal-shell app-editor-estruturas',
  )!;
  assert.ok(editor.textContent?.includes('Dependências entre campos'));
  assert.ok(editor.textContent?.includes('Nomes das propriedades'));
  assert.ok(editor.textContent?.includes('Propriedades dinâmicas'));
  tela.componentInstance.cancelarEdicao();
  tela.componentInstance.abrirEditorDoCampo('/properties/lista');
  tela.componentInstance.editorTab = 'validation';
  tela.changeDetectorRef.markForCheck();
  await tela.whenStable();
  editor = (tela.nativeElement as HTMLElement).querySelector(
    '.editor-modal-shell app-editor-estruturas',
  )!;
  assert.ok(editor.textContent?.includes('Itens por posição'));
  const contem = editor.querySelector(
    'textarea[aria-label="Regra contains"]',
  ) as HTMLTextAreaElement;
  contem.value = '{"minimum":';
  contem.dispatchEvent(new Event('input', { bubbles: true }));
  await tela.whenStable();
  [...editor.querySelectorAll('button')]
    .find((b) => b.textContent?.trim() === 'Adicionar posição na tupla')!
    .click();
  await tela.whenStable();
  assert.equal(editor.querySelector('textarea[aria-label="Regra contains"]'), contem);
  assert.equal(contem.value, '{"minimum":');
  assert.deepEqual(tela.componentInstance.schema.properties.lista.type, ['array', 'null']);
  tela.destroy();
});

test('preenchimento diferencia ausência, null e valor em todos os tipos de campo', async () => {
  for (const definicao of [
    { type: 'string' },
    { type: 'integer' },
    { type: 'number' },
    { type: 'boolean' },
    { type: 'object', properties: { nome: { type: 'string' } } },
    { type: 'array', items: { type: 'string' } },
    {},
  ]) {
    const campo = { ...definicao, type: definicao.type ? [definicao.type, 'null'] : undefined };
    const { tela, elemento, emitidos } = await renderizarCampo(
      { type: 'object', properties: { valor: campo } },
      {},
    );
    let seletor = elemento.querySelector('.value-state-selector select') as HTMLSelectElement;
    assert.ok(seletor, JSON.stringify(campo));
    assert.equal(seletor.value, 'ausente');
    assert.match(elemento.textContent || '', /Campo opcional sem valor/);
    editar(seletor, 'nulo', 'change');
    await tela.whenStable();
    assert.deepEqual(emitidos.at(-1), { valor: null });
    assert.match(elemento.textContent || '', /Valor definido como null/);
    seletor = elemento.querySelector('.value-state-selector select') as HTMLSelectElement;
    editar(seletor, 'preenchido', 'change');
    await tela.whenStable();
    assert.notEqual(emitidos.at(-1).valor, null, JSON.stringify(campo));
    assert.notEqual(emitidos.at(-1).valor, undefined);
    seletor = elemento.querySelector('.value-state-selector select') as HTMLSelectElement;
    editar(seletor, 'ausente', 'change');
    await tela.whenStable();
    assert.deepEqual(emitidos.at(-1), {});
    assert.equal(Object.hasOwn(emitidos.at(-1), 'valor'), false);
    tela.destroy();
  }
});

test('preenchimento respeita obrigatoriedade, tipo não anulável e somente leitura', async () => {
  const { tela, elemento, emitidos } = await renderizarCampo(
    {
      type: 'object',
      required: ['obrigatorio'],
      properties: {
        opcional: { type: 'string' },
        obrigatorio: { type: ['string', 'null'] },
        leitura: { type: ['string', 'null'], readOnly: true },
      },
    },
    { obrigatorio: null, leitura: 'fixo' },
  );
  const seletores = Array.from(
    elemento.querySelectorAll('.value-state-selector select'),
  ) as HTMLSelectElement[];
  assert.deepEqual(
    Array.from(seletores[0].options, (opcao) => opcao.value),
    ['ausente', 'preenchido'],
  );
  assert.deepEqual(
    Array.from(seletores[1].options, (opcao) => opcao.value),
    ['preenchido', 'nulo'],
  );
  assert.equal(seletores[2].disabled, true);
  editar(seletores[0], 'preenchido', 'change');
  await tela.whenStable();
  assert.deepEqual(emitidos.at(-1), { obrigatorio: null, leitura: 'fixo', opcional: '' });
  tela.destroy();
});

test('enum iniciado por null permite criar valor não nulo e schema somente null não oferece preencher', async () => {
  for (const campo of [{ enum: [null, 'A'] }, { type: 'null' }]) {
    const { tela, elemento, emitidos } = await renderizarCampo(
      { type: 'object', properties: { valor: campo } },
      {},
    );
    const seletor = elemento.querySelector('.value-state-selector select') as HTMLSelectElement;
    assert.ok(seletor);
    if ('enum' in campo) {
      editar(seletor, 'preenchido', 'change');
      await tela.whenStable();
      assert.deepEqual(emitidos.at(-1), { valor: 'A' });
    } else
      assert.deepEqual(
        Array.from(seletor.options, (opcao) => opcao.value),
        ['ausente', 'nulo'],
      );
    tela.destroy();
  }
});
