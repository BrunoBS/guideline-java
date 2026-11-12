import type { DefinicaoCampo } from '../compartilhado/definicao-campo';
export const DEFINICAO_BOOLEANO: DefinicaoCampo = {
  tipo: 'boolean',
  rotulo: 'Sim / Não',
  icone: '☑',
  criarSchema: (titulo) => ({ type: 'boolean', title: titulo }),
};
