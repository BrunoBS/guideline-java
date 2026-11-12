import type { Schema } from '../../../core/schema/schema-engine';
export type AlteracaoRegra = (schema: Schema) => void;
/** Contrato mínimo de edição: independente do componente do builder. */
export interface ContextoRegra {
  obterSchema(): Schema;
  obterCaminhoAtivo(): string;
  obterPaleta(): { type: string; label: string; icon: string }[];
  alterarSchema(editar: AlteracaoRegra): void;
  informarErro(mensagem: string): void;
}
