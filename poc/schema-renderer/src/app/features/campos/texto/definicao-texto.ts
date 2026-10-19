import type { DefinicaoCampo } from '../compartilhado/definicao-campo';
export const DEFINICAO_TEXTO: DefinicaoCampo = {
  tipo: 'string',
  rotulo: 'Texto',
  icone: 'T',
  criarSchema: (titulo) => ({ type: 'string', title: titulo }),
};
