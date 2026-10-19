import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  criarPadraoDeTexto,
  lerPadraoDeTexto,
  OPCOES_COMPARACAO_TEXTO,
} from './restricoes-texto-condicional';

for (const opcao of OPCOES_COMPARACAO_TEXTO) {
  test(`comparação literal ${opcao.rotulo} preserva o texto e reconhece o padrão salvo`, () => {
    const texto = 'a.b+(c)[x]$\\';
    const padrao = criarPadraoDeTexto(opcao.valor, texto);
    assert.deepEqual(lerPadraoDeTexto(padrao), { operador: opcao.valor, texto });
    const regex = new RegExp(padrao, 'u');
    const resultados: Record<string, boolean[]> = {
      contains: [true, true, true, false],
      starts: [true, false, true, false],
      ends: [true, true, false, false],
      notContains: [false, false, false, true],
      notStarts: [false, true, false, true],
      notEnds: [false, false, true, true],
    };
    [texto, 'prefixo\n' + texto, texto + '\nsufixo', 'outro'].forEach((valor, index) =>
      assert.equal(regex.test(valor), resultados[opcao.valor][index]),
    );
    if (opcao.valor === 'ends') assert.equal(regex.test(texto + '\n'), false);
    if (opcao.valor === 'notEnds') assert.equal(regex.test(texto + '\n'), true);
  });
}

test('padrões avançados importados continuam fora das comparações literais', () => {
  for (const padrao of ['^[A-Z]+$', '\\d{3}', '(foo|bar)', 'abc$'])
    assert.equal(lerPadraoDeTexto(padrao).operador, 'advanced');
});
