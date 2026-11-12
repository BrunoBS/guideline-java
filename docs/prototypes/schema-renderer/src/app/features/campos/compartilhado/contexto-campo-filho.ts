import type { Schema } from '../../../core/schema/schema-engine';
export interface ContextoCampoFilho {
  $implicit: {
    schema: Schema;
    value: any;
    name: string;
    required: boolean;
    path: string;
    suppressHeading: boolean;
    aoAlterarValor(valor: any): void;
  };
}
