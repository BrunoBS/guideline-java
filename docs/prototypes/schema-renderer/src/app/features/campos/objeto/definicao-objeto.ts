import type { DefinicaoCampo } from '../compartilhado/definicao-campo';
export const DEFINICAO_OBJETO: DefinicaoCampo = {
  tipo: 'object',
  rotulo: 'Objeto',
  icone: '{}',
  criarSchema: (titulo) => ({ type: 'object', title: titulo, properties: {} }),
};
