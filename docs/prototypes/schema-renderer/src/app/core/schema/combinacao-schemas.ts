import {
  Schema,
  obterTipos,
  ehSchemaProibido,
  ehSchemaIrrestrito,
  normalizarSchemaBooleano,
} from './tipos-schema';
import { valoresJsonIguais } from './json-value';

export function intersectarParDeTipos(a: string, b: string): string | undefined {
  if (a === b) return a;
  if ((a === 'number' && b === 'integer') || (a === 'integer' && b === 'number')) return 'integer';
  return undefined;
}

export function intersectarTipos(a: Schema, b: Schema): string | string[] | undefined {
  const left = obterTipos(a),
    right = obterTipos(b);
  if (!left.length) return b.type;
  if (!right.length) return a.type;
  const intersection = [
    ...new Set(
      left.flatMap((l) =>
        right.map((r) => intersectarParDeTipos(l, r)).filter((type): type is string => !!type),
      ),
    ),
  ];
  if (!intersection.length) return '__impossible__';
  return intersection.length === 1 ? intersection[0] : intersection;
}

export function intersectarValoresPermitidos(a: Schema, b: Schema): any[] | undefined {
  if (!Array.isArray(a.enum)) return b.enum;
  if (!Array.isArray(b.enum)) return a.enum;
  return a.enum.filter((value: any) =>
    b.enum.some((candidate: any) => valoresJsonIguais(candidate, value)),
  );
}

export function combinarSchemas(a: any, b: any): Schema {
  if (ehSchemaProibido(a) || ehSchemaProibido(b)) return { __booleanSchema: false };
  if (ehSchemaIrrestrito(a)) return normalizarSchemaBooleano(b);
  if (ehSchemaIrrestrito(b)) return normalizarSchemaBooleano(a);
  const aa = normalizarSchemaBooleano(a),
    bb = normalizarSchemaBooleano(b);
  if (aa.const !== undefined && bb.const !== undefined && !valoresJsonIguais(aa.const, bb.const))
    return { __booleanSchema: false };
  const mergedType = intersectarTipos(aa, bb);
  if (mergedType === '__impossible__') return { __booleanSchema: false };
  const mergedEnum = intersectarValoresPermitidos(aa, bb);
  if (mergedEnum && mergedEnum.length === 0) return { __booleanSchema: false };
  const out: Schema = { ...aa, ...bb };
  for (const key of [
    'minimum',
    'exclusiveMinimum',
    'minLength',
    'minItems',
    'minProperties',
    'minContains',
  ])
    if (aa[key] !== undefined && bb[key] !== undefined) out[key] = Math.max(aa[key], bb[key]);
  for (const key of [
    'maximum',
    'exclusiveMaximum',
    'maxLength',
    'maxItems',
    'maxProperties',
    'maxContains',
  ])
    if (aa[key] !== undefined && bb[key] !== undefined) out[key] = Math.min(aa[key], bb[key]);

  // Interseção de negações: not A e not B equivalem a not (A ou B).
  if (aa.not !== undefined && bb.not !== undefined) {
    out.not = valoresJsonIguais(aa.not, bb.not) ? aa.not : { anyOf: [aa.not, bb.not] };
  }
  if (mergedType !== undefined) out.type = mergedType;
  if (mergedEnum !== undefined) out.enum = mergedEnum;
  const props: Record<string, any> = { ...(aa.properties || {}) };
  for (const [key, value] of Object.entries(bb.properties || {}))
    props[key] = combinarSchemas(Object.hasOwn(props, key) ? props[key] : {}, value);
  if (Object.keys(props).length) out.properties = props;
  if (aa.required || bb.required)
    out.required = [...new Set([...(aa.required || []), ...(bb.required || [])])];
  if (aa.allOf || bb.allOf) out.allOf = [...(aa.allOf || []), ...(bb.allOf || [])];
  if (aa.patternProperties || bb.patternProperties)
    out.patternProperties = Object.fromEntries(
      [
        ...new Set([
          ...Object.keys(aa.patternProperties || {}),
          ...Object.keys(bb.patternProperties || {}),
        ]),
      ].map((key) => [
        key,
        combinarSchemas(aa.patternProperties?.[key] ?? {}, bb.patternProperties?.[key] ?? {}),
      ]),
    );
  return out;
}
