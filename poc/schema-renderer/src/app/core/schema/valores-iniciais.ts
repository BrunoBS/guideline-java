import {
  Schema,
  ehSchemaProibido,
  ehSchemaIrrestrito,
  possuiUniaoDeTipos,
  obterTiposNaoNulos,
  obterTipoPrincipal,
  permiteNulo,
} from './tipos-schema';
import { combinarSchemas } from './combinacao-schemas';
import { resolverSchemaDoCampo, restringirTipoDoSchema } from './resolucao-schema';
import { obterSchemaDoItem } from './estrutura-schema';

export function criarValorInicialDaComposicao(
  s: Schema,
  marker: '__oneOfOptions' | '__anyOfOptions',
  root: Schema,
  depth: number,
): any {
  const options = s[marker] as any[] | undefined;
  if (!options?.length) return undefined;
  const base = { ...s };
  delete base[marker];
  return criarValorInicial(combinarSchemas(base, options[0]), root, depth + 1);
}

export function criarValorInicial(schema: any, root: Schema, depth = 0): any {
  if (depth > 20) return null;
  if (schema === false || ehSchemaProibido(schema)) return undefined;
  if (schema === true || ehSchemaIrrestrito(schema)) return '';
  const s = resolverSchemaDoCampo(schema, undefined, root);
  if (s.default !== undefined) return structuredClone(s.default);
  if (s.const !== undefined) return structuredClone(s.const);
  if (s.enum?.length) return structuredClone(s.enum[0]);
  if (possuiUniaoDeTipos(s))
    return criarValorInicial(
      restringirTipoDoSchema(s, obterTiposNaoNulos(s)[0], root),
      root,
      depth + 1,
    );
  if (s.__oneOfOptions?.length)
    return criarValorInicialDaComposicao(s, '__oneOfOptions', root, depth);
  if (s.__anyOfOptions?.length)
    return criarValorInicialDaComposicao(s, '__anyOfOptions', root, depth);
  if (
    obterTipoPrincipal(s) === 'object' ||
    (obterTipoPrincipal(s) === 'null' && Object.keys(s.properties || {}).length > 0)
  ) {
    const obj: any = {};
    for (const [key, raw] of Object.entries(s.properties || {})) {
      const child = resolverSchemaDoCampo(raw as Schema, undefined, root),
        required = (s.required || []).includes(key);
      if (required || child.default !== undefined || child.const !== undefined)
        obj[key] = criarValorInicial(raw as Schema, root, depth + 1);
      else if (permiteNulo(child)) obj[key] = null;
    }
    return obj;
  }
  if (obterTipoPrincipal(s) === 'array')
    return Array.from({ length: s.minItems || 0 }, (_, index) =>
      criarValorInicial(obterSchemaDoItem(s, index, root), root, depth + 1),
    );
  if (obterTipoPrincipal(s) === 'boolean') return permiteNulo(s) ? null : false;
  if (obterTipoPrincipal(s) === 'integer' || obterTipoPrincipal(s) === 'number')
    return permiteNulo(s) ? null : 0;
  if (obterTipoPrincipal(s) === 'null') return null;
  return permiteNulo(s) ? null : '';
}
