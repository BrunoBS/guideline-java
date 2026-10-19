import {
  Schema,
  obterTipoPrincipal,
  ehSchemaProibido,
  valorCompativelComSchema,
  ehSchemaIrrestrito,
  permiteNulo,
} from './tipos-schema';
import { resolverReferencia } from './referencias-schema';
import { escaparSegmentoJson } from './caminhos-json';
import { obterSchemaDoItem, obterSchemaDaPropriedade } from './estrutura-schema';
import { resolverSchemaDoCampo } from './resolucao-schema';
import { criarValorInicial } from './valores-iniciais';

export function coletarCaminhosDasPropriedades(
  schema: any,
  root: Schema,
  basePath: string,
  paths: Set<string>,
  depth = 0,
): void {
  if (depth > 30 || schema === true || schema === false) return;
  const s = resolverReferencia(schema, root);
  for (const [key, child] of Object.entries(s.properties || {})) {
    const path = `${basePath}/${escaparSegmentoJson(key)}`;
    paths.add(path);
    coletarCaminhosDasPropriedades(child, root, path, paths, depth + 1);
  }
  for (const part of s.allOf || [])
    coletarCaminhosDasPropriedades(part, root, basePath, paths, depth + 1);
  if (s.if !== undefined) {
    coletarCaminhosDasPropriedades(s.then ?? {}, root, basePath, paths, depth + 1);
    coletarCaminhosDasPropriedades(s.else ?? {}, root, basePath, paths, depth + 1);
  }
  for (const option of s.oneOf || [])
    coletarCaminhosDasPropriedades(option, root, basePath, paths, depth + 1);
  for (const option of s.anyOf || [])
    coletarCaminhosDasPropriedades(option, root, basePath, paths, depth + 1);
  for (const dependent of Object.values(s.dependentSchemas || {}))
    coletarCaminhosDasPropriedades(dependent, root, basePath, paths, depth + 1);
}

export function coletarCaminhosCondicionais(
  schema: any,
  root: Schema,
  basePath = '',
  paths = new Set<string>(),
  depth = 0,
): Set<string> {
  if (depth > 30 || schema === true || schema === false) return paths;
  const s = resolverReferencia(schema, root);
  for (const [key, child] of Object.entries(s.properties || {})) {
    coletarCaminhosCondicionais(
      child,
      root,
      `${basePath}/${escaparSegmentoJson(key)}`,
      paths,
      depth + 1,
    );
  }
  for (const part of s.allOf || [])
    coletarCaminhosCondicionais(part, root, basePath, paths, depth + 1);
  if (s.if !== undefined) {
    coletarCaminhosDasPropriedades(s.then ?? {}, root, basePath, paths, depth + 1);
    coletarCaminhosDasPropriedades(s.else ?? {}, root, basePath, paths, depth + 1);
  }
  for (const option of s.oneOf || [])
    coletarCaminhosDasPropriedades(option, root, basePath, paths, depth + 1);
  for (const option of s.anyOf || [])
    coletarCaminhosDasPropriedades(option, root, basePath, paths, depth + 1);
  for (const dependent of Object.values(s.dependentSchemas || {}))
    coletarCaminhosDasPropriedades(dependent, root, basePath, paths, depth + 1);
  return paths;
}

export function adaptarEstruturaDoValor(
  schema: Schema,
  value: any,
  root: Schema,
): { matched: boolean; value: any } {
  const kind = obterTipoPrincipal(schema);
  if (kind === 'array' && !Array.isArray(value)) {
    const itemSchema = obterSchemaDoItem(schema, 0, root);
    if (
      !ehSchemaProibido(itemSchema) &&
      valorCompativelComSchema(resolverSchemaDoCampo(itemSchema, value, root), value)
    )
      return { matched: true, value: [value] };
  }
  if (kind !== 'array' && Array.isArray(value) && value.length) {
    const first = value[0];
    if (valorCompativelComSchema(schema, first)) return { matched: true, value: first };
  }
  return { matched: false, value };
}

export function ajustarValorAoSchema(
  schema: any,
  value: any,
  root: Schema,
  depth = 0,
  managedPaths?: Set<string>,
  currentPath = '',
): any {
  if (depth > 30) return value;
  const branchPaths = managedPaths || coletarCaminhosCondicionais(schema, root);
  const s = resolverSchemaDoCampo(schema, value, root);
  if (value === undefined) return value;
  if (ehSchemaProibido(s)) return undefined;
  if (ehSchemaIrrestrito(s)) return value;
  if (!valorCompativelComSchema(s, value)) {
    const coerced = adaptarEstruturaDoValor(s, value, root);
    if (!coerced.matched) return criarValorInicial(s, root, depth + 1);
    value = coerced.value;
  }
  if (obterTipoPrincipal(s) === 'object' && value !== null) {
    const next: Record<string, any> = { ...value };
    const required = new Set<string>(s.required || []);
    for (const key of Object.keys(next)) {
      const path = `${currentPath}/${escaparSegmentoJson(key)}`;
      if (!Object.hasOwn(s.properties || {}, key) && branchPaths.has(path)) {
        delete next[key];
        continue;
      }
      const child = obterSchemaDaPropriedade(s, key, root);
      if (ehSchemaProibido(child)) {
        delete next[key];
        continue;
      }
      if (next[key] === undefined) {
        delete next[key];
        continue;
      }
      if (
        next[key] === null &&
        Object.hasOwn(s.properties || {}, key) &&
        !required.has(key) &&
        !permiteNulo(child)
      ) {
        delete next[key];
        continue;
      }
      next[key] = ajustarValorAoSchema(child, next[key], root, depth + 1, branchPaths, path);
    }
    return next;
  }
  if (obterTipoPrincipal(s) === 'array' && Array.isArray(value)) {
    const max = s.maxItems === undefined ? value.length : Math.min(value.length, s.maxItems);
    return value
      .slice(0, max)
      .map((item, index) =>
        ajustarValorAoSchema(
          obterSchemaDoItem(s, index, root),
          item,
          root,
          depth + 1,
          branchPaths,
          `${currentPath}/${index}`,
        ),
      );
  }
  return value;
}
