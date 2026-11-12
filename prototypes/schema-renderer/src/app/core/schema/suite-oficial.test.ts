import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { validarValor } from './validacao-schema';
import { compilarValidador } from './schema-validator';
import { carregarRecursosOficiais } from '../../../../tests/recursos-oficiais';
const perfil = { formatos: 'anotacao' as const, recursos: carregarRecursosOficiais() };

const base = new URL('../../../../tests/vendor/json-schema/', import.meta.url);
const ler = (nome: string) => JSON.parse(readFileSync(new URL(nome, base), 'utf8'));
const exclusoes: { arquivo: string; grupo: string; teste: string; motivo: string }[] =
  ler('exclusoes.json');
const usadas = new Set<object>();
let totalCore = 0;
let totalOpcional = 0;
const arquivos = [
  ...readdirSync(new URL('draft2020-12/', base)).filter((nome) => nome.endsWith('.json')),
  'optional/format-assertion.json',
];
for (const arquivo of arquivos) {
  for (const grupo of ler('draft2020-12/' + arquivo)) {
    for (const caso of grupo.tests) {
      if (arquivo.startsWith('optional/')) totalOpcional++;
      else totalCore++;
      const exclusao = exclusoes.find(
        (e) =>
          e.arquivo === arquivo && e.grupo === grupo.description && e.teste === caso.description,
      );
      if (exclusao) usadas.add(exclusao);
      test(
        `oficial ${arquivo} / ${grupo.description} / ${caso.description}`,
        { skip: exclusao?.motivo },
        () => {
          compilarValidador(grupo.schema, perfil);
          assert.equal(validarValor(grupo.schema, caso.data, perfil).length === 0, caso.valid);
        },
      );
    }
  }
}
test('manifesto oficial tem versão fixa e exclusões únicas com casos existentes e motivo', () => {
  assert.match(ler('origem.json').commit, /^[a-f0-9]{40}$/);
  assert.equal(usadas.size, exclusoes.length);
  assert.equal(exclusoes.length, 0, 'A cobertura oficial não pode perder casos silenciosamente.');
  assert.equal(totalCore, 1302);
  assert.equal(totalOpcional, 4);
  assert.ok(exclusoes.every((e) => e.motivo.length > 30));
});
