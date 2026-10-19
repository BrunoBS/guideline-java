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
  await page.getByRole('button', { name: 'Validar JSON', exact: true }).click();
  await expect(editor).toHaveValue('{');
  await page.getByRole('button', { name: 'Construção', exact: true }).click();
  await expect(page.getByRole('button', { name: /Nome string nome/ })).toBeVisible();
});

test('SE tipado, grupo E/OU e estruturas preservam o documento', async ({ page }) => {
  await importar(page, schema);
  await page.getByRole('button', { name: 'Construção', exact: true }).click();
  await page.getByRole('button', { name: 'Próximo: Regras e condições →' }).click();
  await expect(page.getByRole('switch', { name: 'Valor esperado' })).toBeChecked();
  await page.getByRole('button', { name: 'Agrupar: Todas (E)', exact: true }).click();
  await page.getByLabel('Operador do grupo').selectOption({ label: 'Qualquer uma (OU)' });
  await page.getByRole('button', { name: '+ Condição no grupo', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Valor esperado' })).toHaveCount(2);
  await page.getByText('Dependências e padrões do objeto selecionado', { exact: true }).click();
  await expect(page.getByText('Dependências entre campos', { exact: true })).toBeVisible();
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
