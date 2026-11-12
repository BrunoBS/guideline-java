import type { Schema } from '../../../core/schema/schema-engine';
export type TipoCampo = 'string' | 'integer' | 'number' | 'boolean' | 'object' | 'array';
export interface DefinicaoCampo {
  tipo: TipoCampo;
  rotulo: string;
  icone: string;
  criarSchema(titulo: string): Schema;
}
