import { Schema } from './tipos-schema';
import { resolverReferencia } from './referencias-schema';
import { combinarSchemas } from './combinacao-schemas';

export function obterSchemaDoItem(schema: any, index: number, root: Schema): Schema {
  const s = resolverReferencia(schema, root);
  if (Array.isArray(s.prefixItems) && index < s.prefixItems.length)
    return resolverReferencia(s.prefixItems[index], root);
  if (s.items === false) return { __booleanSchema: false };
  if (s.items === undefined && s.unevaluatedItems !== undefined && s.contains === undefined)
    return resolverReferencia(s.unevaluatedItems, root);
  if (s.items === true || s.items === undefined) return { __booleanSchema: true };
  return resolverReferencia(s.items, root);
}

export function obterSchemaDaPropriedade(schema: any, key: string, root: Schema): Schema {
  const s = resolverReferencia(schema, root);
  const fixed = Object.hasOwn(s.properties || {}, key);
  const matchesPatterns = Object.entries(s.patternProperties || {})
    .filter(([pattern]) => {
      try {
        return new RegExp(pattern).test(key);
      } catch {
        return false;
      }
    })
    .map(([, rule]) => resolverReferencia(rule, root));
  let result: Schema = fixed ? resolverReferencia(s.properties[key], root) : {};
  for (const rule of matchesPatterns) result = combinarSchemas(result, rule);
  if (fixed || matchesPatterns.length) return result;
  if (s.additionalProperties === false) return { __booleanSchema: false };
  if (s.additionalProperties === true) return { __booleanSchema: true };
  if (s.additionalProperties && typeof s.additionalProperties === 'object')
    return resolverReferencia(s.additionalProperties, root);
  if (s.unevaluatedProperties === false) return { __booleanSchema: false };
  if (s.unevaluatedProperties === true) return { __booleanSchema: true };
  if (s.unevaluatedProperties && typeof s.unevaluatedProperties === 'object')
    return resolverReferencia(s.unevaluatedProperties, root);
  return { __booleanSchema: true };
}
