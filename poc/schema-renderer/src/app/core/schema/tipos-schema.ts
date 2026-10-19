import { valoresJsonIguais } from './json-value';

export type Schema = Record<string, any>;

export type ValidationIssue = { path: string; message: string };

export const ehSchemaBooleano = (schema: any): boolean => schema === true || schema === false;

export const ehSchemaProibido = (schema: any): boolean =>
  schema === false || schema?.__booleanSchema === false;

export const ehSchemaIrrestrito = (schema: any): boolean =>
  schema === true || schema?.__booleanSchema === true;

export const normalizarSchemaBooleano = (schema: any): Schema =>
  schema === true
    ? { __booleanSchema: true }
    : schema === false
      ? { __booleanSchema: false }
      : schema || {};

export const obterTipos = (schema: any): string[] => {
  const s = normalizarSchemaBooleano(schema);
  return Array.isArray(s.type) ? s.type : typeof s.type === 'string' ? [s.type] : [];
};

export const obterTiposNaoNulos = (schema: any): string[] =>
  obterTipos(schema).filter((t) => t !== 'null');

export const obterTipoPrincipal = (schema: any): string => obterTiposNaoNulos(schema)[0] || 'null';

export const permiteNulo = (schema: any): boolean => obterTipos(schema).includes('null');

export const possuiUniaoDeTipos = (schema: any): boolean => obterTiposNaoNulos(schema).length > 1;

export const ehSchemaLivre = (schema: any): boolean => {
  const s = normalizarSchemaBooleano(schema);
  const unconstrainedObject =
    obterTipoPrincipal(s) === 'object' &&
    !s.properties &&
    !s.patternProperties &&
    s.additionalProperties === undefined &&
    s.unevaluatedProperties === undefined &&
    !s.propertyNames &&
    !s.required &&
    !s.dependentRequired &&
    !s.dependentSchemas &&
    !s.minProperties &&
    s.maxProperties === undefined;
  return (
    ehSchemaIrrestrito(s) ||
    unconstrainedObject ||
    (!ehSchemaProibido(s) &&
      Object.keys(s).filter(
        (k) => !['title', 'description', 'examples', 'default', '$comment'].includes(k),
      ).length === 0)
  );
};

export function obterTipoDoValor(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  if (typeof value === 'object') return 'object';
  return typeof value;
}

export function valorCompativelComSchema(schema: any, value: any): boolean {
  const s = normalizarSchemaBooleano(schema);
  if (ehSchemaProibido(s)) return false;
  if (ehSchemaIrrestrito(s)) return true;
  if (s.const !== undefined && !valoresJsonIguais(value, s.const)) return false;
  if (
    Array.isArray(s.enum) &&
    !s.enum.some((candidate: any) => valoresJsonIguais(candidate, value))
  )
    return false;
  const declared = obterTipos(s);
  if (!declared.length) return true;
  if (value === null) return declared.includes('null');
  const current = obterTipoDoValor(value);
  return declared.some((type) => type === current || (type === 'number' && current === 'integer'));
}
