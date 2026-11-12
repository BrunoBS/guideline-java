import type { AnySchema } from 'ajv';

export interface PerfilValidacao {
  /** O padrão do produto é validar formatos; anotacao segue o perfil padrão 2020-12. */
  formatos?: 'validacao' | 'anotacao';
  /** Registro explícito, isolado e offline: URI absoluta -> documento JSON Schema. */
  recursos?: Record<string, AnySchema>;
}
