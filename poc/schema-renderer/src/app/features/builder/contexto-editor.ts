import type { Schema } from '../../core/schema/schema-engine';

/** Acesso explícito à sessão; toda alteração passa pelo mesmo fluxo de commit/rascunho. */
export interface ContextoEditor {
  obterSchema(): Schema;
  obterCaminhoAtivo(): string;
  obterCaminhoSelecionado(): string;
  selecionarCaminho(caminho: string): void;
  obterPaleta(): { type: string; label: string; icon: string }[];
  alterarSchema(editar: (schema: Schema) => void): void;
  informarErro(mensagem: string): void;
}
