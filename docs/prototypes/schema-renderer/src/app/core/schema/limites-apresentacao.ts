import { indexarDocumento } from './documento-schema';
import type { Schema } from './tipos-schema';

export const LIMITE_PROFUNDIDADE_FORMULARIO = 20;

/** O editor JSON preserva o contrato quando não há representação guiada fiel. */
export function criarApresentacaoJson(schema: Schema, motivo: string): Schema {
  return {
    __booleanSchema: true,
    __jsonFallback: motivo,
    title: schema.title,
    description: schema.description,
    default: schema.default,
    examples: schema.examples,
    readOnly: schema.readOnly,
    writeOnly: schema.writeOnly,
  };
}

export function possuiReferenciaDinamica(schema: Schema): boolean {
  return indexarDocumento(schema).some((entrada) => typeof entrada.node.$dynamicRef === 'string');
}
