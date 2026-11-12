import type { DefinicaoCampo } from '../compartilhado/definicao-campo';
export const DEFINICAO_INTEIRO: DefinicaoCampo = {
  tipo: 'integer',
  rotulo: 'Inteiro',
  icone: '#',
  criarSchema: (titulo) => ({ type: 'integer', title: titulo }),
};
export const DEFINICAO_DECIMAL: DefinicaoCampo = {
  tipo: 'number',
  rotulo: 'Decimal',
  icone: '½',
  criarSchema: (titulo) => ({ type: 'number', title: titulo }),
};
