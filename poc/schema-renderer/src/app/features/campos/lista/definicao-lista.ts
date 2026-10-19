import type { DefinicaoCampo } from '../compartilhado/definicao-campo';
export const DEFINICAO_LISTA: DefinicaoCampo = {
  tipo: 'array',
  rotulo: 'Lista',
  icone: '☷',
  criarSchema: (titulo) => ({ type: 'array', title: titulo, items: { type: 'string' } }),
};
