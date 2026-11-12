import { test, expect, type Page } from '@playwright/test';

async function importar(page: Page, schema: object) {
  await page.goto('/');
  await page.getByRole('button', { name: /Schema Builder/ }).click();
  await page.getByRole('button', { name: 'Para Dev', exact: true }).click();
  await page.getByLabel('Editor de JSON Schema para desenvolvedores').fill(JSON.stringify(schema));
  await page.getByRole('button', { name: 'Validar JSON', exact: true }).click();
  await expect(page.getByText('✓ Sintaxe JSON e estrutura do schema válidas')).toBeVisible();
}

const schema = {
  type: 'object',
  title: 'Contato',
  properties: {
    ativo: { type: 'boolean', title: 'Ativo' },
    nome: { type: 'string', title: 'Nome' },
    apelido: { type: ['string', 'null'], title: 'Apelido' },
    email: { type: 'string', title: 'Email' },
  },
  allOf: [
    {
      if: { properties: { ativo: { const: true } }, required: ['ativo'] },
      then: { required: ['email'] },
    },
  ],
};

test('Para Dev formata, recusa JSON inválido e mantém o último contrato', async ({ page }) => {
  await importar(page, schema);
  const editor = page.getByLabel('Editor de JSON Schema para desenvolvedores');
  await page.getByRole('button', { name: 'Formatar JSON', exact: true }).click();
  expect(JSON.parse(await editor.inputValue())).toEqual(schema);
  await editor.fill('{');
  // Wait for the editor's input binding to settle before submitting the invalid draft.
  await expect(editor).toHaveValue('{');
  await editor.blur();
  await page.getByRole('button', { name: 'Validar JSON', exact: true }).click();
  await expect(editor).toHaveValue('{');
  await page.getByRole('button', { name: 'Construção', exact: true }).click();
  await expect(page.getByRole('button', { name: /Nome string nome/ })).toBeVisible();
});

test('SE tipado, grupo E/OU e estruturas preservam o documento', async ({ page }, testInfo) => {
  await importar(page, schema);
  await page.getByRole('button', { name: 'Construção', exact: true }).click();
  await page.getByRole('button', { name: 'Próximo: Regras e condições →' }).click();
  await expect(page.getByRole('switch', { name: 'Valor esperado' })).toBeChecked();
  await page
    .getByLabel('Atender', { exact: true })
    .selectOption({ label: 'Pelo menos uma condição (OU)' });
  await page.getByRole('button', { name: '+ Adicionar condição', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Valor esperado' })).toHaveCount(2);
  await expect(page.locator('.condition-connector')).toHaveText(['SE', 'OU']);
  await page.getByLabel('Atender', { exact: true }).selectOption('allOf');
  await expect(page.locator('.condition-connector')).toHaveText(['SE', 'E']);
  await page.getByLabel('Atender', { exact: true }).selectOption('anyOf');
  await expect(page.locator('.condition-connector')).toHaveText(['SE', 'OU']);
  const toolbar = page.locator('.condition-if .condition-toolbar').first();
  await expect(
    toolbar.getByRole('button', { name: '+ Adicionar condição', exact: true }),
  ).toBeVisible();
  const linha = page.locator('.expression-child').first();
  const excluir = (await linha.locator('.remove-condition').boundingBox())!;
  const campo = (await linha.locator('.expression-fields select').first().boundingBox())!;
  const aplicarQuando = page.getByRole('button', { name: 'Aplicar condição', exact: true });
  await expect(aplicarQuando).toHaveCount(1);
  await expect(page.locator('.expression-child .apply-condition')).toHaveCount(0);
  const ultimaLinha = (await page.locator('.expression-child').last().boundingBox())!;
  const aplicar = (await aplicarQuando.boundingBox())!;
  expect(excluir.x).toBeLessThan(campo.x);
  expect(aplicar.y).toBeGreaterThanOrEqual(ultimaLinha.y + ultimaLinha.height);
  await page.getByRole('button', { name: /Visualizar schema/ }).click();
  const visualizacao = page.getByRole('dialog', { name: 'Visualizar JSON Schema', exact: true });
  expect(JSON.parse((await visualizacao.locator('pre').textContent())!)).toEqual(schema);
  await visualizacao
    .getByRole('button', { name: 'Fechar visualização do schema', exact: true })
    .click();
  await aplicarQuando.click();

  await expect(page.locator('.expression-child fieldset')).toHaveCount(0);
  await expect(page.getByText('Condições avançadas', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /Inverter condição|Grupo de condições/ }),
  ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('condicoes-negocio.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await expect(
    page.getByText('Dependências e padrões do objeto selecionado', { exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Para Dev', exact: true }).click();
  const atual = JSON.parse(
    await page.getByLabel('Editor de JSON Schema para desenvolvedores').inputValue(),
  );
  expect(atual.allOf[0].if.anyOf).toHaveLength(2);
  expect(atual.allOf[0].then.required).toEqual(['email']);
});

test('preview distingue ausência e null e ativa campo obrigatório sem overflow', async ({
  page,
}, testInfo) => {
  await importar(page, schema);
  await page.getByRole('button', { name: /Visualizar formulário/ }).click();
  const preview = page.getByRole('dialog', { name: 'Preview do formulário', exact: true });
  const estados = preview.getByRole('combobox', { name: 'Preenchimento', exact: true });
  await expect(estados.nth(0)).toHaveValue('ausente');
  await expect(estados.nth(1).locator('option')).toHaveText(['Não informar', 'Preencher']);
  await estados.nth(2).selectOption('ausente');
  await expect(preview.getByText('Campo opcional sem valor.')).toHaveCount(3);
  await estados.nth(2).selectOption('nulo');
  await expect(preview.getByText('Valor definido como null.')).toBeVisible();
  await estados.nth(0).selectOption('preenchido');
  await preview.locator('app-campo-booleano label').click();
  await expect(preview.locator('app-campo-booleano input')).toBeChecked();
  await expect(preview.getByText('Email *', { exact: true })).toBeVisible();
  const largura = await page.evaluate(() => ({
    conteudo: document.documentElement.scrollWidth,
    tela: innerWidth,
  }));
  expect(largura.conteudo).toBeLessThanOrEqual(largura.tela + 1);
  await page.screenshot({ path: testInfo.outputPath('preenchimento.png'), animations: 'disabled' });
});

test('contrato com dynamicRef usa editor JSON e diagnóstico explícito', async ({ page }) => {
  await importar(page, {
    $id: 'https://example.test/tree',
    $dynamicAnchor: 'node',
    type: 'object',
    properties: { filhos: { type: 'array', items: { $dynamicRef: '#node' } } },
  });
  await page.getByRole('button', { name: /Visualizar formulário/ }).click();
  const preview = page.getByRole('dialog', { name: 'Preview do formulário', exact: true });
  await expect(preview.getByRole('status')).toContainText('referência dinâmica');
  await expect(preview.locator('textarea')).toBeVisible();
});

test('renderer preserva dados ocultos e mostra erros de valores incompatíveis', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Schema Renderer/ }).click();
  await page.getByLabel('Editor JSON Schema', { exact: true }).fill(
    JSON.stringify({
      type: 'object',
      properties: { ativo: { type: 'boolean' }, detalhe: { type: 'string', title: 'Detalhe' } },
      allOf: [
        {
          if: { properties: { ativo: { const: true } }, required: ['ativo'] },
          then: { properties: { detalhe: { 'x-ui': { visible: true } } } },
          else: { properties: { detalhe: { 'x-ui': { visible: false } } } },
        },
      ],
    }),
  );
  await page.getByRole('button', { name: 'Renderizar schema', exact: true }).click();
  await page.getByRole('button', { name: /Modo desenvolvedor/ }).click();
  const editor = page.getByLabel('Editor JSON de valores', { exact: true });
  await editor.fill(JSON.stringify({ ativo: false, detalhe: 'preservado' }));
  await page.getByRole('button', { name: /2 Formulário/ }).click();
  await expect(page.getByText('Detalhe', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /4 Resposta/ }).click();
  expect(JSON.parse(await page.locator('.response-json').innerText())).toEqual({
    ativo: false,
    detalhe: 'preservado',
  });
  await page.getByRole('button', { name: /Modo desenvolvedor/ }).click();
  await editor.fill(JSON.stringify({ ativo: false, detalhe: 12 }));
  await expect(page.getByText('must be string', { exact: false })).toBeVisible();
});

test('schema avançado bloqueia Construção, preserva JSON, permite preview e desbloqueia após correção', async ({
  page,
}, testInfo) => {
  const avancado = { ...schema, dependentRequired: { nome: ['email'] } };
  await importar(page, avancado);
  await page.getByRole('button', { name: 'Construção', exact: true }).click();
  const aviso = page.getByRole('region', { name: 'Edição visual indisponível' });
  await expect(aviso).toBeVisible();
  await aviso.getByText(/Ver motivos/).click();
  await expect(aviso.getByText(/dependentRequired/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Próximo: Regras e condições →' })).toBeDisabled();
  await page.screenshot({
    path: testInfo.outputPath('construcao-bloqueada.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: /Visualizar formulário/ }).click();
  await expect(
    page.getByRole('dialog', { name: 'Preview do formulário', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('dialog', { name: 'Preview do formulário', exact: true }),
  ).toHaveCount(0);
  await aviso.getByRole('button', { name: 'Continuar no Para Dev' }).click();
  const editor = page.getByLabel('Editor de JSON Schema para desenvolvedores');
  expect(JSON.parse(await editor.inputValue())).toEqual(avancado);
  await editor.fill(JSON.stringify(schema));
  await page.getByRole('button', { name: 'Construção', exact: true }).click();
  await expect(aviso).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Próximo: Regras e condições →' })).toBeEnabled();
});

test('tipo da propriedade alinha rótulo, seletor e adicionar sem depender da etapa Regras', async ({
  page,
}, testInfo) => {
  const documento = {
    type: 'object',
    title: 'Cadastro',
    properties: {
      endereco: { type: 'object', title: 'Endereço', properties: {} },
      contatos: { type: 'array', title: 'Contatos', items: { type: 'object', properties: {} } },
    },
  };
  await importar(page, documento);
  await page.getByRole('button', { name: 'Construção', exact: true }).click();
  const etapas = (await page.locator('.builder-stepper').boundingBox())!;
  const cabecalho = (await page.locator('.construction-heading').boundingBox())!;
  expect(cabecalho.y).toBeGreaterThanOrEqual(etapas.y + etapas.height);
  const navegacao = page.getByRole('navigation', { name: 'Navegação das etapas' });
  const anterior = navegacao.getByRole('button', { name: '← Anterior: Componentes', exact: true });
  const proximo = navegacao.getByRole('button', {
    name: 'Próximo: Regras e condições →',
    exact: true,
  });
  await expect(anterior).toBeVisible();
  await expect(anterior).toBeDisabled();
  await expect(proximo).toBeVisible();
  await expect(proximo).toBeEnabled();
  const esquerda = (await anterior.boundingBox())!;
  const direita = (await proximo.boundingBox())!;
  expect(esquerda.x + esquerda.width).toBeLessThanOrEqual(direita.x);
  expect(Math.abs(esquerda.y - direita.y)).toBeLessThan(2);
  const rodape = (await navegacao.boundingBox())!;
  expect(Math.abs(rodape.width - etapas.width)).toBeLessThan(2);
  expect(Math.abs(direita.x + direita.width - (rodape.x + rodape.width - 4))).toBeLessThan(2);
  await proximo.click();
  await expect(anterior).toBeEnabled();
  await expect(proximo).toBeDisabled();
  await anterior.click();
  await expect(anterior).toBeDisabled();
  await expect(proximo).toBeEnabled();
  const seletores = page.locator('.inline-object-actions.inline-object-picker');
  await expect(seletores).toHaveCount(2);
  await page.screenshot({
    path: testInfo.outputPath('atributo-discreto.png'),
    fullPage: true,
    animations: 'disabled',
  });
  for (const seletor of await seletores.all()) {
    await expect(seletor.locator('select')).toBeHidden();
    await seletor.locator('summary').click();
    const rotulo = seletor.locator('label'),
      campo = seletor.locator('select'),
      adicionar = seletor.locator('button');
    await expect(rotulo).toBeVisible();
    const a = (await rotulo.boundingBox())!,
      b = (await campo.boundingBox())!,
      c = (await adicionar.boundingBox())!;
    expect(a.y + a.height).toBeLessThanOrEqual(b.y);
    expect(Math.abs(a.x - b.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(b.y - c.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(b.height - c.height)).toBeLessThanOrEqual(1);
    expect(c.x).toBeGreaterThanOrEqual(b.x + b.width);
  }
  await page.screenshot({
    path: testInfo.outputPath('tipo-propriedade.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByLabel('Tipo da nova propriedade em Endereço').selectOption('integer');
  await page.getByRole('button', { name: 'Adicionar propriedade a Endereço', exact: true }).click();
  await expect(seletores.first().locator('select')).toBeHidden();
  await seletores.first().locator('summary').click();
  await page.getByLabel('Tipo da nova propriedade em Endereço').selectOption('object');
  await page.getByRole('button', { name: 'Adicionar propriedade a Endereço', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Abrir atributos do objeto', exact: true }),
  ).toHaveCount(0);
  const interno = page.locator('.attribute-object > app-atributos-objeto');
  await interno.locator('summary').click();
  await page.getByLabel('Tipo da nova propriedade em campo2').selectOption('string');
  await page.getByRole('button', { name: 'Adicionar propriedade a campo2', exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath('objetos-aninhados.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Para Dev', exact: true }).click();
  const atual = JSON.parse(
    await page.getByLabel('Editor de JSON Schema para desenvolvedores').inputValue(),
  );
  expect(atual.properties.endereco.properties.campo.type).toBe('integer');
  expect(atual.properties.endereco.properties.campo2.type).toBe('object');
  expect(atual.properties.endereco.properties.campo2.properties.campo.type).toBe('string');
});

test('ajuda da Construção explica o perfil de negócio e os limites do Para Dev sem overflow', async ({
  page,
}, testInfo) => {
  await importar(page, schema);
  await page.getByRole('button', { name: 'Construção', exact: true }).click();
  const ajuda = page.locator('.construction-limits');
  await ajuda.getByText('O que posso criar na Construção?', { exact: true }).click();
  for (const nome of ['Campos e validações', 'Regras de negócio', 'Quando usar o Para Dev']) {
    await expect(ajuda.getByRole('heading', { name: nome, exact: true })).toBeVisible();
  }
  await expect(ajuda.getByText(/Cada lista usa uma única combinação/)).toBeVisible();
  await expect(ajuda.getByText(/O JSON original é preservado/)).toBeVisible();
  const largura = await page.evaluate(() => ({
    conteudo: document.documentElement.scrollWidth,
    tela: innerWidth,
  }));
  expect(largura.conteudo).toBeLessThanOrEqual(largura.tela + 1);
  await ajuda.screenshot({
    path: testInfo.outputPath('ajuda-construcao.png'),
    animations: 'disabled',
  });
  await ajuda.getByText('O que posso criar na Construção?', { exact: true }).click();
  await expect(
    ajuda.getByRole('heading', { name: 'Campos e validações', exact: true }),
  ).toBeHidden();
  await expect(page.getByRole('button', { name: 'Próximo: Regras e condições →' })).toBeEnabled();
});

test('atributos primitivos e objetos compartilham cores e seleção sem hover laranja', async ({
  page,
}, testInfo) => {
  await importar(page, {
    type: 'object',
    properties: {
      nome: { type: 'string', title: 'Nome' },
      endereco: {
        type: 'object',
        title: 'Endereço',
        properties: { rua: { type: 'string', title: 'Rua' } },
      },
      contatos: {
        type: 'array',
        title: 'Contatos',
        items: { type: 'object', properties: { telefone: { type: 'string', title: 'Telefone' } } },
      },
    },
  });
  await page.getByRole('button', { name: 'Construção', exact: true }).click();
  const cards = page.locator('.canvas-fields > .canvas-field-card');
  await expect(cards).toHaveCount(3);
  for (const card of await cards.all())
    await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  const atributo = page.locator('.inline-object-child-main').first();
  await atributo.hover();
  await expect
    .poll(async () =>
      ['rgba(0, 0, 0, 0)', 'rgb(248, 250, 255)'].includes(
        await atributo.evaluate((no) => getComputedStyle(no).backgroundColor),
      ),
    )
    .toBe(true);
  await atributo.click();
  const modal = page.getByRole('dialog', { name: 'Configuração do campo' });
  await expect(modal).toBeVisible();
  await expect(page.locator('.inline-object-child.active')).toHaveCSS(
    'border-top-color',
    'rgb(36, 85, 181)',
  );
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.locator('.schema-group-select').first().click();
  await expect(cards.nth(1)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(cards.nth(1)).toHaveCSS('border-top-color', 'rgb(36, 85, 181)');
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath('atributos-padrao.png'),
    fullPage: true,
    animations: 'disabled',
  });
});

test('ocultação nula mantém payload válido para os seis tipos de campo', async ({ page }) => {
  const campos = {
    texto: { type: ['string', 'null'], minLength: 10, maxLength: 500 },
    inteiro: { type: ['integer', 'null'], minimum: 1, maximum: 100 },
    decimal: { type: ['number', 'null'], minimum: 0.01 },
    booleano: { type: ['boolean', 'null'] },
    objeto: {
      type: ['object', 'null'],
      required: ['nome'],
      properties: { nome: { type: 'string' } },
    },
    lista: { type: ['array', 'null'], items: { type: 'integer' }, minItems: 1 },
  };
  const nomes = Object.keys(campos);
  const origem = {
    type: 'object',
    required: ['ativo'],
    additionalProperties: false,
    properties: { ativo: { type: 'boolean', title: 'Ativo' }, ...campos },
    allOf: [
      {
        if: { properties: { ativo: { const: true } }, required: ['ativo'] },
        then: {
          required: nomes,
          properties: Object.fromEntries(
            Object.entries(campos).map(([nome, campo]) => [
              nome,
              { type: campo.type[0], 'x-ui': { visible: true } },
            ]),
          ),
        },
        else: {
          properties: Object.fromEntries(
            nomes.map((nome) => [nome, { type: 'null', 'x-ui': { visible: false } }]),
          ),
        },
      },
    ],
  };
  await page.goto('/');
  await page.getByRole('button', { name: /Schema Renderer/ }).click();
  await page.getByLabel('Editor JSON Schema', { exact: true }).fill(JSON.stringify(origem));
  await page.getByRole('button', { name: 'Renderizar schema', exact: true }).click();
  await page.getByRole('button', { name: /Modo desenvolvedor/ }).click();
  await page.getByLabel('Editor JSON de valores', { exact: true }).fill(
    JSON.stringify({
      ativo: true,
      texto: 'Justificativa válida',
      inteiro: 2,
      decimal: 1.5,
      booleano: false,
      objeto: { nome: 'Ana' },
      lista: [1],
    }),
  );
  await page.getByRole('button', { name: /2 Formulário/ }).click();
  await page.locator('app-campo-booleano').first().locator('label.boolean-toggle').click();
  await page.getByRole('button', { name: /4 Resposta/ }).click();
  expect(JSON.parse(await page.locator('.response-json').innerText())).toEqual({
    ativo: false,
    ...Object.fromEntries(nomes.map((nome) => [nome, null])),
  });
  await page.getByRole('button', { name: /2 Formulário/ }).click();
  await expect(page.locator('app-campo-texto')).toHaveCount(0);
  await expect(page.locator('app-campo-numero')).toHaveCount(0);
  await expect(page.locator('app-campo-lista')).toHaveCount(0);
});

test('ocultação incompatível valida no atributo e mantém a Construção disponível', async ({
  page,
}) => {
  await importar(page, {
    type: 'object',
    properties: { ativo: { type: 'boolean' }, justificativa: { type: 'string', minLength: 10 } },
    allOf: [
      {
        if: { properties: { ativo: { const: true } }, required: ['ativo'] },
        then: {
          required: ['justificativa'],
          properties: { justificativa: { 'x-ui': { visible: true } } },
        },
        else: { properties: { justificativa: { 'x-ui': { visible: false } } } },
      },
    ],
  });
  await page.getByRole('button', { name: 'Construção', exact: true }).click();
  const proximo = page.getByRole('button', { name: 'Próximo: Regras e condições →' });
  await expect(proximo).toBeEnabled();
  await proximo.click();
  const ramo = page.locator('.condition-branch.false');
  await expect(ramo.locator('.condition-field-notice')).toContainText('Pode ser usado na condição');
  const visivel = ramo.getByRole('switch', { name: 'Visível neste ramo' });
  await expect(visivel).toBeEnabled();
  await ramo.locator('label').filter({ hasText: 'Visível neste ramo' }).click();
  await expect(visivel).toBeChecked();
  await expect(visivel).toBeDisabled();
  await expect(
    page.getByRole('button', { name: '+ Condição SE / ENTÃO / SENÃO', exact: true }),
  ).toBeEnabled();
});
